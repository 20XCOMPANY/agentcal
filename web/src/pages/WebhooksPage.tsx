import { useEffect, useState } from "react";
import { useStore } from "@/store";
import * as api from "@/api/client";
import { Plus, Trash2, Edit2, Power } from "lucide-react";
import { format } from "date-fns";
import type { Webhook } from "@/types";

const AVAILABLE_EVENTS = [
  "task.created",
  "task.started",
  "task.completed",
  "task.failed",
  "agent.assigned",
  "pr.opened",
  "pr.merged",
  "ci.passed",
  "ci.failed",
];

export function WebhooksPage() {
  const currentProject = useStore((s) => s.currentProject);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadWebhooks();
    }
  }, [currentProject]);

  const loadWebhooks = async () => {
    if (!currentProject) return;
    try {
      const data = await api.fetchWebhooks(currentProject.id);
      setWebhooks(data);
    } catch (err) {
      console.error("Failed to load webhooks:", err);
    }
  };

  const handleCreate = async () => {
    if (!currentProject || !name.trim() || !url.trim() || selectedEvents.length === 0) return;
    setLoading(true);
    try {
      await api.createWebhook(currentProject.id, { name, url, events: selectedEvents });
      await loadWebhooks();
      closeModal();
    } catch (err) {
      console.error("Failed to create webhook:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!currentProject || !editingWebhook || !name.trim() || !url.trim()) return;
    setLoading(true);
    try {
      await api.updateWebhook(currentProject.id, editingWebhook.id, { name, url, events: selectedEvents });
      await loadWebhooks();
      closeModal();
    } catch (err) {
      console.error("Failed to update webhook:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    if (!currentProject) return;
    try {
      await api.updateWebhook(currentProject.id, webhook.id, { active: !webhook.active });
      await loadWebhooks();
    } catch (err) {
      console.error("Failed to toggle webhook:", err);
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!currentProject) return;
    if (!confirm("Delete this webhook? This cannot be undone.")) return;
    try {
      await api.deleteWebhook(currentProject.id, webhookId);
      await loadWebhooks();
    } catch (err) {
      console.error("Failed to delete webhook:", err);
    }
  };

  const openEditModal = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setName(webhook.name);
    setUrl(webhook.url);
    setSelectedEvents(webhook.events);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingWebhook(null);
    setName("");
    setUrl("");
    setSelectedEvents([]);
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-neutral-500">No project selected</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Webhooks</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Configure webhooks for {currentProject.name}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <Plus size={16} />
          New Webhook
        </button>
      </div>

      <div className="space-y-3">
        {webhooks.map((webhook) => (
          <div
            key={webhook.id}
            className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">{webhook.name}</h3>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      webhook.active
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {webhook.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <code className="mt-1 block text-xs text-neutral-600 dark:text-neutral-400">
                  {webhook.url}
                </code>
                <div className="mt-2 flex flex-wrap gap-1">
                  {webhook.events.map((event) => (
                    <span
                      key={event}
                      className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    >
                      {event}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Created {format(new Date(webhook.created_at), "MMM d, yyyy")}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleActive(webhook)}
                  className="rounded p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                  title={webhook.active ? "Deactivate" : "Activate"}
                >
                  <Power size={16} />
                </button>
                <button
                  onClick={() => openEditModal(webhook)}
                  className="rounded p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(webhook.id)}
                  className="rounded p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {webhooks.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-600">
            <p className="text-sm text-neutral-500">No webhooks yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
            <h2 className="mb-4 text-lg font-semibold">
              {editingWebhook ? "Edit Webhook" : "Create Webhook"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
                  placeholder="Production Webhook"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <label
                      key={event}
                      className="flex items-center gap-2 rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="rounded"
                      />
                      <span className="text-xs">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={editingWebhook ? handleUpdate : handleCreate}
                disabled={loading || !name.trim() || !url.trim() || selectedEvents.length === 0}
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {loading ? "Saving..." : editingWebhook ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
