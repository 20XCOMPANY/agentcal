/**
 * [INPUT]: Depends on system config/status endpoints for scheduler and host diagnostics.
 * [OUTPUT]: Renders settings controls for concurrent-agent limit plus runtime health snapshot.
 * [POS]: operational preference page for client-side and backend scheduler settings.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useEffect, useState } from "react";
import {
  fetchSystemConfig,
  fetchSystemStatus,
  updateSystemConfig,
} from "@/api/client";
import type { SystemStatus } from "@/types";

export function SettingsPage() {
  const [maxConcurrentAgents, setMaxConcurrentAgents] = useState(3);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [config, systemStatus] = await Promise.all([fetchSystemConfig(), fetchSystemStatus()]);
        setMaxConcurrentAgents(config.max_concurrent_agents);
        setStatus(systemStatus);
      } catch (requestError) {
        setMessage(requestError instanceof Error ? requestError.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  async function saveSchedulerConfig(): Promise<void> {
    setSaving(true);
    setMessage(null);
    try {
      const response = await updateSystemConfig({
        max_concurrent_agents: maxConcurrentAgents,
      });
      setMaxConcurrentAgents(response.max_concurrent_agents);
      setMessage("Saved");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Scheduler controls and backend runtime status.</p>
      </header>

      <section className="panel rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Scheduler</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading configuration...</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-700 dark:text-slate-200">Max concurrent agents</label>
            <input
              type="number"
              min={1}
              max={32}
              value={maxConcurrentAgents}
              onChange={(event) => setMaxConcurrentAgents(Math.max(1, Number(event.target.value || 1)))}
              className="w-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => void saveSchedulerConfig()}
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {message ? <p className="text-xs text-slate-500">{message}</p> : null}
          </div>
        )}
      </section>

      <section className="panel rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Backend Status</h2>
        {status ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <StatRow label="CPU cores" value={String(status.cpu.cores)} />
            <StatRow label="Load avg" value={status.cpu.load_avg.map((item) => item.toFixed(2)).join(", ")} />
            <StatRow label="Memory used" value={`${status.memory.used_mb} MB`} />
            <StatRow label="Memory free" value={`${status.memory.free_mb} MB`} />
            <StatRow label="Running tasks" value={String(status.tasks.running)} />
            <StatRow label="Active agents" value={`${status.agents.active}/${status.agents.total}`} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Status unavailable.</p>
        )}
      </section>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}
