/**
 * [INPUT]: 依赖 ../db 的 SQLite 访问，依赖 ../services/auth 与 ../services/activity 处理 token 与活动流。
 * [OUTPUT]: 对外提供 /api/projects 及其子资源路由（agents/activities/keys/webhooks）。
 * [POS]: server 项目工作区聚合路由，承担多项目管理主入口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, DEFAULT_PROJECT_ID, mapAgentRow, nowIso } from "../db";
import { recordActivity, listActivities } from "../services/activity";
import { createApiKey, redactApiKey } from "../services/auth";
import type { AgentRow, Project, Webhook } from "../types";

interface WebhookRow {
  id: string;
  project_id: string;
  url: string;
  events: string;
  active: number;
  created_at: string;
  updated_at: string;
}

function parseWebhookEvents(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseSettings(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function mapWebhookRow(row: WebhookRow): Webhook {
  return {
    id: row.id,
    project_id: row.project_id,
    url: row.url,
    events: parseWebhookEvents(row.events),
    active: Boolean(row.active),
    created_at: row.created_at,
  };
}

function getProjectById(projectId: string): Project | null {
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as Project | undefined;
  return row ?? null;
}

function ensureProjectExists(projectId: string): Project {
  const project = getProjectById(projectId);
  if (project) {
    return project;
  }

  const now = nowIso();
  const fallback: Project = {
    id: projectId,
    name: projectId === DEFAULT_PROJECT_ID ? "Default Workspace" : `Project ${projectId.slice(0, 8)}`,
    description: "",
    created_at: now,
    updated_at: now,
  };

  db.prepare(
    "INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(fallback.id, fallback.name, fallback.description, fallback.created_at, fallback.updated_at);
  return fallback;
}

const router = Router();

router.get("/", (_req, res) => {
  const projects = db
    .prepare("SELECT * FROM projects ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC")
    .all() as Project[];
  res.json(projects);
});

router.post("/", (req, res) => {
  const body = req.body as { name?: unknown; description?: unknown };
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const id = uuidv4();
  const now = nowIso();
  const project: Project = {
    id,
    name: body.name.trim(),
    description: typeof body.description === "string" ? body.description : "",
    created_at: now,
    updated_at: now,
  };

  db.prepare(
    `
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `,
  ).run(project.id, project.name, project.description, project.created_at, project.updated_at);

  recordActivity({
    projectId: project.id,
    action: "project.created",
    details: { project_id: project.id, name: project.name },
  });

  res.status(201).json(project);
});

router.get("/:id", (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) {
    res.status(404).json({ error: "project not found" });
    return;
  }
  res.json(project);
});

function updateProjectHandler(req: Request, res: Response): void {
  const id = String(req.params.id);
  const existing = getProjectById(id);
  if (!existing) {
    res.status(404).json({ error: "project not found" });
    return;
  }

  const body = req.body as { name?: unknown; description?: unknown };
  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      res.status(400).json({ error: "name must be non-empty string" });
      return;
    }
    updates.push("name = ?");
    params.push(body.name.trim());
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      res.status(400).json({ error: "description must be string" });
      return;
    }
    updates.push("description = ?");
    params.push(body.description);
  }

  if (updates.length === 0) {
    res.json(existing);
    return;
  }

  const now = nowIso();
  updates.push("updated_at = ?");
  params.push(now, id);
  db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updated = getProjectById(id);
  if (!updated) {
    res.status(500).json({ error: "failed to reload project" });
    return;
  }

  recordActivity({
    projectId: id,
    action: "project.updated",
    details: { project_id: id },
  });

  res.json(updated);
}

router.patch("/:id", updateProjectHandler);
router.put("/:id", updateProjectHandler);

router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const info = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  if (info.changes === 0) {
    res.status(404).json({ error: "project not found" });
    return;
  }
  res.status(204).send();
});

// Primary route required by refactor task.
router.get("/:id/agents", (req, res) => {
  const projectId = req.params.id;
  ensureProjectExists(projectId);

  const rows = db
    .prepare(
      `
        SELECT a.*, ap.emoji, ap.avatar_url, ap.color, ap.settings
        FROM agents a
        LEFT JOIN agent_profiles ap ON ap.agent_id = a.id
        WHERE a.project_id = ?
        ORDER BY datetime(a.updated_at) DESC, datetime(a.created_at) DESC
      `,
    )
    .all(projectId) as Array<AgentRow & {
      emoji?: string;
      avatar_url?: string;
      color?: string;
      settings?: string;
    }>;

  res.json(
    rows.map((row) => ({
      ...mapAgentRow(row),
      emoji: row.emoji,
      avatar_url: row.avatar_url,
      color: row.color,
      settings: parseSettings(row.settings),
    })),
  );
});

router.post("/:id/agents", (req, res) => {
  const projectId = req.params.id;
  ensureProjectExists(projectId);
  const body = req.body as Record<string, unknown>;
  const now = nowIso();

  const existingAgentId = typeof body.agent_id === "string" ? body.agent_id.trim() : "";
  let agentId = existingAgentId;

  if (!agentId) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = body.type === "claude" ? "claude" : "codex";
    if (!name) {
      res.status(400).json({ error: "agent_id or name is required" });
      return;
    }
    agentId = uuidv4();
    db.prepare(
      `
        INSERT INTO agents (
          id, project_id, name, type, status, current_task_id,
          total_tasks, success_count, fail_count, avg_duration_min,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, 'idle', NULL, 0, 0, 0, 0, ?, ?)
      `,
    ).run(agentId, projectId, name, type, now, now);
  } else {
    const info = db.prepare("UPDATE agents SET project_id = ?, updated_at = ? WHERE id = ?").run(
      projectId,
      now,
      agentId,
    );
    if (info.changes === 0) {
      res.status(404).json({ error: "agent not found" });
      return;
    }
  }

  const emoji = typeof body.emoji === "string" ? body.emoji : "🤖";
  const avatarUrl = typeof body.avatar_url === "string" ? body.avatar_url : "";
  const color = typeof body.color === "string" ? body.color : "#3b82f6";
  const settings = body.settings && typeof body.settings === "object" ? body.settings : {};

  db.prepare(
    `
      INSERT INTO agent_profiles (id, agent_id, emoji, avatar_url, color, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(agent_id) DO UPDATE SET
        emoji = excluded.emoji,
        avatar_url = excluded.avatar_url,
        color = excluded.color,
        settings = excluded.settings,
        updated_at = excluded.updated_at
    `,
  ).run(uuidv4(), agentId, emoji, avatarUrl, color, JSON.stringify(settings), now, now);

  const row = db
    .prepare(
      `
        SELECT a.*, ap.emoji, ap.avatar_url, ap.color, ap.settings
        FROM agents a
        LEFT JOIN agent_profiles ap ON ap.agent_id = a.id
        WHERE a.id = ?
      `,
    )
    .get(agentId) as
    | (AgentRow & {
        emoji?: string;
        avatar_url?: string;
        color?: string;
        settings?: string;
      })
    | undefined;

  recordActivity({
    projectId,
    agentId,
    action: "agent.assigned",
    details: { agent_id: agentId, project_id: projectId },
  });

  if (!row) {
    res.status(500).json({ error: "failed to load agent" });
    return;
  }

  res.status(201).json({
    ...mapAgentRow(row),
    emoji: row.emoji,
    avatar_url: row.avatar_url,
    color: row.color,
    settings: parseSettings(row.settings),
  });
});

// Compatibility endpoints retained for existing consumers.
router.get("/:id/members", (req, res) => {
  const rows = db
    .prepare(
      `
        SELECT pm.*, a.name AS agent_name, a.type AS agent_type, a.status AS agent_status
        FROM project_members pm
        JOIN agents a ON a.id = pm.agent_id
        WHERE pm.project_id = ?
        ORDER BY datetime(pm.joined_at) DESC
      `,
    )
    .all(req.params.id);
  res.json(rows);
});

router.post("/:id/members", (req, res) => {
  const body = req.body as { agent_id?: unknown; role?: unknown };
  if (typeof body.agent_id !== "string" || body.agent_id.trim().length === 0) {
    res.status(400).json({ error: "agent_id is required" });
    return;
  }

  const role = body.role === "owner" ? "owner" : "member";
  const id = uuidv4();
  const now = nowIso();
  db.prepare(
    `
      INSERT INTO project_members (id, project_id, agent_id, role, joined_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(project_id, agent_id) DO UPDATE SET role = excluded.role
    `,
  ).run(id, req.params.id, body.agent_id.trim(), role, now);

  res.status(201).json({ id, project_id: req.params.id, agent_id: body.agent_id.trim(), role, joined_at: now });
});

router.get("/:id/activities", (req, res) => {
  const projectId = req.params.id;
  ensureProjectExists(projectId);
  const limit = Number.parseInt(String(req.query.limit ?? "50"), 10);
  res.json(listActivities(projectId, Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 50));
});

router.get("/:id/keys", (req, res) => {
  const rows = db
    .prepare(
      `
        SELECT id, project_id, key, label, created_at, expires_at
        FROM api_keys
        WHERE project_id = ?
        ORDER BY datetime(created_at) DESC
      `,
    )
    .all(req.params.id) as Array<{
    id: string;
    project_id: string;
    key: string;
    label: string;
    created_at: string;
    expires_at: string | null;
  }>;

  res.json(
    rows.map((row) =>
      redactApiKey({
        id: row.id,
        project_id: row.project_id,
        key: row.key,
        label: row.label,
        created_at: row.created_at,
        expires_at: row.expires_at,
      }),
    ),
  );
});

router.post("/:id/keys", (req, res) => {
  const body = req.body as { label?: unknown; expires_at?: unknown; name?: unknown };
  const projectId = req.params.id;
  ensureProjectExists(projectId);

  const labelSource = typeof body.label === "string" ? body.label : body.name;
  const created = createApiKey({
    projectId,
    label: typeof labelSource === "string" ? labelSource : "",
    expiresAt: typeof body.expires_at === "string" ? body.expires_at : null,
  });

  recordActivity({
    projectId,
    action: "api_key.created",
    details: { key_id: created.id, label: created.label },
  });

  // Keep existing behavior: return full key only on create.
  res.status(201).json(created);
});

router.delete("/:id/keys/:keyId", (req, res) => {
  const info = db.prepare("DELETE FROM api_keys WHERE id = ? AND project_id = ?").run(
    req.params.keyId,
    req.params.id,
  );
  if (info.changes === 0) {
    res.status(404).json({ error: "api key not found" });
    return;
  }
  res.status(204).send();
});

router.get("/:id/webhooks", (req, res) => {
  const rows = db
    .prepare(
      `
        SELECT id, project_id, url, events, active, created_at, updated_at
        FROM webhooks
        WHERE project_id = ?
        ORDER BY datetime(created_at) DESC
      `,
    )
    .all(req.params.id) as WebhookRow[];

  res.json(rows.map(mapWebhookRow));
});

router.post("/:id/webhooks", (req, res) => {
  const body = req.body as { url?: unknown; events?: unknown; active?: unknown };
  if (typeof body.url !== "string" || body.url.trim().length === 0) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  const projectId = req.params.id;
  ensureProjectExists(projectId);

  const now = nowIso();
  const id = uuidv4();
  const events = Array.isArray(body.events)
    ? body.events.filter((item): item is string => typeof item === "string")
    : [];
  const active = body.active === undefined ? true : Boolean(body.active);

  db.prepare(
    `
      INSERT INTO webhooks (id, project_id, url, events, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(id, projectId, body.url.trim(), JSON.stringify(events), active ? 1 : 0, now, now);

  const created = db
    .prepare(
      "SELECT id, project_id, url, events, active, created_at, updated_at FROM webhooks WHERE id = ?",
    )
    .get(id) as WebhookRow;

  recordActivity({
    projectId,
    action: "webhook.created",
    details: { webhook_id: id, url: created.url },
  });

  res.status(201).json(mapWebhookRow(created));
});

function updateWebhookHandler(req: Request, res: Response): void {
  const body = req.body as { url?: unknown; events?: unknown; active?: unknown };
  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.url !== undefined) {
    if (typeof body.url !== "string" || body.url.trim().length === 0) {
      res.status(400).json({ error: "url must be non-empty string" });
      return;
    }
    updates.push("url = ?");
    params.push(body.url.trim());
  }

  if (body.events !== undefined) {
    if (!Array.isArray(body.events) || body.events.some((item) => typeof item !== "string")) {
      res.status(400).json({ error: "events must be string array" });
      return;
    }
    updates.push("events = ?");
    params.push(JSON.stringify(body.events));
  }

  if (body.active !== undefined) {
    updates.push("active = ?");
    params.push(body.active ? 1 : 0);
  }

  if (updates.length === 0) {
    const current = db
      .prepare(
        "SELECT id, project_id, url, events, active, created_at, updated_at FROM webhooks WHERE id = ?",
      )
      .get(req.params.webhookId) as WebhookRow | undefined;
    if (!current) {
      res.status(404).json({ error: "webhook not found" });
      return;
    }
    res.json(mapWebhookRow(current));
    return;
  }

  updates.push("updated_at = ?");
  params.push(nowIso(), req.params.webhookId, req.params.id);
  const info = db
    .prepare(`UPDATE webhooks SET ${updates.join(", ")} WHERE id = ? AND project_id = ?`)
    .run(...params);
  if (info.changes === 0) {
    res.status(404).json({ error: "webhook not found" });
    return;
  }

  const updated = db
    .prepare(
      "SELECT id, project_id, url, events, active, created_at, updated_at FROM webhooks WHERE id = ?",
    )
    .get(req.params.webhookId) as WebhookRow;

  res.json(mapWebhookRow(updated));
}

router.patch("/:id/webhooks/:webhookId", updateWebhookHandler);
router.put("/:id/webhooks/:webhookId", updateWebhookHandler);

router.delete("/:id/webhooks/:webhookId", (req, res) => {
  const info = db.prepare("DELETE FROM webhooks WHERE id = ? AND project_id = ?").run(
    req.params.webhookId,
    req.params.id,
  );
  if (info.changes === 0) {
    res.status(404).json({ error: "webhook not found" });
    return;
  }
  res.status(204).send();
});

export default router;
