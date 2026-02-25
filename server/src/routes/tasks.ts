import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  db,
  getTaskById,
  getTaskRowById,
  listTasksByQuery,
  mapAgentRow,
  normalizeIso,
  nowIso,
} from "../db";
import { killAgent, redirectAgent, spawnAgent } from "../services/agent-swarm";
import type {
  AgentRow,
  CIStatus,
  ReviewStatus,
  TaskPriority,
  TaskReviews,
  TaskStatus,
} from "../types";
import { broadcast } from "../ws";

const TASK_STATUSES: TaskStatus[] = [
  "queued",
  "running",
  "pr_open",
  "completed",
  "failed",
  "archived",
];
const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const CI_STATUSES: Exclude<CIStatus, null>[] = ["pending", "passing", "failing"];
const REVIEW_STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && TASK_STATUSES.includes(value as TaskStatus);
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && TASK_PRIORITIES.includes(value as TaskPriority);
}

function isCiStatus(value: unknown): value is Exclude<CIStatus, null> {
  return typeof value === "string" && CI_STATUSES.includes(value as Exclude<CIStatus, null>);
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && REVIEW_STATUSES.includes(value as ReviewStatus);
}

function isAgentType(value: unknown): value is "codex" | "claude" {
  return value === "codex" || value === "claude";
}

function parseIsoField(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("must be ISO8601 string or null");
  }

  const iso = normalizeIso(value);
  if (!iso) {
    throw new Error("invalid ISO8601 timestamp");
  }
  return iso;
}

function parseNonNegativeInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return Math.trunc(value);
}

function parseNullableInt(value: unknown, field: string): number | null {
  if (value === null) {
    return null;
  }
  return parseNonNegativeInt(value, field);
}

function parseDependsOn(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("depends_on must be an array");
  }

  const deduped = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error("depends_on must only contain non-empty strings");
    }
    deduped.add(item.trim());
  }

  return [...deduped];
}

function parseReviews(value: unknown): TaskReviews {
  if (!value || typeof value !== "object") {
    throw new Error("reviews must be an object");
  }

  const reviews = value as Record<string, unknown>;
  const codex = reviews.codex;
  const gemini = reviews.gemini;
  const claude = reviews.claude;

  if (!isReviewStatus(codex) || !isReviewStatus(gemini) || !isReviewStatus(claude)) {
    throw new Error("reviews entries must be pending/approved/rejected");
  }

  return {
    codex,
    gemini,
    claude,
  };
}

function deriveDurationMinutes(startedAt: string | null, completedAt: string | null): number | null {
  if (!startedAt || !completedAt) {
    return null;
  }

  const start = Date.parse(startedAt);
  const end = Date.parse(completedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }

  return Math.round((end - start) / 60000);
}

function taskEvent(taskId: string, type: string, oldValue: string | null, newValue: string | null): void {
  db.prepare(
    "INSERT INTO task_events (task_id, event_type, old_value, new_value, timestamp) VALUES (?, ?, ?, ?, ?)",
  ).run(taskId, type, oldValue, newValue, nowIso());
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

function updateAgentForTransition(
  taskId: string,
  oldStatus: TaskStatus,
  nextStatus: TaskStatus,
  agentId: string | null,
  actualDurationMin: number | null,
): void {
  if (!agentId) {
    return;
  }

  const now = nowIso();

  if (nextStatus === "running") {
    db.prepare(
      "UPDATE agents SET status = 'busy', current_task_id = ?, updated_at = ? WHERE id = ?",
    ).run(taskId, now, agentId);
    broadcastAgentStatus(agentId);
    return;
  }

  if (
    (nextStatus === "completed" || nextStatus === "failed") &&
    oldStatus !== "completed" &&
    oldStatus !== "failed"
  ) {
    const successInc = nextStatus === "completed" ? 1 : 0;
    const failInc = nextStatus === "failed" ? 1 : 0;

    db.prepare(
      `
        UPDATE agents
        SET
          total_tasks = total_tasks + 1,
          success_count = success_count + ?,
          fail_count = fail_count + ?,
          avg_duration_min = CASE
            WHEN ? IS NULL THEN avg_duration_min
            WHEN total_tasks = 0 THEN ?
            ELSE ROUND(((avg_duration_min * total_tasks) + ?) / (total_tasks + 1), 2)
          END,
          status = 'idle',
          current_task_id = NULL,
          updated_at = ?
        WHERE id = ?
      `,
    ).run(successInc, failInc, actualDurationMin, actualDurationMin, actualDurationMin, now, agentId);
    broadcastAgentStatus(agentId);
    return;
  }

  if (oldStatus === "running") {
    db.prepare(
      "UPDATE agents SET status = 'idle', current_task_id = NULL, updated_at = ? WHERE id = ?",
    ).run(now, agentId);
    broadcastAgentStatus(agentId);
  }
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

const router = Router();

router.get("/", (req, res) => {
  const { status, date } = req.query;
  const where: string[] = [];
  const params: unknown[] = [];

  if (status !== undefined) {
    if (typeof status !== "string" || !isTaskStatus(status)) {
      res.status(400).json({ error: "status must be a valid task status" });
      return;
    }
    where.push("status = ?");
    params.push(status);
  }

  if (date !== undefined) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "date must be YYYY-MM-DD" });
      return;
    }
    where.push("date(COALESCE(scheduled_at, started_at, created_at)) = date(?)");
    params.push(date);
  }

  const sql = `
    SELECT *
    FROM tasks
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY datetime(COALESCE(scheduled_at, started_at, created_at)) DESC
  `;

  res.json(listTasksByQuery(sql, params));
});

