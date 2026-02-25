import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, mapAgentRow, nowIso } from "../db";
import type { AgentRow, AgentStatus, AgentType } from "../types";

const AGENT_TYPES: AgentType[] = ["codex", "claude"];
const AGENT_STATUSES: AgentStatus[] = ["idle", "busy", "offline"];

function isAgentType(value: unknown): value is AgentType {
  return typeof value === "string" && AGENT_TYPES.includes(value as AgentType);
}

function isAgentStatus(value: unknown): value is AgentStatus {
  return typeof value === "string" && AGENT_STATUSES.includes(value as AgentStatus);
}

const router = Router();

router.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM agents ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC")
    .all() as AgentRow[];

  res.json(rows.map(mapAgentRow));
});

router.post("/", (req, res) => {
  const { name, type, status, current_task_id } = req.body as {
    name?: unknown;
    type?: unknown;
    status?: unknown;
    current_task_id?: unknown;
  };

  if (typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  if (!isAgentType(type)) {
    res.status(400).json({ error: "type must be codex or claude" });
    return;
  }

  if (status !== undefined && !isAgentStatus(status)) {
    res.status(400).json({ error: "status must be idle, busy, or offline" });
    return;
  }

  if (
    current_task_id !== undefined &&
    current_task_id !== null &&
    (typeof current_task_id !== "string" || current_task_id.trim().length === 0)
  ) {
    res.status(400).json({ error: "current_task_id must be null or string" });
    return;
  }

  const id = uuidv4();
  const now = nowIso();

  db.prepare(
    `
      INSERT INTO agents (
        id, name, type, status, current_task_id,
        total_tasks, success_count, fail_count, avg_duration_min,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
    `,
  ).run(id, name.trim(), type, status ?? "idle", current_task_id ?? null, now, now);

  const created = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow;
  res.status(201).json(mapAgentRow(created));
});

router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(req.params.id) as AgentRow | undefined;

  if (!row) {
    res.status(404).json({ error: "agent not found" });
    return;
  }

  res.json(mapAgentRow(row));
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

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    params.push(nowIso(), id);
    db.prepare(`UPDATE agents SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  }

  const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow;
  res.json(mapAgentRow(updated));
});

router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM agents WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    res.status(404).json({ error: "agent not found" });
    return;
  }

  res.status(204).send();
});

export default router;
