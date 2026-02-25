import { useEffect } from "react";
import { useStore } from "@/store";
import { X, Activity as ActivityIcon } from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";

const activityIcons: Record<string, string> = {
  task_created: "📝",
  task_completed: "✅",
  task_failed: "❌",
  agent_assigned: "🤖",
  pr_opened: "🔀",
  pr_merged: "✨",
};

export function ActivityPanel() {
  const open = useStore((s) => s.activityPanelOpen);
  const setOpen = useStore((s) => s.setActivityPanelOpen);
  const activities = useStore((s) => s.activities);
  const loadActivities = useStore((s) => s.loadActivities);
  const currentProject = useStore((s) => s.currentProject);

  useEffect(() => {
    if (open && currentProject) {
      loadActivities();
      // Poll every 30 seconds
      const interval = setInterval(loadActivities, 30000);
      return () => clearInterval(interval);
    }
  }, [open, currentProject, loadActivities]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <aside
        className={clsx(
          "fixed inset-y-0 right-0 z-50 w-80 border-l border-neutral-200 bg-white shadow-xl transition-transform dark:border-neutral-800 dark:bg-neutral-900",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <ActivityIcon size={18} />
            <h2 className="font-semibold">Activity</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Activity list */}
        <div className="overflow-y-auto" style={{ height: "calc(100vh - 3.5rem)" }}>
          {activities.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <p className="text-sm text-neutral-500">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 text-xl">
                      {activityIcons[activity.type] || "📌"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.title}</p>
                      {activity.description && (
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                          {activity.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-neutral-500">
                        {format(new Date(activity.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
