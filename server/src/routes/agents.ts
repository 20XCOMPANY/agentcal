/**
 * [INPUT]: 依赖 ../db 提供 agent 持久化，依赖 activity/ws 服务提供审计与实时更新。
 * [OUTPUT]: 对外提供 /api/agents CRUD，并支持 project_id 与 profile 扩展字段。
 * [POS]: server agent 资源路由，连接代理状态与多项目归属。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, DEFAULT_PROJECT_ID, mapAgentRow, nowIso } from "../db";
import { recordActivity } from "../services/activity";
import type { Agent, AgentRow, AgentStatus, AgentType } from "../types";
import { broadcast } from "../ws";

const AGENT_TYPES: AgentType[] = ["codex", "claude"];
const AGENT_STATUSES: AgentStatus[] = ["idle", "busy", "offline"];

function isAgentType(value: unknown): value is AgentType {
  return typeof value === "string" && AGENT_TYPES.includes(value as AgentType);
}

function isAgentStatus(value: unknown): value is AgentStatus {
  return typeof value === "string" && AGENT_STATUSES.includes(value as AgentStatus);
}

function parseSettings(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function withProfile(agent: AgentRow): Agent & {
  emoji?: string;
  avatar_url?: string;
  color?: string;
  settings?: Record<string, unknown>;
} {
  const base = mapAgentRow(agent);
  const profile = db
    .prepare("SELECT emoji, avatar_url, color, settings FROM agent_profiles WHERE agent_id = ?")
    .get(agent.id) as
    | {
        emoji: string;
        avatar_url: string;
        color: string;
        settings: string;
      }
    | undefined;

  if (!profile) {
    return base;
  }

  let settings: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(profile.settings);
    settings = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    settings = {};
  }

  return {
    ...base,
    emoji: profile.emoji,
    avatar_url: profile.avatar_url,
    color: profile.color,
    settings,
  };
}

const router = Router();

router.get("/", (req, res) => {
  const projectId =
    typeof req.query.project_id === "string" && req.query.project_id.trim().length > 0
      ? req.query.project_id.trim()
      : null;
  const rows = (projectId
    ? db
        .prepare(
          "SELECT * FROM agents WHERE project_id = ? ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC",
        )
        .all(projectId)
    : db
        .prepare("SELECT * FROM agents ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC")
        .all()) as AgentRow[];

  res.json(rows.map(withProfile));
});

router.post("/", (req, res) => {
  const body = req.body as {
    name?: unknown;
    type?: unknown;
    status?: unknown;
    current_task_id?: unknown;
    project_id?: unknown;
    emoji?: unknown;
    avatar_url?: unknown;
    color?: unknown;
    settings?: unknown;
  };

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  if (!isAgentType(body.type)) {
    res.status(400).json({ error: "type must be codex or claude" });
    return;
  }

  if (body.status !== undefined && !isAgentStatus(body.status)) {
    res.status(400).json({ error: "status must be idle, busy, or offline" });
    return;
  }

  if (
    body.current_task_id !== undefined &&
    body.current_task_id !== null &&
    (typeof body.current_task_id !== "string" || body.current_task_id.trim().length === 0)
  ) {
    res.status(400).json({ error: "current_task_id must be null or string" });
    return;
  }

  const id = uuidv4();
  const now = nowIso();
  const projectId =
    typeof body.project_id === "string" && body.project_id.trim().length > 0
      ? body.project_id.trim()
      : DEFAULT_PROJECT_ID;

  db.prepare(
    `
      INSERT INTO agents (
        id, project_id, name, type, status, current_task_id,
        total_tasks, success_count, fail_count, avg_duration_min,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
    `,
  ).run(id, projectId, body.name.trim(), body.type, body.status ?? "idle", body.current_task_id ?? null, now, now);

  db.prepare(
    `
      INSERT INTO agent_profiles (id, agent_id, emoji, avatar_url, color, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    uuidv4(),
    id,
    typeof body.emoji === "string" ? body.emoji : "🤖",
    typeof body.avatar_url === "string" ? body.avatar_url : "",
    typeof body.color === "string" ? body.color : "#3b82f6",
    JSON.stringify(parseSettings(body.settings)),
    now,
    now,
  );

  const created = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow;
  const payload = withProfile(created);
  recordActivity({
    projectId,
    agentId: id,
    action: "agent.registered",
    details: { agent_id: id, name: created.name },
  });
  broadcast("agent:status", { agent: payload });
  res.status(201).json(payload);
});

router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(req.params.id) as AgentRow | undefined;
  if (!row) {
    res.status(404).json({ error: "agent not found" });
    return;
  }

  res.json(withProfile(row));
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const existing = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow | undefined;

  if (!existing) {
    res.status(404).json({ error: "agent not found" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const updates: string[] = [];
  const params: unknown[] = [];

  if ("name" in body) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      res.status(400).json({ error: "name must be a non-empty string" });
      return;
    }
    updates.push("name = ?");
    params.push(body.name.trim());
  }

  if ("type" in body) {
    if (!isAgentType(body.type)) {
      res.status(400).json({ error: "type must be codex or claude" });
      return;
    }
    updates.push("type = ?");
    params.push(body.type);
  }

  if ("status" in body) {
    if (!isAgentStatus(body.status)) {
      res.status(400).json({ error: "status must be idle, busy, or offline" });
      return;
    }
    updates.push("status = ?");
    params.push(body.status);
  }

  if ("project_id" in body) {
    if (body.project_id !== null && (typeof body.project_id !== "string" || body.project_id.trim().length === 0)) {
      res.status(400).json({ error: "project_id must be null or non-empty string" });
      return;
    }
    updates.push("project_id = ?");
    params.push(body.project_id ? String(body.project_id).trim() : null);
  }

  if ("current_task_id" in body) {
    if (
      body.current_task_id !== null &&
      (typeof body.current_task_id !== "string" || body.current_task_id.trim().length === 0)
    ) {
      res.status(400).json({ error: "current_task_id must be null or string" });
      return;
    }
    updates.push("current_task_id = ?");
    params.push(body.current_task_id ?? null);
  }

  const now = nowIso();
  if (updates.length > 0) {
    updates.push("updated_at = ?");
    params.push(now, id);
    db.prepare(`UPDATE agents SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  }

  const profileFields = ["emoji", "avatar_url", "color", "settings"].some((field) => field in body);
  if (profileFields) {
    db.prepare(
      `
        INSERT INTO agent_profiles (id, agent_id, emoji, avatar_url, color, settings, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(agent_id) DO UPDATE SET
          emoji = COALESCE(?, agent_profiles.emoji),
          avatar_url = COALESCE(?, agent_profiles.avatar_url),
          color = COALESCE(?, agent_profiles.color),
          settings = COALESCE(?, agent_profiles.settings),
          updated_at = excluded.updated_at
      `,
    ).run(
      uuidv4(),
      id,
      typeof body.emoji === "string" ? body.emoji : "🤖",
      typeof body.avatar_url === "string" ? body.avatar_url : "",
      typeof body.color === "string" ? body.color : "#3b82f6",
      JSON.stringify(parseSettings(body.settings)),
      now,
      now,
      typeof body.emoji === "string" ? body.emoji : null,
      typeof body.avatar_url === "string" ? body.avatar_url : null,
      typeof body.color === "string" ? body.color : null,
      body.settings !== undefined ? JSON.stringify(parseSettings(body.settings)) : null,
    );
  }

  const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow;
  const payload = withProfile(updated);
  recordActivity({
    projectId: updated.project_id ?? DEFAULT_PROJECT_ID,
    agentId: id,
    action: "agent.updated",
    details: { agent_id: id },
  });
  broadcast("agent:status", { agent: payload });
  res.json(payload);
});

router.delete("/:id", (req, res) => {
  const row = db.prepare("SELECT id, project_id FROM agents WHERE id = ?").get(req.params.id) as
    | { id: string; project_id: string | null }
    | undefined;
  if (!row) {
    res.status(404).json({ error: "agent not found" });
    return;
  }

  db.prepare("DELETE FROM agents WHERE id = ?").run(req.params.id);
  recordActivity({
    projectId: row.project_id ?? DEFAULT_PROJECT_ID,
    agentId: row.id,
    action: "agent.deleted",
    details: { agent_id: row.id },
  });
  res.status(204).send();
});

export default router;
