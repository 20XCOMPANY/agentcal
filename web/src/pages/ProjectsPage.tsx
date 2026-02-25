import { useEffect, useState } from "react";
import { useStore } from "@/store";
import * as api from "@/api/client";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import type { Project } from "@/types";

export function ProjectsPage() {
  const projects = useStore((s) => s.projects);
  const loadProjects = useStore((s) => s.loadProjects);
  const currentProject = useStore((s) => s.currentProject);
  const setCurrentProject = useStore((s) => s.setCurrentProject);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.createProject({ name, description: description || undefined });
      await loadProjects();
      setCreateModalOpen(false);
      setName("");
      setDescription("");
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingProject || !name.trim()) return;
    setLoading(true);
    try {
      await api.updateProject(editingProject.id, { name, description });
      await loadProjects();
      setEditingProject(null);
      setName("");
      setDescription("");
    } catch (err) {
      console.error("Failed to update project:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await api.deleteProject(id);
      await loadProjects();
      if (currentProject?.id === id) {
        setCurrentProject(projects[0] || null);
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || "");
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Manage your projects and switch between them
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium">{project.name}</h3>
                {project.description && (
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {project.description}
                  </p>
                )}
              </div>
              {currentProject?.id === project.id && (
                <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Active
                </span>
              )}
            </div>
            <div className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
              Created {format(new Date(project.created_at), "MMM d, yyyy")}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEditModal(project)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button
                onClick={() => handleDelete(project.id)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(createModalOpen || editingProject) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
            <h2 className="mb-4 text-lg font-semibold">
              {editingProject ? "Edit Project" : "Create Project"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
                  placeholder="My Project"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
                  placeholder="Project description..."
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setEditingProject(null);
                  setName("");
                  setDescription("");
                }}
                className="rounded px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={editingProject ? handleUpdate : handleCreate}
                disabled={loading || !name.trim()}
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {loading ? "Saving..." : editingProject ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
