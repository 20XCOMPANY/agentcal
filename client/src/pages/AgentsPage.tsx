/**
 * [INPUT]: Depends on agent/task stores for status, current task linkage, and performance stats.
 * [OUTPUT]: Renders agent status cards with live state, current work, and success metrics.
 * [POS]: operational monitoring page for registered coding agents.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useEffect } from "react";
import { useAgentStore } from "@/stores/agentStore";
import { useTaskStore } from "@/stores/taskStore";

const statusClass: Record<"idle" | "busy" | "offline", string> = {
  idle: "bg-emerald-500",
  busy: "bg-amber-400",
  offline: "bg-slate-400",
};

export function AgentsPage() {
  const agents = useAgentStore((state) => state.agents);
  const isLoading = useAgentStore((state) => state.isLoading);
  const loadAgents = useAgentStore((state) => state.loadAgents);
  const getTaskById = useTaskStore((state) => state.getTaskById);
  const loadTasks = useTaskStore((state) => state.loadTasks);

  useEffect(() => {
    void loadAgents();
    void loadTasks();
  }, [loadAgents, loadTasks]);

  if (isLoading) {
    return <p className="py-10 text-sm text-slate-500 dark:text-slate-400">Loading agents...</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Agents</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Realtime agent fleet status and throughput health.</p>
      </header>

      {agents.length === 0 ? (
        <div className="panel rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          No agents registered.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const currentTask = getTaskById(agent.current_task_id);
            const totalCompletedOrFailed = agent.stats.success_count + agent.stats.fail_count;
            const successRate = totalCompletedOrFailed === 0 ? 0 : (agent.stats.success_count / totalCompletedOrFailed) * 100;

            return (
              <article
                key={agent.id}
                className="panel rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{agent.emoji ?? "🤖"} {agent.name}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{agent.type}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusClass[agent.status]}`} />
                    <span className="capitalize text-slate-600 dark:text-slate-300">{agent.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md bg-slate-50 px-2 py-3 dark:bg-slate-900">
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{agent.stats.total_tasks}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Tasks</p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-2 py-3 dark:bg-slate-900">
                    <p className="text-lg font-semibold text-emerald-600">{agent.stats.success_count}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Success</p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-2 py-3 dark:bg-slate-900">
                    <p className="text-lg font-semibold text-red-500">{agent.stats.fail_count}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Failed</p>
                  </div>
                </div>

                <dl className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <dt>Success rate</dt>
                    <dd>{successRate.toFixed(1)}%</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Avg duration</dt>
                    <dd>{agent.stats.avg_duration_min.toFixed(1)}m</dd>
                  </div>
                  <div className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
                    <dt className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Current task</dt>
                    <dd className="text-sm text-slate-800 dark:text-slate-100">
                      {currentTask ? currentTask.title : "No active task"}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
