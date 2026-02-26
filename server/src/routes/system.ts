/**
 * [INPUT]: Depends on system metrics, DB aggregate queries, sync trigger, and task scheduler config/queue services.
 * [OUTPUT]: Exposes system status/stats APIs and queue/config management endpoints.
 * [POS]: System route gateway for operational introspection and scheduler controls.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import os from "node:os";
import { Router } from "express";
import { db, nowIso } from "../db";
import { getAgentSwarmStatus } from "../services/agent-swarm";
import { getQueueStatus, getSystemConfig, updateSystemConfig } from "../services/task-scheduler";
import type { SyncResult } from "../types";

interface SystemRouterOptions {
  runSync: () => Promise<SyncResult>;
}

export function createSystemRouter(options: SystemRouterOptions): Router {
  const router = Router();

  router.get("/status", async (_req, res) => {
    const memoryTotal = os.totalmem();
    const memoryFree = os.freemem();
    const memoryUsed = memoryTotal - memoryFree;

    const activeAgents = db
      .prepare("SELECT COUNT(*) AS count FROM agents WHERE status = 'busy'")
      .get() as { count: number };
    const totalAgents = db.prepare("SELECT COUNT(*) AS count FROM agents").get() as { count: number };
    const runningTasks = db
      .prepare("SELECT COUNT(*) AS count FROM tasks WHERE status = 'running'")
      .get() as { count: number };

    let swarmStatus: { stdout: string; stderr: string } | null = null;
    try {
      const status = await getAgentSwarmStatus();
      swarmStatus = { stdout: status.stdout, stderr: status.stderr };
    } catch {
      swarmStatus = null;
    }

    res.json({
      timestamp: nowIso(),
      cpu: {
        cores: os.cpus().length,
        load_avg: os.loadavg(),
      },
      memory: {
        total_mb: Math.round(memoryTotal / 1024 / 1024),
        free_mb: Math.round(memoryFree / 1024 / 1024),
        used_mb: Math.round(memoryUsed / 1024 / 1024),
        usage_percent: Number(((memoryUsed / memoryTotal) * 100).toFixed(2)),
      },
      agents: {
        active: activeAgents.count,
        total: totalAgents.count,
      },
      tasks: {
        running: runningTasks.count,
      },
      process: {
        uptime_sec: Math.round(process.uptime()),
        pid: process.pid,
      },
      swarm: swarmStatus,
    });
  });

  router.post("/sync", async (_req, res, next) => {
    try {
      const result = await options.runSync();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/stats", (_req, res) => {
    const totals = db.prepare(
      `
        SELECT
          COUNT(*) AS total_tasks,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_tasks,
          AVG(actual_duration_min) AS avg_duration_min
        FROM tasks
      `,
    ).get() as {
      total_tasks: number;
      completed_tasks: number | null;
      failed_tasks: number | null;
      avg_duration_min: number | null;
    };

    const byStatus = db.prepare("SELECT status, COUNT(*) AS count FROM tasks GROUP BY status").all() as Array<{
      status: string;
      count: number;
    }>;

    const days30Ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const completionTrend = db
      .prepare(
        `
          SELECT
            substr(completed_at, 1, 10) AS date,
            COUNT(*) AS count
          FROM tasks
          WHERE completed_at IS NOT NULL
            AND completed_at >= ?
          GROUP BY substr(completed_at, 1, 10)
          ORDER BY date ASC
        `,
      )
      .all(days30Ago) as Array<{ date: string; count: number }>;

    const agentUtilization = db
      .prepare(
        `
          SELECT
            a.id,
            a.name,
            a.type,
            a.status,
            a.total_tasks,
            a.success_count,
            a.fail_count,
            a.avg_duration_min,
            SUM(CASE WHEN t.status = 'running' THEN 1 ELSE 0 END) AS running_tasks
          FROM agents a
          LEFT JOIN tasks t ON t.agent_id = a.id
          GROUP BY a.id
          ORDER BY a.name ASC
        `,
      )
      .all() as Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      total_tasks: number;
      success_count: number;
      fail_count: number;
      avg_duration_min: number;
      running_tasks: number;
    }>;

    const completed = totals.completed_tasks ?? 0;
    const failed = totals.failed_tasks ?? 0;
    const successRate = completed + failed === 0 ? 0 : Number((completed / (completed + failed)).toFixed(4));

    res.json({
      generated_at: nowIso(),
      totals: {
        total_tasks: totals.total_tasks,
        completed_tasks: completed,
        failed_tasks: failed,
        avg_duration_min:
          totals.avg_duration_min === null ? null : Number(totals.avg_duration_min.toFixed(2)),
        success_rate: successRate,
      },
      by_status: byStatus,
      completion_trend_30d: completionTrend,
      agent_utilization: agentUtilization,
    });
  });

  router.get("/queue", (_req, res) => {
    res.json(getQueueStatus());
  });

  router.get("/config", (_req, res) => {
    res.json(getSystemConfig());
  });

  router.put("/config", (req, res) => {
    const body = req.body as Record<string, unknown>;
    if ("max_concurrent_agents" in body && typeof body.max_concurrent_agents !== "number") {
      res.status(400).json({ error: "max_concurrent_agents must be a number" });
      return;
    }
    try {
      const config = updateSystemConfig({
        max_concurrent_agents:
          typeof body.max_concurrent_agents === "number" ? body.max_concurrent_agents : undefined,
      });
      res.json(config);
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid config payload";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
