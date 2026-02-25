import { useEffect, useState } from "react";
import { useStore } from "@/store";
import * as api from "@/api/client";
import { Bot, Cpu, Activity, Edit2 } from "lucide-react";
import clsx from "clsx";
import type { Agent } from "@/types";

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

const PRESET_EMOJIS = [
  "🤖", "🚀", "⚡", "🔥", "💎", "🎯", "🌟", "✨",
  "🎨", "🎭", "🎪", "🎬", "🎮", "🎲", "🎯", "🎪",
];

export function AgentsPage() {
  const agents = useStore((s) => s.agents);
  const loadAgents = useStore((s) => s.loadAgents);

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const statusDot: Record<string, string> = {
    idle: "bg-green-500",
    busy: "bg-yellow-500",
    offline: "bg-neutral-400",
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setEmoji(agent.emoji || "🤖");
    setColor(agent.color || "#3b82f6");
  };

  const handleUpdate = async () => {
    if (!editingAgent) return;
    setLoading(true);
    try {
      await api.updateAgent(editingAgent.id, { emoji, color });
      await loadAgents();
      setEditingAgent(null);
    } catch (err) {
      console.error("Failed to update agent:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Agents</h1>

      {agents.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-400">
          No agents registered yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                    style={{
                      backgroundColor: agent.color
                        ? `${agent.color}20`
                        : undefined,
                    }}
                  >
                    {agent.emoji ? (
                      <span>{agent.emoji}</span>
                    ) : agent.type === "codex" ? (
                      <Cpu size={20} className="text-blue-500" />
                    ) : (
                      <Bot size={20} className="text-orange-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{agent.name}</h3>
                    <p className="text-xs capitalize text-neutral-500">
                      {agent.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(agent)}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    title="Customize"
                  >
                    <Edit2 size={14} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={clsx(
                        "h-2 w-2 rounded-full",
                        statusDot[agent.status]
                      )}
                    />
                    <span className="text-xs capitalize text-neutral-500">
                      {agent.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {agent.stats.total_tasks}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Total
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600">
                    {agent.stats.success_count}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Success
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-red-500">
                    {agent.stats.fail_count}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Failed
                  </p>
                </div>
              </div>

              {/* Avg duration */}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
                <Activity size={12} />
                Avg: {agent.stats.avg_duration_min.toFixed(1)} min
              </div>

              {/* Current task */}
              {agent.current_task_id && (
                <div className="mt-3 rounded bg-yellow-50 px-2 py-1.5 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                  Working on task{" "}
                  <span className="font-mono">
                    {agent.current_task_id.slice(0, 8)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
            <h2 className="mb-4 text-lg font-semibold">
              Customize {editingAgent.name}
            </h2>
            <div className="space-y-4">
              {/* Emoji picker */}
              <div>
                <label className="mb-2 block text-sm font-medium">Emoji</label>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={clsx(
                        "flex h-10 w-10 items-center justify-center rounded text-xl transition-colors",
                        emoji === e
                          ? "bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-900"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="mt-2 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
                  placeholder="Or type custom emoji"
                  maxLength={2}
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="mb-2 block text-sm font-medium">Color</label>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={clsx(
                        "h-10 w-10 rounded transition-transform",
                        color === c && "scale-110 ring-2 ring-offset-2"
                      )}
                      style={{
                        backgroundColor: c,
                        ringColor: c,
                      }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="mt-2 h-10 w-full rounded border border-neutral-300 dark:border-neutral-600"
                />
              </div>

              {/* Preview */}
              <div className="rounded border border-neutral-200 p-4 dark:border-neutral-700">
                <p className="mb-2 text-xs font-medium text-neutral-500">
                  Preview
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {emoji}
                  </div>
                  <div>
                    <p className="font-medium">{editingAgent.name}</p>
                    <p className="text-xs text-neutral-500">
                      {editingAgent.type}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingAgent(null)}
                className="rounded px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
