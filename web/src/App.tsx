import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "@/store";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Sidebar } from "@/components/Sidebar";
import { CalendarPage } from "@/pages/CalendarPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { StatsPage } from "@/pages/StatsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ApiKeysPage } from "@/pages/ApiKeysPage";
import { WebhooksPage } from "@/pages/WebhooksPage";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { ActivityPanel } from "@/components/ActivityPanel";
import { CommandPalette } from "@/components/CommandPalette";

export default function App() {
  const darkMode = useStore((s) => s.darkMode);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const loadProjects = useStore((s) => s.loadProjects);
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen);
  const setCreateModalOpen = useStore((s) => s.setCreateModalOpen);

  useWebSocket();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // cmd+L or ctrl+L for quick new task
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault();
        setCreateModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCreateModalOpen]);

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main
          className={`flex-1 overflow-y-auto transition-all duration-200 ${
            sidebarOpen ? "ml-56" : "ml-16"
          }`}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/api-keys" element={<ApiKeysPage />} />
            <Route path="/webhooks" element={<WebhooksPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <TaskDetailPanel />
        <CreateTaskModal />
        <ActivityPanel />
        <CommandPalette />
      </div>
    </BrowserRouter>
  );
}