router.post("/", (req, res) => {
  const body = req.body as Record<string, unknown>;

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  if (body.agent_type !== undefined && !isAgentType(body.agent_type)) {
    res.status(400).json({ error: "agent_type must be codex or claude" });
    return;
  }

  if (body.status !== undefined && !isTaskStatus(body.status)) {
    res.status(400).json({ error: "status is invalid" });
    return;
  }

  if (body.priority !== undefined && !isTaskPriority(body.priority)) {
    res.status(400).json({ error: "priority is invalid" });
    return;
  }

  let dependsOn: string[] = [];
  if (body.depends_on !== undefined) {
    try {
      dependsOn = parseDependsOn(body.depends_on);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "invalid depends_on" });
      return;
    }
  }

  let scheduledAt: string | null = null;
  if (body.scheduled_at !== undefined) {
    try {
      scheduledAt = parseIsoField(body.scheduled_at);
    } catch (error) {
      res.status(400).json({ error: `scheduled_at ${String(error)}` });
      return;
    }
  }

  const estimatedDuration =
    body.estimated_duration_min === undefined
      ? 30
      : (() => {
          try {
            return parseNonNegativeInt(body.estimated_duration_min, "estimated_duration_min");
          } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : "invalid estimate" });
            return null;
          }
        })();

  if (estimatedDuration === null) {
    return;
  }

  const maxRetries =
    body.max_retries === undefined
      ? 3
      : (() => {
          try {
            return parseNonNegativeInt(body.max_retries, "max_retries");
          } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : "invalid max_retries" });
            return null;
          }
        })();

  if (maxRetries === null) {
    return;
  }

  const reviews =
    body.reviews === undefined
      ? { codex: "pending", gemini: "pending", claude: "pending" }
      : (() => {
          try {
            return parseReviews(body.reviews);
          } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : "invalid reviews" });
            return null;
          }
        })();

  if (!reviews) {
    return;
  }

  const id = uuidv4();
  const now = nowIso();
  const description = typeof body.description === "string" ? body.description : "";

  const tx = db.transaction(() => {
    db.prepare(
      `
        INSERT INTO tasks (
          id, title, description, status, priority, agent_type, agent_id,
          review_codex, review_gemini, review_claude,
          retry_count, max_retries, scheduled_at,
          estimated_duration_min,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
      `,
    ).run(
      id,
      body.title,
      description,
      body.status ?? "queued",
      body.priority ?? "medium",
      body.agent_type ?? "codex",
      body.agent_id ?? null,
      reviews.codex,
      reviews.gemini,
      reviews.claude,
      maxRetries,
      scheduledAt,
      estimatedDuration,
      now,
      now,
    );

    const depStmt = db.prepare(
      "INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)",
    );

    for (const dependsOnId of dependsOn) {
      depStmt.run(id, dependsOnId);
    }

    taskEvent(id, "created", null, String(body.status ?? "queued"));
  });

  tx();

  const task = getTaskById(id);
  if (!task) {
    res.status(500).json({ error: "task creation failed" });
    return;
  }

  broadcast("task:created", { task });
  res.status(201).json(task);
});

