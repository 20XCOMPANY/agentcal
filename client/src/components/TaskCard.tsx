/**
 * [INPUT]: Depends on task entity data and status color semantics from status utilities.
 * [OUTPUT]: Renders clickable task block with status color coding and timing metadata.
 * [POS]: reusable calendar/task tile used in day/week/month presentations.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import type { CSSProperties } from "react";
import type { Task } from "@/types";
import { taskStatusSurface } from "@/lib/status";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  style?: CSSProperties;
  onClick?: (task: Task) => void;
}

function formatTime(value: string | null): string {
  if (!value) return "No time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No time";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskCard({ task, compact = false, style, onClick }: TaskCardProps) {
  return (
    <button
      type="button"
      style={style}
      onClick={() => onClick?.(task)}
      className={`w-full rounded-md border p-2 text-left transition hover:shadow-sm ${taskStatusSurface[task.status]} ${
        compact ? "min-h-[42px] text-[11px]" : "min-h-[56px] text-xs"
      }`}
      title={task.title}
    >
      <p className="truncate font-medium">{task.title}</p>
      <p className="mt-1 truncate text-[10px] opacity-80">{formatTime(task.scheduled_at || task.started_at || task.created_at)}</p>
    </button>
  );
}
