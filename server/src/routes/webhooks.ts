/**
 * [INPUT]: 依赖 ../db 提供 webhooks 持久化，依赖 api-auth 进行远程调用鉴权。
 * [OUTPUT]: 对外提供 /api/webhooks 资源路由与 /api/webhooks/events 远程事件入口。
 * [POS]: server 远程 agent 集成路由，负责 webhook 管理与事件落库广播。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, DEFAULT_PROJECT_ID, nowIso } from "../db";
import { optionalApiAuth, requireApiAuth } from "../middleware/api-auth";
import { recordActivity } from "../services/activity";
import type { Webhook } from "../types";

interface WebhookRow {
  id: string;
  project_id: string;
  url: string;
  events: string;
  active: number;
  created_at: string;
  updated_at: string;
}

function parseEvents(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function parseWebhookEvents(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseEvents(parsed);
  } catch {
    return [];
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

const router = Router();

router.get("/", optionalApiAuth, (req, res) => {
  const projectId = (req.query.project_id as string | undefined) ?? req.apiKey?.project_id;
  if (!projectId) {
    res.status(400).json({ error: "project_id is required" });
    return;
  }

  const rows = db
    .prepare(
      `
        SELECT id, project_id, url, events, active, created_at, updated_at
        FROM webhooks
        WHERE project_id = ?
        ORDER BY datetime(created_at) DESC
      `,
    )
    .all(projectId) as WebhookRow[];

  res.json(rows.map(mapWebhookRow));
});

router.post("/", optionalApiAuth, (req, res) => {
  const body = req.body as { project_id?: unknown; url?: unknown; events?: unknown; active?: unknown };
  const projectId =
    (typeof body.project_id === "string" && body.project_id.trim().length > 0
      ? body.project_id.trim()
      : null) ??
    req.apiKey?.project_id ??
    DEFAULT_PROJECT_ID;

  if (typeof body.url !== "string" || body.url.trim().length === 0) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  const now = nowIso();
  const id = uuidv4();
  const events = parseEvents(body.events);
  const active = body.active === undefined ? true : Boolean(body.active);

  db.prepare(
    `
      INSERT INTO webhooks (id, project_id, url, events, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(id, projectId, body.url.trim(), JSON.stringify(events), active ? 1 : 0, now, now);

  recordActivity({
    projectId,
    action: "webhook.created",
    details: { webhook_id: id, url: body.url.trim() },
  });

  const created = db
    .prepare(
      "SELECT id, project_id, url, events, active, created_at, updated_at FROM webhooks WHERE id = ?",
    )
    .get(id) as WebhookRow;
  res.status(201).json(mapWebhookRow(created));
});

function updateWebhook(req: Request, res: Response): void {
  const body = req.body as { url?: unknown; events?: unknown; active?: unknown };
  const existing = db
    .prepare("SELECT id, project_id, url, events, active, created_at, updated_at FROM webhooks WHERE id = ?")
    .get(req.params.id) as WebhookRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "webhook not found" });
    return;
  }

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

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    params.push(nowIso(), req.params.id);
    db.prepare(`UPDATE webhooks SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  }

  const updated = db
    .prepare("SELECT id, project_id, url, events, active, created_at, updated_at FROM webhooks WHERE id = ?")
    .get(req.params.id) as WebhookRow;

  recordActivity({
    projectId: updated.project_id,
    action: "webhook.updated",
    details: { webhook_id: updated.id },
  });

  res.json(mapWebhookRow(updated));
}

router.patch("/:id", optionalApiAuth, updateWebhook);
router.put("/:id", optionalApiAuth, updateWebhook);

router.delete("/:id", optionalApiAuth, (req, res) => {
  const row = db
    .prepare("SELECT id, project_id FROM webhooks WHERE id = ?")
    .get(req.params.id) as { id: string; project_id: string } | undefined;
  if (!row) {
    res.status(404).json({ error: "webhook not found" });
    return;
  }

  db.prepare("DELETE FROM webhooks WHERE id = ?").run(req.params.id);
  recordActivity({
    projectId: row.project_id,
    action: "webhook.deleted",
    details: { webhook_id: row.id },
  });

  res.status(204).send();
});

// Remote agents can post events authenticated by API key.
router.post("/events", requireApiAuth, (req, res) => {
  const body = req.body as {
    action?: unknown;
    details?: unknown;
    project_id?: unknown;
    agent_id?: unknown;
  };
  if (typeof body.action !== "string" || body.action.trim().length === 0) {
    res.status(400).json({ error: "action is required" });
    return;
  }

  const projectId =
    typeof body.project_id === "string" && body.project_id.trim().length > 0
      ? body.project_id.trim()
      : req.apiKey?.project_id ?? DEFAULT_PROJECT_ID;
  const details =
    body.details && typeof body.details === "object"
      ? (body.details as Record<string, unknown>)
      : {};
  const agentId = typeof body.agent_id === "string" ? body.agent_id : null;

  const activity = recordActivity({
    projectId,
    agentId,
    action: body.action.trim(),
    details,
  });

  res.status(201).json({ ok: true, activity });
});

export default router;
