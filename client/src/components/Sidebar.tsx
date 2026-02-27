/**
 * [INPUT]: Depends on router navigation, shell collapse state, and theme toggle actions.
 * [OUTPUT]: Renders collapsible left navigation for Calendar, Agents, Stats, and Settings.
 * [POS]: primary navigation rail for the AgentCal frontend shell.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { NavLink } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { to: "/calendar", label: "Calendar", icon: "🗓" },
  { to: "/agents", label: "Agents", icon: "🤖" },
  { to: "/stats", label: "Stats", icon: "📊" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

interface SidebarProps {
  collapsed: boolean;
  darkMode: boolean;
  onToggleCollapsed: () => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  collapsed,
  darkMode,
  onToggleCollapsed,
  onToggleTheme,
}: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 ${collapsed ? "w-20" : "w-64"}`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
        {!collapsed ? (
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">AgentCal</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Control Surface</p>
          </div>
        ) : (
          <p className="w-full text-center text-sm font-semibold text-slate-900 dark:text-slate-100">A</p>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          aria-label="Toggle sidebar"
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
              } ${collapsed ? "justify-center" : ""}`
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <ThemeToggle darkMode={darkMode} onToggle={onToggleTheme} />
      </div>
    </aside>
  );
}
