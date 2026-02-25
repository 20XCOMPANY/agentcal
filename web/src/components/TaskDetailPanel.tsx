import { useState } from "react";
import { useStore } from "@/store";
import { statusBadgeClass, statusLabel, statusEmoji } from "@/lib/status";
import { X, Play, RotateCcw, Skull, ArrowRightLeft, ExternalLink } from "lucide-react";
import * as api from "@/api/client";

import clsx from "clsx";
import { format } from "date-fns";

export function TaskDetailPanel() {
  const task = useStore((s) => s.selectedTask);
  const open = useStore((s) => s.detailOpen);
  const setDetailOpen = useStore((s) => s.setDetailOpen);
  const agents = useStore((s) => s.agents);
  const upsertTask = useStore((s) => s.upsertTask);

  const [redirectMsg, setRedirectMsg] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  if (!task) return null;

  const agent = agents.find((a) => a.id === task.agent_id);

  async function action(name: string, fn: () => Promise<unknown>) {
    setLoading(name);
    try {
      const result = await fn();
      if (result && typeof result === "object" && "id" in result) {
        upsertTask(result as import("@/types").Task);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
          onClick={() => setDetailOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={clsx(
          "fixed inset-y-0 right-0 z-50 w-full max-w-lg transform border-l border-neutral-200 bg-white shadow-xl transition-transform duration-300 dark:border-neutral-800 dark:bg-surface-dark",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-neutral-100 p-6 dark:border-neutral-800">
            <div className="flex-1 pr-4">
              <h2 className="text-lg font-semibold leading-tight">
                {task.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={statusBadgeClass(task.status)}>
                  {statusEmoji[task.status]} {statusLabel[task.status]}
                </span>
                <span className="text-xs text-neutral-500">
                  {task.agent_type}
                </span>
                <span className="text-xs capitalize text-neutral-400">
                  {task.priority}
                </span>
              </div>
            </div>
            <button
              onClick={() => setDetailOpen(false)}
              className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-6 p-6">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {agent && (
                <div>
                  <span className="text-neutral-500">Agent</span>
                  <p className="font-medium">{agent.name}</p>
                </div>
              )}
              {task.branch && (
                <div>
                  <span className="text-neutral-500">Branch</span>
                  <p className="font-mono text-xs">{task.branch}</p>
                </div>
              )}
              {task.pr_url && (
                <div>
                  <span className="text-neutral-500">PR</span>
                  <a
                    href={task.pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                  >
                    #{task.pr_number} <ExternalLink size={12} />
                  </a>
                </div>
              )}
              {task.scheduled_at && (
                <div>
                  <span className="text-neutral-500">Scheduled</span>
                  <p>{format(new Date(task.scheduled_at), "MMM d, h:mm a")}</p>
                </div>
              )}
              {task.started_at && (
                <div>
                  <span className="text-neutral-500">Started</span>
                  <p>{format(new Date(task.started_at), "MMM d, h:mm a")}</p>
                </div>
              )}
              {task.actual_duration_min != null && (
                <div>
                  <span className="text-neutral-500">Duration</span>
                  <p>{task.actual_duration_min} min</p>
                </div>
              )}
            </div>

            {/* Reviews */}
            {task.reviews && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Reviews
                </h3>
                <div className="flex gap-3">
                  {(["codex", "gemini", "claude"] as const).map((r) => (
                    <span
                      key={r}
                      className={clsx(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        task.reviews[r] === "approved" &&
                          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                        task.reviews[r] === "rejected" &&
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                        task.reviews[r] === "pending" &&
                          "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                      )}
                    >
                      {r}: {task.reviews[r]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Description
                </h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap text-sm">{task.description}</pre>
                </div>
              </div>
            )}

            {/* Log viewer placeholder */}
            {task.status === "running" && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Live Log
                </h3>
                <div className="h-48 overflow-y-auto rounded bg-neutral-950 p-3 font-mono text-xs text-green-400 scrollbar-thin">
                  <p className="text-neutral-500">
                    Streaming logs from {task.tmux_session || "agent"}...
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                {task.status === "queued" && (
                  <button
                    disabled={loading === "spawn"}
                    onClick={() => action("spawn", () => api.spawnTask(task.id))}
                    className="inline-flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <Play size={14} />
                    {loading === "spawn" ? "Spawning..." : "Spawn Agent"}
                  </button>
                )}
                {task.status === "running" && (
                  <>
                    <button
                      disabled={loading === "kill"}
                      onClick={() => action("kill", () => api.killTask(task.id))}
                      className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Skull size={14} />
                      {loading === "kill" ? "Killing..." : "Kill"}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={redirectMsg}
                        onChange={(e) => setRedirectMsg(e.target.value)}
                        placeholder="Redirect message..."
                        className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
                      />
                      <button
                        disabled={loading === "redirect" || !redirectMsg.trim()}
                        onClick={() =>
                          action("redirect", () =>
                            api.redirectTask(task.id, redirectMsg)
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <ArrowRightLeft size={14} />
                        Redirect
                      </button>
                    </div>
                  </>
                )}
                {task.status === "failed" && (
                  <button
                    disabled={loading === "retry"}
                    onClick={() => action("retry", () => api.retryTask(task.id))}
                    className="inline-flex items-center gap-1.5 rounded bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    {loading === "retry" ? "Retrying..." : "Retry"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
