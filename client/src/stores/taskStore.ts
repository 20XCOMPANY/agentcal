/**
 * [INPUT]: Depends on Zustand state container and task/calendar endpoints from api client.
 * [OUTPUT]: Exposes task collections, selected task state, and live log mutations.
 * [POS]: client task source of truth coordinating calendar data and detail page data.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { create } from "zustand";
import type { CalendarView, Task } from "@/types";
import {
  fetchCalendarDay,
  fetchCalendarMonth,
  fetchCalendarWeek,
  fetchTask,
  fetchTasks,
} from "@/api/client";

interface TaskStoreState {
  tasks: Task[];
  calendarTasks: Task[];
  selectedTaskId: string | null;
  logsByTaskId: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
  loadTasks: (params?: Record<string, string>) => Promise<void>;
  loadCalendarTasks: (view: CalendarView, date: string) => Promise<void>;
  loadTaskById: (taskId: string) => Promise<Task | null>;
  setSelectedTaskId: (taskId: string | null) => void;
  upsertTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  appendLog: (taskId: string, line: string) => void;
  clearLogs: (taskId: string) => void;
  getTaskById: (taskId: string | null) => Task | null;
}

function upsert(tasks: Task[], task: Task): Task[] {
  const index = tasks.findIndex((candidate) => candidate.id === task.id);
  if (index === -1) return [task, ...tasks];
  const next = [...tasks];
  next[index] = task;
  return next;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  calendarTasks: [],
  selectedTaskId: null,
  logsByTaskId: {},
  isLoading: false,
  error: null,
  async loadTasks(params) {
    set({ isLoading: true, error: null });
    try {
      const tasks = await fetchTasks(params);
      set({ tasks, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load tasks",
      });
    }
  },
  async loadCalendarTasks(view, date) {
    set({ isLoading: true, error: null });
    try {
      const response =
        view === "day"
          ? await fetchCalendarDay(date)
          : view === "week"
            ? await fetchCalendarWeek(date)
            : await fetchCalendarMonth(date);
      set({ calendarTasks: response.tasks, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load calendar tasks",
      });
    }
  },
  async loadTaskById(taskId) {
    try {
      const task = await fetchTask(taskId);
      set((state) => ({
        tasks: upsert(state.tasks, task),
        calendarTasks: upsert(state.calendarTasks, task),
      }));
      return task;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load task" });
      return null;
    }
  },
  setSelectedTaskId(taskId) {
    set({ selectedTaskId: taskId });
  },
  upsertTask(task) {
    set((state) => ({
      tasks: upsert(state.tasks, task),
      calendarTasks: upsert(state.calendarTasks, task),
    }));
  },
  removeTask(taskId) {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
      calendarTasks: state.calendarTasks.filter((task) => task.id !== taskId),
      selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
    }));
  },
  appendLog(taskId, line) {
    set((state) => {
      const current = state.logsByTaskId[taskId] ?? [];
      return {
        logsByTaskId: {
          ...state.logsByTaskId,
          [taskId]: [...current, line].slice(-1000),
        },
      };
    });
  },
  clearLogs(taskId) {
    set((state) => {
      const next = { ...state.logsByTaskId };
      delete next[taskId];
      return { logsByTaskId: next };
    });
  },
  getTaskById(taskId) {
    if (!taskId) return null;
    return (
      get().tasks.find((task) => task.id === taskId) ??
      get().calendarTasks.find((task) => task.id === taskId) ??
      null
    );
  },
}));
