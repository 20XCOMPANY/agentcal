/**
 * [INPUT]: Depends on express request/response handlers and route modules under server/src/routes/projects.
 * [OUTPUT]: Exposes shared project-route helpers for id generation, safe parsing, and consistent error handling.
 * [POS]: Infrastructure utility layer for project sub-routes, reducing duplication across members/keys/webhooks/activities handlers.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type { Request, RequestHandler, Response } from "express";

export type ProjectRouteHandler = (req: Request, res: Response) => void;

export function withProjectRouteError(
  context: string,
  fallbackMessage: string,
  handler: ProjectRouteHandler,
): RequestHandler {
  return (req, res) => {
    try {
      handler(req, res);
    } catch (error) {
      console.error(`Error ${context}:`, error);
      res.status(500).json({ error: fallbackMessage });
    }
  };
}

export function createEntityId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parsePositiveLimit(value: unknown, fallback = 50): number {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("events must be an array");
  }

  const events = value.map((item) => {
    if (typeof item !== "string") {
      throw new Error("events must only contain strings");
    }
    return item;
  });

  return events;
}

function parseStoredJsonArray(value: unknown): string[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item): item is string => typeof item === "string");
}

interface StoredWebhookRow {
  id: string;
  project_id: string;
  url: string;
  events: string | null;
  active: number;
  created_at: string;
}

export interface ProjectWebhook {
  id: string;
  project_id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export function mapStoredWebhook(value: unknown): ProjectWebhook | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as StoredWebhookRow;
  return {
    id: row.id,
    project_id: row.project_id,
    url: row.url,
    events: parseStoredJsonArray(row.events),
    active: Boolean(row.active),
    created_at: row.created_at,
  };
}
