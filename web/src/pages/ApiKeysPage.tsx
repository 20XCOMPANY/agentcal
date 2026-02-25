import { useEffect, useState } from "react";
import { useStore } from "@/store";
import * as api from "@/api/client";
import { Plus, Trash2, Copy } from "lucide-react";
import { format } from "date-fns";
import type { ApiKey } from "@/types";

export function ApiKeysPage() {
  const currentProject = useStore((s) => s.currentProject);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    if (currentProject) {
      void loadKeys();
    }
  }, [currentProject]);

  const loadKeys = async () => {
    if (!currentProject) return;
    try {
      const data = await api.fetchApiKeys(currentProject.id);
      setKeys(data);
    } catch (err) {
      console.error("Failed to load API keys:", err);
    }
  };

  const handleCreate = async () => {
    if (!currentProject || !label.trim()) return;
    setLoading(true);
    try {
      const result = await api.createApiKey(currentProject.id, label.trim());
      setNewKey(result.key);
      await loadKeys();
      setLabel("");
    } catch (err) {
      console.error("Failed to create API key:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!currentProject) return;
    if (!confirm("Delete this API key? This cannot be undone.")) return;
    try {
      await api.deleteApiKey(currentProject.id, keyId);
      await loadKeys();
    } catch (err) {
      console.error("Failed to delete API key:", err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
          <h1 className="text-2xl font-semibold">API Keys</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Manage API keys for {currentProject.name}
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <Plus size={16} />
          New API Key
        </button>
      </div>

      <div className="space-y-3">
        {keys.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-medium">{key.label || "Untitled Key"}</h3>
                <code className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono dark:bg-neutral-700">
                  {key.key}
                </code>
              </div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Created {format(new Date(key.created_at), "MMM d, yyyy")}
                {key.expires_at && <> · Expires {format(new Date(key.expires_at), "MMM d, yyyy")}</>}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(key.key)}
                className="rounded p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                title="Copy"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => handleDelete(key.id)}
                className="rounded p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {keys.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-600">
            <p className="text-sm text-neutral-500">No API keys yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
            <h2 className="mb-4 text-lg font-semibold">Create API Key</h2>
            {newKey ? (
              <div className="space-y-4">
                <div className="rounded bg-yellow-50 p-3 dark:bg-yellow-900/20">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Save this key now. You won&apos;t be able to see it again.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Your API Key</label>
                  <div className="flex gap-2">
                    <code className="flex-1 rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-mono dark:border-neutral-600 dark:bg-neutral-700">
                      {newKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newKey)}
                      className="rounded border border-neutral-300 px-3 py-2 hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-700"
                      title="Copy"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCreateModalOpen(false);
                    setNewKey(null);
                  }}
                  className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Key Label</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
                    placeholder="Production API Key"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setCreateModalOpen(false);
                      setLabel("");
                    }}
                    className="rounded px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={loading || !label.trim()}
                    className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