router.get("/:id", (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    res.status(404).json({ error: "task not found" });
    return;
  }

  res.json(task);
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const existing = getTaskRowById(id);

  if (!existing) {
    res.status(404).json({ error: "task not found" });
    return;
  }

  const body = req.body as Record<string, unknown>;

  const updates: string[] = [];
  const params: unknown[] = [];
  const updatedColumns = new Set<string>();

  const setUpdate = (column: string, value: unknown): void => {
    if (updatedColumns.has(column)) {
      return;
    }
    updatedColumns.add(column);
    updates.push(`${column} = ?`);
    params.push(value);
  };

  let nextStatus: TaskStatus = existing.status;
  let nextAgentId: string | null = existing.agent_id;
  let nextStartedAt: string | null = normalizeIso(existing.started_at);
  let nextCompletedAt: string | null = normalizeIso(existing.completed_at);
  let nextActualDuration: number | null = existing.actual_duration_min;
  let nextDependsOn: string[] | null = null;

  try {
    if ("title" in body) {
      if (typeof body.title !== "string" || body.title.trim().length === 0) {
        throw new Error("title must be non-empty string");
      }
      setUpdate("title", body.title.trim());
    }

    if ("description" in body) {
      if (typeof body.description !== "string") {
        throw new Error("description must be string");
      }
      setUpdate("description", body.description);
    }

    if ("status" in body) {
      if (!isTaskStatus(body.status)) {
        throw new Error("status is invalid");
      }
      nextStatus = body.status;
      setUpdate("status", nextStatus);
    }

    if ("priority" in body) {
      if (!isTaskPriority(body.priority)) {
        throw new Error("priority is invalid");
      }
      setUpdate("priority", body.priority);
    }

    if ("agent_type" in body) {
      if (!isAgentType(body.agent_type)) {
        throw new Error("agent_type must be codex or claude");
      }
      setUpdate("agent_type", body.agent_type);
    }

    if ("agent_id" in body) {
      if (
        body.agent_id !== null &&
        (typeof body.agent_id !== "string" || body.agent_id.trim().length === 0)
      ) {
        throw new Error("agent_id must be null or string");
      }
      nextAgentId = body.agent_id ? String(body.agent_id) : null;
      setUpdate("agent_id", nextAgentId);
    }

    if ("branch" in body) {
      if (body.branch !== null && typeof body.branch !== "string") {
        throw new Error("branch must be null or string");
      }
      setUpdate("branch", body.branch ?? null);
    }

    if ("pr_url" in body) {
      if (body.pr_url !== null && typeof body.pr_url !== "string") {
        throw new Error("pr_url must be null or string");
      }
      setUpdate("pr_url", body.pr_url ?? null);
    }

    if ("pr_number" in body) {
      setUpdate("pr_number", parseNullableInt(body.pr_number, "pr_number"));
    }

    if ("ci_status" in body) {
      if (body.ci_status !== null && !isCiStatus(body.ci_status)) {
        throw new Error("ci_status must be pending/passing/failing/null");
      }
      setUpdate("ci_status", body.ci_status ?? null);
    }

    if ("reviews" in body) {
      const reviews = parseReviews(body.reviews);
      setUpdate("review_codex", reviews.codex);
      setUpdate("review_gemini", reviews.gemini);
      setUpdate("review_claude", reviews.claude);
    }

    if ("retry_count" in body) {
      setUpdate("retry_count", parseNonNegativeInt(body.retry_count, "retry_count"));
    }

    if ("max_retries" in body) {
      setUpdate("max_retries", parseNonNegativeInt(body.max_retries, "max_retries"));
    }

    if ("scheduled_at" in body) {
      setUpdate("scheduled_at", parseIsoField(body.scheduled_at));
    }

    if ("started_at" in body) {
      nextStartedAt = parseIsoField(body.started_at);
      setUpdate("started_at", nextStartedAt);
    }

    if ("completed_at" in body) {
      nextCompletedAt = parseIsoField(body.completed_at);
      setUpdate("completed_at", nextCompletedAt);
    }

    if ("estimated_duration_min" in body) {
      setUpdate(
        "estimated_duration_min",
        parseNonNegativeInt(body.estimated_duration_min, "estimated_duration_min"),
      );
    }

    if ("actual_duration_min" in body) {
      nextActualDuration = parseNullableInt(body.actual_duration_min, "actual_duration_min");
      setUpdate("actual_duration_min", nextActualDuration);
    }

    if ("tmux_session" in body) {
      if (body.tmux_session !== null && typeof body.tmux_session !== "string") {
        throw new Error("tmux_session must be null or string");
      }
      setUpdate("tmux_session", body.tmux_session ?? null);
    }

    if ("worktree_path" in body) {
      if (body.worktree_path !== null && typeof body.worktree_path !== "string") {
        throw new Error("worktree_path must be null or string");
      }
      setUpdate("worktree_path", body.worktree_path ?? null);
    }

    if ("log_path" in body) {
      if (body.log_path !== null && typeof body.log_path !== "string") {
        throw new Error("log_path must be null or string");
      }
      setUpdate("log_path", body.log_path ?? null);
    }

    if ("depends_on" in body) {
      nextDependsOn = parseDependsOn(body.depends_on);
    }
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "invalid payload" });
    return;
  }

  const now = nowIso();

  if (nextStatus === "running" && !nextStartedAt) {
    nextStartedAt = now;
    setUpdate("started_at", nextStartedAt);
  }

  if ((nextStatus === "completed" || nextStatus === "failed") && !nextCompletedAt) {
    nextCompletedAt = now;
    setUpdate("completed_at", nextCompletedAt);
  }

  if ((nextStatus === "completed" || nextStatus === "failed") && !updatedColumns.has("actual_duration_min")) {
    nextActualDuration = deriveDurationMinutes(nextStartedAt, nextCompletedAt);
    if (nextActualDuration !== null) {
      setUpdate("actual_duration_min", nextActualDuration);
    }
  }

  const tx = db.transaction(() => {
    if (updates.length > 0) {
      setUpdate("updated_at", now);
      db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params, id);
    }

    if (nextDependsOn) {
      db.prepare("DELETE FROM task_dependencies WHERE task_id = ?").run(id);
      const depStmt = db.prepare(
        "INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)",
      );
      for (const dep of nextDependsOn) {
        depStmt.run(id, dep);
      }
    }

    if (existing.status !== nextStatus) {
      taskEvent(id, "status_changed", existing.status, nextStatus);
    }

    updateAgentForTransition(id, existing.status, nextStatus, nextAgentId, nextActualDuration);
  });

  tx();

  const updatedTask = getTaskById(id);
  if (!updatedTask) {
    res.status(500).json({ error: "task update failed" });
    return;
  }

  if (updatedTask.status === "completed") {
    broadcast("task:completed", { task: updatedTask });
  } else if (updatedTask.status === "failed") {
    broadcast("task:failed", { task: updatedTask });
  } else {
    broadcast("task:updated", { task: updatedTask });
  }

  res.json(updatedTask);
});

