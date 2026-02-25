/**
 * [INPUT]: 依赖 ../services/auth 的 token 解析与查验能力。
 * [OUTPUT]: 对外提供可选认证与强制认证中间件，并将 api key 注入请求上下文。
 * [POS]: server HTTP 认证中间层，被 remote agent 相关路由复用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import type { NextFunction, Request, Response } from "express";
import { getApiKeyByToken, parseApiToken } from "../services/auth";
import type { ApiKey } from "../types";

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
    }
  }
}

function attachApiKey(req: Request): ApiKey | null {
  const token = parseApiToken(req);
  if (!token) {
    return null;
  }

  const apiKey = getApiKeyByToken(token);
  if (!apiKey) {
    return null;
  }

  req.apiKey = apiKey;
  return apiKey;
}

export function optionalApiAuth(req: Request, _res: Response, next: NextFunction): void {
  attachApiKey(req);
  next();
}

export function requireApiAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = attachApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "invalid or missing API key" });
    return;
  }
  next();
}
