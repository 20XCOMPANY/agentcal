/**
 * [INPUT]: Depends on browser fetch and shared domain types from client/src/types.
 * [OUTPUT]: Exposes typed wrappers for agents/tasks/calendar/system REST endpoints.
 * [POS]: client network boundary that normalizes request/response handling for stores and pages.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import type {
  Agent,
  CalendarDailyResponse,
  CalendarMonthlyResponse,
  CalendarWeeklyResponse,
  PromptTaskFromPromptResponse,
  QueueStatus,
  SystemConfig,
  SystemStats,
  SystemStatus,
  Task,
} from "@/types";

const API_BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`API ${response.status}: ${payload || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, value);
    }
  }
  const suffix = params.toString();
  return suffix.length > 0 ? `${path}?${suffix}` : path;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: Task["status"];
  priority?: Task["priority"];
  agent_type?: Task["agent_type"];
  agent_id?: string | null;
  scheduled_at?: string | null;
  estimated_duration_min?: number;
  depends_on?: string[];
}

export type UpdateTaskPayload = Partial<Omit<Task, "id" | "project_id" | "created_at" | "updated_at">>;

export async function fetchAgents(projectId?: string): Promise<Agent[]> {
  return request<Agent[]>(withQuery("/agents", { project_id: projectId }));
}

export async function fetchAgent(id: string): Promise<Agent> {
  return request<Agent>(`/agents/${id}`);
}

export async function createAgent(payload: Partial<Agent>): Promise<Agent> {
  return request<Agent>("/agents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAgent(id: string, payload: Partial<Agent>): Promise<Agent> {
  return request<Agent>(`/agents/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAgent(id: string): Promise<void> {
  await request<void>(`/agents/${id}`, { method: "DELETE" });
}

export async function fetchTasks(params?: Record<string, string>): Promise<Task[]> {
  return request<Task[]>(withQuery("/tasks", params ?? {}));
}

export async function fetchTask(id: string): Promise<Task> {
  return request<Task>(`/tasks/${id}`);
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await request<void>(`/tasks/${id}`, { method: "DELETE" });
}

export async function spawnTask(id: string): Promise<Task> {
  const response = await request<{ task: Task }>(`/tasks/${id}/spawn`, {
    method: "POST",
  });
  return response.task;
}

export async function redirectTask(id: string, message: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/tasks/${id}/redirect`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function killTask(id: string): Promise<Task> {
  const response = await request<{ task: Task }>(`/tasks/${id}/kill`, {
    method: "POST",
  });
  return response.task;
}

export async function retryTask(id: string): Promise<Task> {
  return request<Task>(`/tasks/${id}/retry`, {
    method: "POST",
  });
}

export async function parseTaskFromPrompt(prompt: string): Promise<PromptTaskFromPromptResponse> {
  return request<PromptTaskFromPromptResponse>("/tasks/from-prompt", {
    method: "POST",
    body: JSON.stringify({ prompt, dry_run: true }),
  });
}

export async function createTaskFromPrompt(prompt: string): Promise<PromptTaskFromPromptResponse> {
  return request<PromptTaskFromPromptResponse>("/tasks/from-prompt", {
    method: "POST",
    body: JSON.stringify({ prompt, dry_run: false }),
  });
}

export async function fetchCalendarDay(date: string): Promise<CalendarDailyResponse> {
  return request<CalendarDailyResponse>(withQuery("/calendar/daily", { date }));
}

export async function fetchCalendarWeek(date: string): Promise<CalendarWeeklyResponse> {
  return request<CalendarWeeklyResponse>(withQuery("/calendar/weekly", { date }));
}

export async function fetchCalendarMonth(date: string): Promise<CalendarMonthlyResponse> {
  return request<CalendarMonthlyResponse>(withQuery("/calendar/monthly", { date }));
}

export async function fetchSystemStats(): Promise<SystemStats> {
  return request<SystemStats>("/system/stats");
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  return request<SystemStatus>("/system/status");
}

export async function fetchSystemQueue(): Promise<QueueStatus> {
  return request<QueueStatus>("/system/queue");
}

export async function fetchSystemConfig(): Promise<SystemConfig> {
  return request<SystemConfig>("/system/config");
}

export async function updateSystemConfig(payload: Partial<SystemConfig>): Promise<SystemConfig> {
  return request<SystemConfig>("/system/config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function triggerSystemSync(): Promise<{ synced_at: string }> {
  return request<{ synced_at: string }>("/system/sync", {
    method: "POST",
  });
}
