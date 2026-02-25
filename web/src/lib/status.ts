import type { TaskStatus, TaskPriority } from "@/types";
import clsx from "clsx";

export const statusColor: Record<TaskStatus, string> = {
  running: "bg-green-500",
  queued: "bg-yellow-400",
  pr_open: "bg-blue-500",
  completed: "bg-emerald-500",
  failed: "bg-red-500",
  archived: "bg-neutral-400",
};

export const statusEmoji: Record<TaskStatus, string> = {
  running: "🟢",
  queued: "🟡",
  pr_open: "🔵",
  completed: "✅",
  failed: "🔴",
  archived: "⚪",
};

export const statusLabel: Record<TaskStatus, string> = {
  running: "Running",
  queued: "Queued",
  pr_open: "PR Open",
  completed: "Completed",
  failed: "Failed",
  archived: "Archived",
};

export const priorityColor: Record<TaskPriority, string> = {
  low: "text-neutral-500",
  medium: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-600 font-semibold",
};

export function statusBadgeClass(status: TaskStatus) {
  return clsx(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
    {
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300":
        status === "running",
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300":
        status === "queued",
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300":
        status === "pr_open",
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300":
        status === "completed",
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300":
        status === "failed",
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400":
        status === "archived",
    }
  );
}
