import { create } from "zustand";
import type { Task, Agent, CalendarView, Project, Activity } from "@/types";
import * as api from "@/api/client";
import { format, startOfWeek, startOfMonth } from "date-fns";

interface AppState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Projects
  projects: Project[];
  currentProject: Project | null;
  loadProjects: () => Promise<void>;
  setCurrentProject: (p: Project) => void;

  // Activities
  activities: Activity[];
  loadActivities: () => Promise<void>;
  activityPanelOpen: boolean;
  setActivityPanelOpen: (open: boolean) => void;

  // Calendar
  calendarView: CalendarView;
  setCalendarView: (v: CalendarView) => void;
  calendarDate: Date;
  setCalendarDate: (d: Date) => void;
  calendarTasks: Task[];
  loadCalendarTasks: () => Promise<void>;

  // Tasks
  tasks: Task[];
  loadTasks: (params?: Record<string, string>) => Promise<void>;
  selectedTask: Task | null;
  setSelectedTask: (t: Task | null) => void;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;

  // Create modal
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Agents
  agents: Agent[];
  loadAgents: () => Promise<void>;

  // Upsert helpers for WS
  upsertTask: (t: Task) => void;
  upsertAgent: (a: Agent) => void;
}

export const useStore = create<AppState>((set, get) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  darkMode:
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  toggleDarkMode: () => {
    set((s) => {
      const next = !s.darkMode;
      document.documentElement.classList.toggle("dark", next);
      return { darkMode: next };
    });
  },

  projects: [],
  currentProject: null,
  loadProjects: async () => {
    try {
      const projects = await api.fetchProjects();
      set({ projects, currentProject: projects[0] || null });
    } catch {
      set({ projects: [], currentProject: null });
    }
  },
  setCurrentProject: (p) => set({ currentProject: p }),

  activities: [],
  loadActivities: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const activities = await api.fetchActivities(currentProject.id);
      set({ activities });
    } catch {
      set({ activities: [] });
    }
  },
  activityPanelOpen: false,
  setActivityPanelOpen: (open) => set({ activityPanelOpen: open }),

  calendarView: "week",
  setCalendarView: (v) => set({ calendarView: v }),
  calendarDate: new Date(),
  setCalendarDate: (d) => set({ calendarDate: d }),
  calendarTasks: [],
  loadCalendarTasks: async () => {
    const { calendarView, calendarDate } = get();
    try {
      let tasks: Task[];
      if (calendarView === "week") {
        const d = format(startOfWeek(calendarDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
        tasks = await api.fetchWeekly(d);
      } else if (calendarView === "month") {
        const d = format(startOfMonth(calendarDate), "yyyy-MM");
        tasks = await api.fetchMonthly(d);
      } else {
        const d = format(calendarDate, "yyyy-MM-dd");
        tasks = await api.fetchDaily(d);
      }
      set({ calendarTasks: tasks });
    } catch {
      set({ calendarTasks: [] });
    }
  },

  tasks: [],
  loadTasks: async (params) => {
    try {
      const tasks = await api.fetchTasks(params);
      set({ tasks });
    } catch {
      set({ tasks: [] });
    }
  },
  selectedTask: null,
  setSelectedTask: (t) => set({ selectedTask: t, detailOpen: !!t }),
  detailOpen: false,
  setDetailOpen: (open) => set({ detailOpen: open, selectedTask: open ? get().selectedTask : null }),

  createModalOpen: false,
  setCreateModalOpen: (open) => set({ createModalOpen: open }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  agents: [],
  loadAgents: async () => {
    try {
      const agents = await api.fetchAgents();
      set({ agents });
    } catch {
      set({ agents: [] });
    }
  },

  upsertTask: (t) =>
    set((s) => {
      const idx = s.calendarTasks.findIndex((x) => x.id === t.id);
      const calendarTasks =
        idx >= 0
          ? s.calendarTasks.map((x) => (x.id === t.id ? t : x))
          : [...s.calendarTasks, t];
      const tasks = s.tasks.map((x) => (x.id === t.id ? t : x));
      const selectedTask =
        s.selectedTask?.id === t.id ? t : s.selectedTask;
      return { calendarTasks, tasks, selectedTask };
    }),
  upsertAgent: (a) =>
    set((s) => {
      const idx = s.agents.findIndex((x) => x.id === a.id);
      const agents =
        idx >= 0
          ? s.agents.map((x) => (x.id === a.id ? a : x))
          : [...s.agents, a];
      return { agents };
    }),
}));
