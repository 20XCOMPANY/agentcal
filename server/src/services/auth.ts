/**
 * [INPUT]: 依赖 node:crypto 生成安全 token，依赖 ../db 访问 api_keys 表。
 * [OUTPUT]: 对外提供 API key 生成、校验、提取与脱敏能力。
 * [POS]: server 远程 agent 认证服务，被 auth/webhooks/routes 复用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import crypto from "node:crypto";
import type { Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, nowIso } from "../db";
import type { ApiKey } from "../types";

interface ApiKeyRow {
  id: string;
  project_id: string;
  key: string;
  label: string;
  created_at: string;
  expires_at: string | null;
}

function mapApiKeyRow(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    project_id: row.project_id,
    key: row.key,
    label: row.label,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

export function generateApiToken(): string {
  return `agc_${crypto.randomBytes(24).toString("hex")}`;
}

export function createApiKey(input: {
  projectId: string;
  label?: string;
  expiresAt?: string | null;
}): ApiKey {
  const now = nowIso();
  const key: ApiKey = {
    id: uuidv4(),
    project_id: input.projectId,
    key: generateApiToken(),
    label: input.label?.trim() ?? "",
    created_at: now,
    expires_at: input.expiresAt ?? null,
  };

  db.prepare(
    `
      INSERT INTO api_keys (id, project_id, key, label, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(key.id, key.project_id, key.key, key.label, key.created_at, key.expires_at);

  return key;
}

export function parseApiToken(req: Request): string | null {
  const bearer = req.header("authorization");
  if (bearer && /^bearer\s+/i.test(bearer)) {
    return bearer.replace(/^bearer\s+/i, "").trim() || null;
  }

  const xApiKey = req.header("x-api-key");
  if (xApiKey && xApiKey.trim().length > 0) {
    return xApiKey.trim();
  }

  return null;
}

export function getApiKeyByToken(token: string): ApiKey | null {
  const row = db.prepare("SELECT * FROM api_keys WHERE key = ? LIMIT 1").get(token) as
    | ApiKeyRow
    | undefined;
  if (!row) {
    return null;
  }

  if (row.expires_at) {
    const expiresAt = Date.parse(row.expires_at);
    if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
      return null;
    }
  }

  return mapApiKeyRow(row);
}

export function redactApiKey(apiKey: ApiKey): ApiKey {
  const visibleHead = apiKey.key.slice(0, 8);
  const visibleTail = apiKey.key.slice(-4);
  return {
    ...apiKey,
    key: `${visibleHead}...${visibleTail}`,
  };
}
