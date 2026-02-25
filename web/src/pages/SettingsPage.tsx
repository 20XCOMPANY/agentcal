import { useStore } from "@/store";
import { Sun, Moon, Monitor } from "lucide-react";

export function SettingsPage() {
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);

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
