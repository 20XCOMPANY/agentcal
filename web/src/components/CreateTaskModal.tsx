/**
 * [INPUT]: Depends on store modal/project context and task creation API client.
 * [OUTPUT]: Provides task creation modal with scheduling, priority, agent type, and dependency inputs.
 * [POS]: Manual task authoring entrypoint used across calendar workflows.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useState } from "react";
import { useStore } from "@/store";
import { X } from "lucide-react";
import * as api from "@/api/client";
import type { TaskPriority, AgentType, CreateTaskPayload } from "@/types";

export function CreateTaskModal() {
  const open = useStore((s) => s.createModalOpen);
  const setOpen = useStore((s) => s.setCreateModalOpen);
  const currentProject = useStore((s) => s.currentProject);
  const upsertTask = useStore((s) => s.upsertTask);
  const loadCalendarTasks = useStore((s) => s.loadCalendarTasks);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [agentType, setAgentType] = useState<AgentType>("codex");
  const [scheduledAt, setScheduledAt] = useState("");
  const [dependsOn, setDependsOn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAgentType("codex");
    setScheduledAt("");
    setDependsOn("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !currentProject) return;
    setSubmitting(true);
    try {
      const payload: CreateTaskPayload = {
        title: title.trim(),
        description,
        priority,
        agent_type: agentType,
        project_id: currentProject.id,
        scheduled_at: scheduledAt || undefined,
        depends_on: dependsOn
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      };
      const task = await api.createTask(payload);
      upsertTask(task);
      loadCalendarTasks();
      reset();
      setOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">New Task</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600"
                placeholder="Implement feature X..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600"
                placeholder="Markdown supported..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-600"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Agent Type
                </label>
                <select
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value as AgentType)}
                  className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-600"
                >
                  <option value="codex">Codex</option>
                  <option value="claude">Claude</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Scheduled At
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Depends On (task IDs)
              </label>
              <input
                value={dependsOn}
                onChange={(e) => setDependsOn(e.target.value)}
                className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-600"
                placeholder="task-1, task-2"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {submitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