router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const existing = getTaskRowById(id);
  if (!existing) {
    res.status(404).json({ error: "task not found" });
    return;
  }

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM task_dependencies WHERE task_id = ? OR depends_on_task_id = ?").run(id, id);
    db.prepare("DELETE FROM task_logs WHERE task_id = ?").run(id);
    db.prepare("DELETE FROM task_events WHERE task_id = ?").run(id);
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

    updateAgentForTransition(id, existing.status, "archived", existing.agent_id, existing.actual_duration_min);
  });

  tx();

  res.status(204).send();
});

router.post("/:id/spawn", async (req, res, next) => {
  try {
    const id = req.params.id;
    const existing = getTaskRowById(id);
    if (!existing) {
      res.status(404).json({ error: "task not found" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    let agentId: string | null = existing.agent_id;

    if ("agent_id" in body) {
      if (body.agent_id !== null && typeof body.agent_id !== "string") {
        res.status(400).json({ error: "agent_id must be null or string" });
        return;
      }
      agentId = body.agent_id ? String(body.agent_id) : null;
    }

    const description = existing.description || existing.title;
    const execution = await spawnAgent(description, existing.agent_type);
    const parsed = parseSpawnOutput(execution.stdout);
    const now = nowIso();

    db.prepare(
      `
        UPDATE tasks
        SET
          status = 'running',
          agent_id = ?,
          tmux_session = COALESCE(?, tmux_session),
          branch = COALESCE(?, branch),
          worktree_path = COALESCE(?, worktree_path),
          log_path = COALESCE(?, log_path),
          started_at = COALESCE(started_at, ?),
          updated_at = ?
        WHERE id = ?
      `,
    ).run(agentId, parsed.tmuxSession, parsed.branch, parsed.worktreePath, parsed.logPath, now, now, id);

    taskEvent(id, "spawned", existing.status, "running");
    updateAgentForTransition(id, existing.status, "running", agentId, existing.actual_duration_min);

    const updatedTask = getTaskById(id);
    if (!updatedTask) {
      res.status(500).json({ error: "failed to reload task" });
      return;
    }

    broadcast("task:updated", { task: updatedTask });
    res.json({ task: updatedTask, execution });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/redirect", async (req, res, next) => {
  try {
    const id = req.params.id;
    const task = getTaskById(id);
    if (!task) {
      res.status(404).json({ error: "task not found" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    if (typeof body.message !== "string" || body.message.trim().length === 0) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const tmuxSession =
      typeof body.tmux_session === "string" && body.tmux_session.trim().length > 0
        ? body.tmux_session.trim()
        : task.tmux_session;

    if (!tmuxSession) {
      res.status(400).json({ error: "tmux_session is required for redirect" });
      return;
    }

    const execution = await redirectAgent(tmuxSession, body.message.trim());

    const now = nowIso();
    db.prepare("INSERT INTO task_logs (task_id, timestamp, level, message) VALUES (?, ?, ?, ?)").run(
      id,
      now,
      "info",
      `redirect: ${body.message.trim()}`,
    );

    taskEvent(id, "redirected", null, body.message.trim());
    broadcast("log:append", { task_id: id, line: body.message.trim() });

    res.json({ ok: true, execution });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/kill", async (req, res, next) => {
  try {
    const id = req.params.id;
    const existing = getTaskRowById(id);
    if (!existing) {
      res.status(404).json({ error: "task not found" });
      return;
    }

    const tmuxSession = existing.tmux_session;
    if (!tmuxSession) {
      res.status(400).json({ error: "tmux_session is missing for this task" });
      return;
    }

    const execution = await killAgent(tmuxSession);
    const now = nowIso();

    const startedAt = normalizeIso(existing.started_at);
    const completedAt = now;
    const duration = deriveDurationMinutes(startedAt, completedAt);

    db.prepare(
      `
        UPDATE tasks
        SET
          status = 'failed',
          completed_at = ?,
          actual_duration_min = COALESCE(actual_duration_min, ?),
          updated_at = ?
        WHERE id = ?
      `,
    ).run(completedAt, duration, now, id);

    taskEvent(id, "killed", existing.status, "failed");
    updateAgentForTransition(id, existing.status, "failed", existing.agent_id, duration);

    const task = getTaskById(id);
    if (!task) {
      res.status(500).json({ error: "failed to reload task" });
      return;
    }

    broadcast("task:failed", { task, error: "Task killed manually" });
    res.json({ task, execution });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/retry", (req, res) => {
  const id = req.params.id;
  const existing = getTaskRowById(id);

  if (!existing) {
    res.status(404).json({ error: "task not found" });
    return;
  }

  if (existing.retry_count >= existing.max_retries) {
    res.status(400).json({
      error: `max retries reached (${existing.retry_count}/${existing.max_retries})`,
    });
    return;
  }

  const now = nowIso();

  db.prepare(
    `
      UPDATE tasks
      SET
        status = 'queued',
        retry_count = retry_count + 1,
        started_at = NULL,
        completed_at = NULL,
        actual_duration_min = NULL,
        updated_at = ?
      WHERE id = ?
    `,
  ).run(now, id);

  taskEvent(id, "retried", existing.status, "queued");
  updateAgentForTransition(id, existing.status, "queued", existing.agent_id, existing.actual_duration_min);

  const task = getTaskById(id);
  if (!task) {
    res.status(500).json({ error: "failed to reload task" });
    return;
  }

  broadcast("task:updated", { task });
  res.json(task);
});

export default router;
