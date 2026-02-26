/**
 * [INPUT]: Depends on store theme actions and system config APIs.
 * [OUTPUT]: Renders UI settings for appearance and scheduler concurrency configuration.
 * [POS]: Frontend configuration page for local UX preferences and backend scheduler limits.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { Sun, Moon } from "lucide-react";
import * as api from "@/api/client";

export function SettingsPage() {
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const loadQueueStatus = useStore((s) => s.loadQueueStatus);
  const [maxConcurrentAgents, setMaxConcurrentAgents] = useState<number>(3);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .fetchSystemConfig()
      .then((config) => {
        setMaxConcurrentAgents(config.max_concurrent_agents);
      })
      .catch(() => {
        setConfigMessage("Failed to load scheduler config");
      })
      .finally(() => {
        setLoadingConfig(false);
      });
  }, []);

  async function saveConfig() {
    setSavingConfig(true);
    setConfigMessage(null);
    try {
      const updated = await api.updateSystemConfig({
        max_concurrent_agents: maxConcurrentAgents,
      });
      setMaxConcurrentAgents(updated.max_concurrent_agents);
      setConfigMessage("Saved");
      await loadQueueStatus();
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : "Failed to save config");
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <div className="space-y-6">
        {/* Theme */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-1 text-sm font-semibold">Appearance</h2>
          <p className="mb-4 text-xs text-neutral-500">
            Choose your preferred color scheme.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => darkMode && toggleDarkMode()}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                !darkMode
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            >
              <Sun size={16} />
              Light
            </button>
            <button
              onClick={() => !darkMode && toggleDarkMode()}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                darkMode
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            >
              <Moon size={16} />
              Dark
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-1 text-sm font-semibold">Scheduler</h2>
          <p className="mb-4 text-xs text-neutral-500">
            Configure max concurrent running agents.
          </p>
          {loadingConfig ? (
            <p className="text-xs text-neutral-500">Loading config...</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={1}
                max={32}
                value={maxConcurrentAgents}
                onChange={(e) => setMaxConcurrentAgents(Number(e.target.value))}
                className="w-28 rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-600"
              />
              <button
                type="button"
                onClick={() => void saveConfig()}
                disabled={savingConfig}
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {savingConfig ? "Saving..." : "Save"}
              </button>
              {configMessage ? <span className="text-xs text-neutral-500">{configMessage}</span> : null}
            </div>
          )}
        </div>

        {/* About */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-1 text-sm font-semibold">About</h2>
          <p className="text-xs text-neutral-500">
            AgentCal v0.1.0 — AI agent task scheduler and calendar.
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            Backend: localhost:3100 · WebSocket: /ws
          </p>
        </div>
      </div>
    </div>
  );
}
