/**
 * [INPUT]: Depends on express Router, SQLite db, and parsing/error helpers from ./shared.
 * [OUTPUT]: Exposes project activity feed route under /api/projects/:id/activities.
 * [POS]: Read-only project sub-router for activity stream retrieval.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Router } from "express";
import { db } from "../../db";
import { parsePositiveLimit, withProjectRouteError } from "./shared";

const router = Router({ mergeParams: true });

router.get(
  "/activities",
  withProjectRouteError("getting project activities", "Failed to get project activities", (req, res) => {
    const limit = parsePositiveLimit(req.query.limit, 50);
    const activities = db
      .prepare(
        `
      SELECT a.*, ag.name as agent_name, ag.type as agent_type
      FROM activities a
      JOIN agents ag ON a.agent_id = ag.id
      WHERE a.project_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `,
      )
      .all(req.params.id, limit);

    res.json(activities);
  }),
);

export default router;
