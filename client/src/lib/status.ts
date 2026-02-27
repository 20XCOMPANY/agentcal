/**
 * [INPUT]: Depends on task status enum values from shared domain types.
 * [OUTPUT]: Exposes consistent status color, label, and badge helpers for UI rendering.
 * [POS]: presentation utility layer used across calendar cards and task detail views.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import type { TaskStatus } from "@/types";

export const taskStatusLabel: Record<TaskStatus, string> = {
  blocked: "Blocked",
  queued: "Queued",
  running: "Running",
  pr_open: "PR Open",
  completed: "Completed",
  failed: "Failed",
  archived: "Archived",
};

export const taskStatusColor: Record<TaskStatus, string> = {
  running: "bg-emerald-500",
  queued: "bg-amber-400",
  pr_open: "bg-sky-500",
  completed: "bg-slate-400",
  failed: "bg-red-500",
  blocked: "bg-orange-500",
  archived: "bg-slate-300",
};

export const taskStatusSurface: Record<TaskStatus, string> = {
  running: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200",
  queued: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200",
  pr_open: "bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-200",
  completed: "bg-slate-100 border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200",
  failed: "bg-red-50 border-red-200 text-red-900 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200",
  blocked: "bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-200",
  archived: "bg-zinc-100 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300",
};

export function formatCiStatus(status: "pending" | "passing" | "failing" | null): string {
  if (!status) return "-";
  if (status === "passing") return "Passing";
  if (status === "failing") return "Failing";
  return "Pending";
}
