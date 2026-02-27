/**
 * [INPUT]: Depends on route task id, task/agent stores, log viewer component, and task action APIs.
 * [OUTPUT]: Renders notion-like task detail page with metadata, live logs, and control actions.
 * [POS]: deep task inspection and intervention surface for redirect/kill/retry operations.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  killTask,
  redirectTask,
  retryTask,
  spawnTask,
  updateTask,
} from "@/api/client";
import { LogViewer } from "@/components/LogViewer";
import { formatCiStatus, taskStatusLabel, taskStatusSurface } from "@/lib/status";
import { useAgentStore } from "@/stores/agentStore";
import { useTaskStore } from "@/stores/taskStore";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const loadTaskById = useTaskStore((state) => state.loadTaskById);
  const upsertTask = useTaskStore((state) => state.upsertTask);
  const appendLog = useTaskStore((state) => state.appendLog);
  const setSelectedTaskId = useTaskStore((state) => state.setSelectedTaskId);
  const loadAgents = useAgentStore((state) => state.loadAgents);
  const getAgentById = useAgentStore((state) => state.getAgentById);

  const task = useTaskStore((state) => state.getTaskById(taskId ?? null));
  const logs = useTaskStore((state) => (taskId ? state.logsByTaskId[taskId] ?? [] : []));

  const [redirectMessage, setRedirectMessage] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    setSelectedTaskId(taskId);
    void loadTaskById(taskId);
    void loadAgents();
  }, [loadAgents, loadTaskById, setSelectedTaskId, taskId]);

  const agent = useMemo(() => getAgentById(task?.agent_id ?? null), [getAgentById, task?.agent_id]);

  if (!taskId) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Task id is missing.</p>;
  }

  if (!task) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading task details...</p>;
  }

  async function runAction(action: () => Promise<void>): Promise<void> {
    setIsActing(true);
    setError(null);
    try {
      await action();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Task action failed");
    } finally {
      setIsActing(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/calendar" className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            ← Back to Calendar
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{task.title}</h1>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${taskStatusSurface[task.status]}`}>
          {taskStatusLabel[task.status]}
        </span>
      </div>

      <section className="panel rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Agent</p>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{agent ? `${agent.emoji ?? "🤖"} ${agent.name}` : "Unassigned"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Priority</p>
            <p className="mt-1 text-sm capitalize text-slate-900 dark:text-slate-100">{task.priority}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Branch</p>
            <p className="mt-1 text-sm font-mono text-slate-900 dark:text-slate-100">{task.branch ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">CI Status</p>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{formatCiStatus(task.ci_status)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Started</p>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{formatDate(task.started_at)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{formatDate(task.completed_at)}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pull Request</p>
            {task.pr_url ? (
              <a
                href={task.pr_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm text-sky-600 underline decoration-dotted underline-offset-2 dark:text-sky-400"
              >
                {task.pr_url}
              </a>
            ) : (
              <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">Not linked</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Description</h2>
        <article className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-800 dark:text-slate-100">
          {task.description || "No description provided."}
        </article>
      </section>

      <section className="panel rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Live Log</h2>
        <div className="mt-3">
          <LogViewer lines={logs} emptyText="Waiting for live log events from WebSocket." />
        </div>
      </section>

      <section className="panel rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Actions</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {task.status === "queued" || task.status === "blocked" ? (
            <button
              type="button"
              disabled={isActing || task.status === "blocked"}
              onClick={() =>
                void runAction(async () => {
                  const updated = await spawnTask(task.id);
                  upsertTask(updated);
                })
              }
              className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Spawn
            </button>
          ) : null}

          {task.status === "running" ? (
            <>
              <input
                value={redirectMessage}
                onChange={(event) => setRedirectMessage(event.target.value)}
                placeholder="Redirect message"
                className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                disabled={isActing || redirectMessage.trim().length === 0}
                onClick={() =>
                  void runAction(async () => {
                    await redirectTask(task.id, redirectMessage.trim());
                    appendLog(task.id, `> Redirect: ${redirectMessage.trim()}`);
                    setRedirectMessage("");
                  })
                }
                className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Redirect
              </button>
              <button
                type="button"
                disabled={isActing}
                onClick={() =>
                  void runAction(async () => {
                    const updated = await killTask(task.id);
                    upsertTask(updated);
                  })
                }
                className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kill
              </button>
            </>
          ) : null}

          {task.status === "failed" ? (
            <button
              type="button"
              disabled={isActing}
              onClick={() =>
                void runAction(async () => {
                  const updated = await retryTask(task.id);
                  upsertTask(updated);
                })
              }
              className="rounded-md bg-orange-500 px-3 py-2 text-xs font-medium text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry
            </button>
          ) : null}

          <button
            type="button"
            disabled={isActing}
            onClick={() =>
              void runAction(async () => {
                const archived = await updateTask(task.id, { status: "archived" });
                upsertTask(archived);
              })
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Archive
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
      </section>
    </div>
  );
}
