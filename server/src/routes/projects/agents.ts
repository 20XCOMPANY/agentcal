/**
 * [INPUT]: Depends on express Router, SQLite db, and shared route helpers from ./shared.
 * [OUTPUT]: Exposes project agent-member routes for listing, adding, and removing project members.
 * [POS]: Project sub-router focused on project-agent membership management under /api/projects/:id/members.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Router } from "express";
import { db, nowIso } from "../../db";
import { createEntityId, withProjectRouteError } from "./shared";

const router = Router({ mergeParams: true });

router.get(
  "/members",
  withProjectRouteError("getting project members", "Failed to get project members", (req, res) => {
    const members = db
      .prepare(
        `
      SELECT pm.*, a.name as agent_name, a.type as agent_type, a.status as agent_status
      FROM project_members pm
      JOIN agents a ON pm.agent_id = a.id
      WHERE pm.project_id = ?
      ORDER BY pm.joined_at DESC
    `,
      )
      .all(req.params.id);

    res.json(members);
  }),
);

router.post(
  "/members",
  withProjectRouteError("adding project member", "Failed to add project member", (req, res) => {
    const { agent_id, role = "member" } = req.body as {
      agent_id?: unknown;
      role?: unknown;
    };

    if (typeof agent_id !== "string" || agent_id.trim().length === 0) {
      res.status(400).json({ error: "agent_id is required" });
      return;
    }

    const normalizedRole = role ?? "member";
    if (normalizedRole !== "owner" && normalizedRole !== "member") {
      res.status(400).json({ error: "role must be owner or member" });
      return;
    }

    const id = createEntityId("pm");
    const joinedAt = nowIso();

    db.prepare(
      `
      INSERT INTO project_members (id, project_id, agent_id, role, joined_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(id, req.params.id, agent_id.trim(), normalizedRole, joinedAt);

    const member = db
      .prepare(
        `
      SELECT pm.*, a.name as agent_name, a.type as agent_type
      FROM project_members pm
      JOIN agents a ON pm.agent_id = a.id
      WHERE pm.id = ?
    `,
      )
      .get(id);

    res.status(201).json(member);
  }),
);

router.delete(
  "/members/:agentId",
  withProjectRouteError("removing project member", "Failed to remove project member", (req, res) => {
    db.prepare("DELETE FROM project_members WHERE project_id = ? AND agent_id = ?").run(
      req.params.id,
      req.params.agentId,
    );
    res.status(204).send();
  }),
);

export default router;
