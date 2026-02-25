/**
 * [INPUT]: Depends on express Router, SQLite db, and project sub-routes under ./projects/*.
 * [OUTPUT]: Exposes project CRUD routes and mounts project-scoped sub-routes.
 * [POS]: Entry router for /api/projects, coordinating top-level project lifecycle and delegating nested concerns.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Router } from "express";
import { db, nowIso } from "../db";
import projectActivitiesRouter from "./projects/activities";
import projectAgentsRouter from "./projects/agents";
import projectKeysRouter from "./projects/keys";
import { createEntityId, withProjectRouteError } from "./projects/shared";
import projectWebhooksRouter from "./projects/webhooks";

const router = Router();

router.get(
  "/",
  withProjectRouteError("listing projects", "Failed to list projects", (_req, res) => {
    const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
    res.json(projects);
  }),
);

router.post(
  "/",
  withProjectRouteError("creating project", "Failed to create project", (req, res) => {
    const { name, description = "" } = req.body as {
      name?: unknown;
      description?: unknown;
    };

    if (typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    if (description !== undefined && typeof description !== "string") {
      res.status(400).json({ error: "description must be a string" });
      return;
    }

    const id = createEntityId("proj");
    const timestamp = nowIso();

    db.prepare(
      `
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(id, name.trim(), typeof description === "string" ? description : "", timestamp, timestamp);

    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    res.status(201).json(project);
  }),
);

router.get(
  "/:id",
  withProjectRouteError("getting project", "Failed to get project", (req, res) => {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(project);
  }),
);

router.patch(
  "/:id",
  withProjectRouteError("updating project", "Failed to update project", (req, res) => {
    const { name, description } = req.body as {
      name?: unknown;
      description?: unknown;
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    if (typeof name === "string" && name.trim().length > 0) {
      updates.push("name = ?");
      values.push(name.trim());
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        res.status(400).json({ error: "description must be a string" });
        return;
      }
      updates.push("description = ?");
      values.push(description);
    }

    updates.push("updated_at = ?");
    values.push(nowIso(), req.params.id);

    if (updates.length > 1) {
      db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    res.json(project);
  }),
);

router.delete(
  "/:id",
  withProjectRouteError("deleting project", "Failed to delete project", (req, res) => {
    db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
    res.status(204).send();
  }),
);

router.use("/:id", projectAgentsRouter);
router.use("/:id", projectActivitiesRouter);
router.use("/:id", projectKeysRouter);
router.use("/:id", projectWebhooksRouter);

export default router;
