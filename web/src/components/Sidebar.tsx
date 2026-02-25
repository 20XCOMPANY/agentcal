import { NavLink } from "react-router-dom";
import { useStore } from "@/store";
import { useState, useEffect } from "react";
import {
  Calendar,
  Bot,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  Plus,
  FolderKanban,
  Key,
  Webhook,
  Activity,
  ChevronDown,
  Check,
} from "lucide-react";
import clsx from "clsx";

const links = [
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/api-keys", label: "API Keys", icon: Key },
  { to: "/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const open = useStore((s) => s.sidebarOpen);
  const toggle = useStore((s) => s.toggleSidebar);
  const darkMode = useStore((s) => s.darkMode);
  const toggleDark = useStore((s) => s.toggleDarkMode);
  const setCreateModalOpen = useStore((s) => s.setCreateModalOpen);
  const activityPanelOpen = useStore((s) => s.activityPanelOpen);
  const setActivityPanelOpen = useStore((s) => s.setActivityPanelOpen);
  
  const projects = useStore((s) => s.projects);
  const currentProject = useStore((s) => s.currentProject);
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const loadProjects = useStore((s) => s.loadProjects);

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-neutral-200 bg-sidebar transition-all duration-200 dark:border-neutral-800 dark:bg-sidebar-dark",
        open ? "w-56" : "w-16"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4">
        {open && (
          <span className="text-sm font-semibold tracking-tight">
            AgentCal
          </span>
        )}
        <button
          onClick={toggle}
          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          aria-label="Toggle sidebar"
        >
          {open ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>
      </div>

      {/* Project Selector */}
      {open && currentProject && (
        <div className="relative px-3 pb-3">
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="flex w-full items-center justify-between rounded border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <span className="truncate font-medium">{currentProject.name}</span>
            <ChevronDown size={16} className="ml-2 flex-shrink-0" />
          </button>
          
          {projectDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setProjectDropdownOpen(false)}
              />
              <div className="absolute left-3 right-3 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setCurrentProject(project);
                      setProjectDropdownOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  >
                    <span className="truncate">{project.name}</span>
                    {project.id === currentProject.id && (
                      <Check size={16} className="ml-2 flex-shrink-0 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* New task */}
      <div className="px-3 pb-2">
        <button
          onClick={() => setCreateModalOpen(true)}
          className={clsx(
            "flex w-full items-center gap-2 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200",
            !open && "justify-center px-0"
          )}
        >
          <Plus size={16} />
          {open && "New Task"}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-neutral-200/70 font-medium text-neutral-900 dark:bg-neutral-700/50 dark:text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
                !open && "justify-center px-0"
              )
            }
          >
            <Icon size={18} />
            {open && label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        {/* Activity toggle */}
        {open && (
          <button
            onClick={() => setActivityPanelOpen(!activityPanelOpen)}
            className="mb-2 flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Activity size={18} />
            Activity
          </button>
        )}
        
        <button
          onClick={toggleDark}
          className={clsx(
            "flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
            !open && "justify-center px-0"
          )}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {open && (darkMode ? "Light mode" : "Dark mode")}
        </button>
      </div>
    </aside>
  );
}
