/**
 * [INPUT]: 依赖 ../services/auth 生成 api key，依赖 ../db 校验项目存在。
 * [OUTPUT]: 对外提供 /api/auth/token 用于远程 agent 鉴权 token 申请。
 * [POS]: server 认证路由入口，聚焦 token 生命周期创建。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { Router } from "express";
import { db, DEFAULT_PROJECT_ID } from "../db";
import { createApiKey } from "../services/auth";
import { recordActivity } from "../services/activity";

const router = Router();

router.post("/token", (req, res) => {
  const body = req.body as {
    project_id?: unknown;
    label?: unknown;
    expires_at?: unknown;
  };

  const projectId =
    typeof body.project_id === "string" && body.project_id.trim().length > 0
      ? body.project_id.trim()
      : DEFAULT_PROJECT_ID;
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId) as
    | { id: string }
    | undefined;

  if (!project) {
    res.status(404).json({ error: "project not found" });
    return;
  }

  const apiKey = createApiKey({
    projectId,
    label: typeof body.label === "string" ? body.label : "Remote agent token",
    expiresAt: typeof body.expires_at === "string" ? body.expires_at : null,
  });

  recordActivity({
    projectId,
    action: "auth.token_created",
    details: { key_id: apiKey.id, label: apiKey.label },
  });

  res.status(201).json(apiKey);
});

export default router;
