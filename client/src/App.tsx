/**
 * [INPUT]: Depends on react-router route tree, layout shell, pages, and websocket lifecycle hook.
 * [OUTPUT]: Registers application routes and global realtime subscription bootstrap.
 * [POS]: root client composition entry wiring navigation and page surfaces.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useWebSocket } from "@/hooks/useWebSocket";
import { AgentsPage } from "@/pages/AgentsPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";
import { TaskDetailPage } from "@/pages/TaskDetailPage";

export default function App() {
  useWebSocket();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/calendar" replace />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="tasks/:taskId" element={<TaskDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/calendar" replace />} />
    </Routes>
  );
}
