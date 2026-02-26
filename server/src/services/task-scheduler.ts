/**
 * [INPUT]: 依赖 ../db 的任务与依赖关系数据、依赖 agent-swarm 的 spawn 能力与 activity/ws 事件广播。
 * [OUTPUT]: 对外提供任务队列调度服务：并发限制配置、队列状态查询、定时自动调度与手动触发。
 * [POS]: server 调度中枢，连接任务依赖图与 agent 执行入口，保证队列与并发策略一致落地。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { db, getTaskById, getTaskDependencies, getUnmetTaskDependencies, listTasksByQuery, mapAgentRow, nowIso } from "../db";
import { recordActivity } from "./activity";
import { spawnAgent } from "./agent-swarm";
import { broadcast } from "../ws";
import type {
  AgentRow,
  QueueStatus,
  SystemConfig,
  Task,
  TaskPriority,
  TaskRow,
} from "../types";

const CONFIG_KEY_MAX_CONCURRENT_AGENTS = "max_concurrent_agents";
const DEFAULT_MAX_CONCURRENT_AGENTS = Number.parseInt(
  process.env.AGENTCAL_MAX_CONCURRENT_AGENTS ?? "3",
  10,
);
const MAX_CONCURRENT_AGENTS_MIN = 1;
const MAX_CONCURRENT_AGENTS_MAX = 32;
const DEFAULT_SCHEDULER_INTERVAL_MS = 30_000;

let schedulerTimer: NodeJS.Timeout | null = null;
let schedulerInFlight = false;
const queuedStatusSnapshot = new Map<string, "queued" | "blocked">();

interface QueueCandidate {
  row: TaskRow;
  task: Task;
  blocked: boolean;
}

function clampMaxConcurrentAgents(value: number): number {
  if (!Number.isFinite(value)) {
    return 3;
  }

  const normalized = Math.trunc(value);
  if (normalized < MAX_CONCURRENT_AGENTS_MIN) {
    return MAX_CONCURRENT_AGENTS_MIN;
  }
  if (normalized > MAX_CONCURRENT_AGENTS_MAX) {
    return MAX_CONCURRENT_AGENTS_MAX;
  }
  return normalized;
}

function getConfiguredMaxConcurrentAgents(): number {
  const row = db
    .prepare("SELECT value FROM system_config WHERE key = ?")
    .get(CONFIG_KEY_MAX_CONCURRENT_AGENTS) as { value: string } | undefined;

  if (!row) {
    const fallback = clampMaxConcurrentAgents(DEFAULT_MAX_CONCURRENT_AGENTS);
    db.prepare(
      "INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, ?)",
    ).run(CONFIG_KEY_MAX_CONCURRENT_AGENTS, String(fallback), nowIso());
    return fallback;
  }

  const parsed = Number.parseInt(row.value, 10);
  return clampMaxConcurrentAgents(parsed);
}

function parseSpawnOutput(stdout: string): {
  tmuxSession: string | null;
  branch: string | null;
  worktreePath: string | null;
  logPath: string | null;
} {
  const lines = stdout.split(/\r?\n/);

  const pick = (regex: RegExp): string | null => {
    for (const line of lines) {
      const match = line.match(regex);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
    return null;
  };

  return {
    tmuxSession: pick(/(?:tmux\s*session|session)\s*[:=]\s*([\w.-]+)/i),
    branch: pick(/branch\s*[:=]\s*([^\s]+)/i),
    worktreePath: pick(/worktree(?:\s*path)?\s*[:=]\s*(.+)$/i),
    logPath: pick(/log(?:\s*path)?\s*[:=]\s*(.+)$/i),
  };
}

function priorityRank(priority: TaskPriority): number {
  if (priority === "urgent") {
    return 4;
  }
  if (priority === "high") {
    return 3;
  }
  if (priority === "medium") {
    return 2;
  }
  return 1;
}

function listQueuedRows(): TaskRow[] {
  return db
    .prepare(
      `
        SELECT *
        FROM tasks
        WHERE status = 'queued'
        ORDER BY
          CASE priority
            WHEN 'urgent' THEN 4
            WHEN 'high' THEN 3
            WHEN 'medium' THEN 2
            ELSE 1
          END DESC,
          datetime(COALESCE(scheduled_at, created_at)) ASC,
          datetime(created_at) ASC
      `,
    )
    .all() as TaskRow[];
}

function isScheduleReady(scheduledAt: string | null): boolean {
  if (!scheduledAt) {
    return true;
  }
  return Date.parse(scheduledAt) <= Date.now();
}

function listQueueCandidates(): QueueCandidate[] {
  const rows = listQueuedRows();
  const candidates: QueueCandidate[] = [];

  for (const row of rows) {
    const task = getTaskById(row.id);
    if (!task) {
      continue;
    }

    const blocked = task.blocked_by.length > 0;
    candidates.push({ row, task, blocked });
  }

  return candidates;
}

function broadcastAgentStatus(agentId: string | null): void {
  if (!agentId) {
    return;
  }
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as AgentRow | undefined;
  if (!row) {
    return;
  }
  broadcast("agent:status", { agent: mapAgentRow(row) });
}

function markAgentBusy(taskId: string, agentId: string | null): void {
  if (agentId) {
    const now = nowIso();
    db.prepare("UPDATE agents SET status = 'busy', current_task_id = ?, updated_at = ? WHERE id = ?").run(
      taskId,
      now,
      agentId,
    );
    broadcastAgentStatus(agentId);
  }
}

async function spawnQueuedTask(task: Task): Promise<boolean> {
  if (task.status !== "queued") {
    return false;
  }
  if (!isScheduleReady(task.scheduled_at)) {
    return false;
  }
  if (task.blocked_by.length > 0) {
    return false;
  }

  const description = task.description || task.title;

  try {
    const execution = await spawnAgent(description, task.agent_type);
    const parsed = parseSpawnOutput(execution.stdout);
    const now = nowIso();

    const transitioned = db.transaction(() => {
      const result = db.prepare(
        `
          UPDATE tasks
          SET
            status = 'running',
            tmux_session = COALESCE(?, tmux_session),
            branch = COALESCE(?, branch),
            worktree_path = COALESCE(?, worktree_path),
            log_path = COALESCE(?, log_path),
            started_at = COALESCE(started_at, ?),
            updated_at = ?
          WHERE id = ? AND status = 'queued'
        `,
      ).run(parsed.tmuxSession, parsed.branch, parsed.worktreePath, parsed.logPath, now, now, task.id);

      if (result.changes === 0) {
        return false;
      }

      db.prepare(
        "INSERT INTO task_events (task_id, event_type, old_value, new_value, timestamp) VALUES (?, ?, ?, ?, ?)",
      ).run(task.id, "spawned_by_scheduler", "queued", "running", now);
      return true;
    })();

    if (!transitioned) {
      return false;
    }

    markAgentBusy(task.id, task.agent_id);
    const updatedTask = getTaskById(task.id);
    if (!updatedTask) {
      return false;
    }

    broadcast("task:updated", { task: updatedTask, source: "scheduler" });
    recordActivity({
      projectId: updatedTask.project_id,
      agentId: updatedTask.agent_id,
      action: "task.started",
      details: {
        task_id: updatedTask.id,
        source: "scheduler",
        tmux_session: updatedTask.tmux_session,
      },
    });
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown scheduler spawn failure";
    const now = nowIso();
    db.prepare("INSERT INTO task_logs (task_id, timestamp, level, message) VALUES (?, ?, ?, ?)").run(
      task.id,
      now,
      "error",
      `scheduler spawn failed: ${reason}`,
    );
    db.prepare(
      "INSERT INTO task_events (task_id, event_type, old_value, new_value, timestamp) VALUES (?, ?, ?, ?, ?)",
    ).run(task.id, "scheduler_spawn_failed", "queued", reason, now);
    return false;
  }
}

function refreshQueuedStatusSnapshot(candidates: QueueCandidate[]): void {
  const nextSnapshot = new Map<string, "queued" | "blocked">();
  for (const candidate of candidates) {
    const status: "queued" | "blocked" = candidate.blocked ? "blocked" : "queued";
    nextSnapshot.set(candidate.task.id, status);
    const previous = queuedStatusSnapshot.get(candidate.task.id);
    if (previous && previous !== status) {
      const task = getTaskById(candidate.task.id);
      if (task) {
        broadcast("task:updated", { task, source: "scheduler" });
      }
    }
  }

  queuedStatusSnapshot.clear();
  for (const [taskId, status] of nextSnapshot.entries()) {
    queuedStatusSnapshot.set(taskId, status);
  }
}

async function runSchedulerTick(): Promise<void> {
  if (schedulerInFlight) {
    return;
  }

  schedulerInFlight = true;
  try {
    const config = getSystemConfig();
    const runningCount = db
      .prepare("SELECT COUNT(*) AS count FROM tasks WHERE status = 'running'")
      .get() as { count: number };

    const candidates = listQueueCandidates();
    refreshQueuedStatusSnapshot(candidates);

    let availableSlots = Math.max(0, config.max_concurrent_agents - runningCount.count);
    if (availableSlots === 0) {
      return;
    }

    const readyQueue = candidates
      .filter((candidate) => !candidate.blocked && isScheduleReady(candidate.task.scheduled_at))
      .sort((a, b) => {
        const priorityDelta = priorityRank(b.task.priority) - priorityRank(a.task.priority);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        const aTime = Date.parse(a.task.scheduled_at ?? a.task.created_at);
        const bTime = Date.parse(b.task.scheduled_at ?? b.task.created_at);
        return aTime - bTime;
      });

    for (const candidate of readyQueue) {
      if (availableSlots <= 0) {
        break;
      }
      const spawned = await spawnQueuedTask(candidate.task);
      if (spawned) {
        availableSlots -= 1;
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown scheduler error";
    console.error(`[agentcal] task scheduler failed: ${reason}`);
  } finally {
    schedulerInFlight = false;
  }
}

export function getSystemConfig(): SystemConfig {
  return {
    max_concurrent_agents: getConfiguredMaxConcurrentAgents(),
  };
}

export function updateSystemConfig(input: Partial<SystemConfig>): SystemConfig {
  if (input.max_concurrent_agents === undefined) {
    return getSystemConfig();
  }

  if (
    typeof input.max_concurrent_agents !== "number" ||
    !Number.isFinite(input.max_concurrent_agents)
  ) {
    throw new Error("max_concurrent_agents must be a finite number");
  }

  const normalized = clampMaxConcurrentAgents(input.max_concurrent_agents);
  db.prepare(
    `
      INSERT INTO system_config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
  ).run(CONFIG_KEY_MAX_CONCURRENT_AGENTS, String(normalized), nowIso());

  void triggerTaskScheduler();
  return getSystemConfig();
}

export function getQueueStatus(): QueueStatus {
  const config = getSystemConfig();
  const runningTasks = listTasksByQuery(
    "SELECT * FROM tasks WHERE status = 'running' ORDER BY datetime(COALESCE(started_at, created_at)) ASC",
  );
  const candidates = listQueueCandidates();

  let queuePosition = 1;
  const queuedTasks: QueueStatus["queued_tasks"] = [];
  const blockedTasks: QueueStatus["blocked_tasks"] = [];

  for (const candidate of candidates) {
    if (candidate.blocked) {
      blockedTasks.push({ task: candidate.task, queue_position: null });
      continue;
    }
    queuedTasks.push({ task: candidate.task, queue_position: queuePosition });
    queuePosition += 1;
  }

  return {
    generated_at: nowIso(),
    max_concurrent_agents: config.max_concurrent_agents,
    running_count: runningTasks.length,
    available_slots: Math.max(0, config.max_concurrent_agents - runningTasks.length),
    running_tasks: runningTasks,
    queued_tasks: queuedTasks,
    blocked_tasks: blockedTasks,
  };
}

export function taskHasUnmetDependencies(taskId: string): boolean {
  return getUnmetTaskDependencies(taskId).length > 0;
}

export function taskDependencyIds(taskId: string): string[] {
  return getTaskDependencies(taskId);
}

export function canTaskStart(taskId: string): {
  ok: boolean;
  blocked_by: string[];
  reason?: string;
} {
  const task = getTaskById(taskId);
  if (!task) {
    return { ok: false, blocked_by: [], reason: "task not found" };
  }
  if (task.blocked_by.length > 0) {
    return { ok: false, blocked_by: task.blocked_by, reason: "dependencies not completed" };
  }
  if (task.status !== "queued") {
    return { ok: false, blocked_by: task.blocked_by, reason: `task status is ${task.status}` };
  }
  if (!isScheduleReady(task.scheduled_at)) {
    return { ok: false, blocked_by: task.blocked_by, reason: "scheduled_at is in the future" };
  }

  const status = getQueueStatus();
  if (status.available_slots <= 0) {
    return { ok: false, blocked_by: [], reason: "concurrency limit reached" };
  }
  return { ok: true, blocked_by: [] };
}

export function startTaskScheduler(intervalMs = DEFAULT_SCHEDULER_INTERVAL_MS): void {
  if (schedulerTimer) {
    return;
  }
  void runSchedulerTick();
  schedulerTimer = setInterval(() => {
    void runSchedulerTick();
  }, intervalMs);
}

export function stopTaskScheduler(): void {
  if (!schedulerTimer) {
    return;
  }
  clearInterval(schedulerTimer);
  schedulerTimer = null;
}

export async function triggerTaskScheduler(): Promise<void> {
  await runSchedulerTick();
}

export function listTaskDependencies(taskId: string): string[] {
  return taskDependencyIds(taskId);
}
