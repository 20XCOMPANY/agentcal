/**
 * [INPUT]: Depends on express Router, SQLite db timestamps, and webhook parsing/mapping helpers in ./shared.
 * [OUTPUT]: Exposes webhook CRUD routes under /api/projects/:id/webhooks.
 * [POS]: Project sub-router for outbound integration hooks and event subscriptions.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Router } from "express";
import { db, nowIso } from "../../db";
import { createEntityId, mapStoredWebhook, parseStringArray, withProjectRouteError } from "./shared";

const router = Router({ mergeParams: true });

router.get(
  "/webhooks",
  withProjectRouteError("getting project webhooks", "Failed to get webhooks", (req, res) => {
    const rows = db.prepare("SELECT * FROM webhooks WHERE project_id = ?").all(req.params.id);
    const webhooks = rows
      .map((row) => mapStoredWebhook(row))
      .filter((row): row is NonNullable<typeof row> => row !== null);

    res.json(webhooks);
  }),
);

router.post(
  "/webhooks",
  withProjectRouteError("creating webhook", "Failed to create webhook", (req, res) => {
    const { url, events = [], active = true } = req.body as {
      url?: unknown;
      events?: unknown;
      active?: unknown;
    };

    if (typeof url !== "string" || url.trim().length === 0) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    const normalizedEvents = parseStringArray(events);
    const enabled = Boolean(active);
    const id = createEntityId("wh");
    const createdAt = nowIso();

    db.prepare(
      `
      INSERT INTO webhooks (id, project_id, url, events, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(id, req.params.id, url.trim(), JSON.stringify(normalizedEvents), enabled ? 1 : 0, createdAt);

    res.status(201).json({
      id,
      project_id: req.params.id,
      url: url.trim(),
      events: normalizedEvents,
      active: enabled,
      created_at: createdAt,
    });
  }),
);

router.patch(
  "/webhooks/:webhookId",
  withProjectRouteError("updating webhook", "Failed to update webhook", (req, res) => {
    const { url, events, active } = req.body as {
      url?: unknown;
      events?: unknown;
      active?: unknown;
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    if (typeof url === "string" && url.trim().length > 0) {
      updates.push("url = ?");
      values.push(url.trim());
    }

    if (events !== undefined) {
      updates.push("events = ?");
      values.push(JSON.stringify(parseStringArray(events)));
    }

    if (active !== undefined) {
      updates.push("active = ?");
      values.push(Boolean(active) ? 1 : 0);
    }

    values.push(req.params.webhookId);

    if (updates.length > 0) {
      db.prepare(`UPDATE webhooks SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    const row = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(req.params.webhookId);
    const webhook = mapStoredWebhook(row);
    res.json(webhook ?? { active: false, events: [] });
  }),
);

router.delete(
  "/webhooks/:webhookId",
  withProjectRouteError("deleting webhook", "Failed to delete webhook", (req, res) => {
    db.prepare("DELETE FROM webhooks WHERE id = ?").run(req.params.webhookId);
    res.status(204).send();
  }),
);

export default router;
