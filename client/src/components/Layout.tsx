/**
 * [INPUT]: Depends on sidebar component, local UI preferences, and router outlet composition.
 * [OUTPUT]: Renders app shell with collapsible navigation and dark-mode class management.
 * [POS]: top-level layout wrapper for every routed page in the client application.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { Outlet } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";

function getStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    return value === "true";
  } catch {
    return fallback;
  }
}

export function Layout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => getStoredBoolean("agentcal.sidebar.collapsed", false));
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const fromStorage = getStoredBoolean("agentcal.theme.dark", false);
    if (fromStorage) return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("agentcal.theme.dark", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    window.localStorage.setItem("agentcal.sidebar.collapsed", String(collapsed));
  }, [collapsed]);

  const mainOffset = useMemo(() => (collapsed ? "ml-20" : "ml-64"), [collapsed]);

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar
        collapsed={collapsed}
        darkMode={darkMode}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onToggleTheme={() => setDarkMode((value) => !value)}
      />
      <main className={`${mainOffset} min-h-screen px-6 py-6`}>
        <Outlet />
      </main>
    </div>
  );
}
