const BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// Agents
export const fetchAgents = () => request<import("@/types").Agent[]>("/agents");
export const fetchAgent = (id: string) =>
  request<import("@/types").Agent>(`/agents/${id}`);
export const createAgent = (data: Partial<import("@/types").Agent>) =>
  request<import("@/types").Agent>("/agents", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateAgent = (id: string, data: Partial<import("@/types").Agent>) =>
  request<import("@/types").Agent>(`/agents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Tasks
export const fetchTasks = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<import("@/types").Task[]>(`/tasks${qs}`);
};
export const fetchTask = (id: string) =>
  request<import("@/types").Task>(`/tasks/${id}`);
export const createTask = (data: import("@/types").CreateTaskPayload) =>
  request<import("@/types").Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateTask = (id: string, data: Partial<import("@/types").Task>) =>
  request<import("@/types").Task>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteTask = (id: string) =>
  request<void>(`/tasks/${id}`, { method: "DELETE" });

// Task actions
export const spawnTask = (id: string) =>
  request<import("@/types").Task>(`/tasks/${id}/spawn`, { method: "POST" });
export const redirectTask = (id: string, message: string) =>
  request<import("@/types").Task>(`/tasks/${id}/redirect`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
export const killTask = (id: string) =>
  request<import("@/types").Task>(`/tasks/${id}/kill`, { method: "POST" });
export const retryTask = (id: string) =>
  request<import("@/types").Task>(`/tasks/${id}/retry`, { method: "POST" });

// Calendar
export const fetchWeekly = (date: string) =>
  request<{ tasks: import("@/types").Task[] }>(`/calendar/weekly?date=${date}`).then(r => r.tasks);
export const fetchMonthly = (date: string) =>
  request<{ tasks: import("@/types").Task[] }>(`/calendar/monthly?date=${date}`).then(r => r.tasks);
export const fetchDaily = (date: string) =>
  request<{ tasks: import("@/types").Task[] }>(`/calendar/daily?date=${date}`).then(r => r.tasks);

// System
export const fetchSystemStatus = () =>
  request<import("@/types").SystemStatus>("/system/status");
export const fetchSystemStats = () =>
  request<import("@/types").SystemStats>("/system/stats");

// Projects
export const fetchProjects = () =>
  request<import("@/types").Project[]>("/projects");
export const createProject = (data: { name: string; description?: string }) =>
  request<import("@/types").Project>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateProject = (id: string, data: Partial<import("@/types").Project>) =>
  request<import("@/types").Project>(`/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteProject = (id: string) =>
  request<void>(`/projects/${id}`, { method: "DELETE" });

// Project Members
export const fetchProjectMembers = (projectId: string) =>
  request<import("@/types").ProjectMember[]>(`/projects/${projectId}/members`);

// Activities
export const fetchActivities = (projectId: string) =>
  request<import("@/types").Activity[]>(`/projects/${projectId}/activities`);

// API Keys
export const fetchApiKeys = (projectId: string) =>
  request<import("@/types").ApiKey[]>(`/projects/${projectId}/keys`);
export const createApiKey = (projectId: string, name: string) =>
  request<import("@/types").ApiKey>(`/projects/${projectId}/keys`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const deleteApiKey = (projectId: string, keyId: string) =>
  request<void>(`/projects/${projectId}/keys/${keyId}`, { method: "DELETE" });

// Webhooks
export const fetchWebhooks = (projectId: string) =>
  request<import("@/types").Webhook[]>(`/projects/${projectId}/webhooks`);
export const createWebhook = (projectId: string, data: { name: string; url: string; events: string[] }) =>
  request<import("@/types").Webhook>(`/projects/${projectId}/webhooks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateWebhook = (projectId: string, webhookId: string, data: Partial<import("@/types").Webhook>) =>
  request<import("@/types").Webhook>(`/projects/${projectId}/webhooks/${webhookId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteWebhook = (projectId: string, webhookId: string) =>
  request<void>(`/projects/${projectId}/webhooks/${webhookId}`, { method: "DELETE" });
