/**
 * [INPUT]: 依赖浏览器 fetch 与 web/src/types 的 API 契约类型定义。
 * [OUTPUT]: 对外提供统一 REST client，包括 Prompt-to-Task 解析/创建接口。
 * [POS]: web 数据访问层，屏蔽请求细节供 store 与组件直接调用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

// Agents
export const fetchAgents = (projectId?: string) =>
  request<import("@/types").Agent[]>(withQuery("/agents", { project_id: projectId }));
export const fetchAgent = (id: string) => request<import("@/types").Agent>(`/agents/${id}`);
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
export const fetchTasks = (params?: Record<string, string>) =>
  request<import("@/types").Task[]>(withQuery("/tasks", params ?? {}));
export const fetchTask = (id: string) => request<import("@/types").Task>(`/tasks/${id}`);
export const createTask = (data: import("@/types").CreateTaskPayload) =>
  request<import("@/types").Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const parseTaskFromPrompt = (data: import("@/types").PromptTaskFromPromptPayload) =>
  request<import("@/types").PromptTaskFromPromptResponse>("/tasks/from-prompt", {
    method: "POST",
    body: JSON.stringify({ ...data, dry_run: true }),
  });
export const createTaskFromPrompt = (data: import("@/types").PromptTaskFromPromptPayload) =>
  request<import("@/types").PromptTaskFromPromptResponse>("/tasks/from-prompt", {
    method: "POST",
    body: JSON.stringify({ ...data, dry_run: false }),
  });
export const updateTask = (id: string, data: Partial<import("@/types").Task>) =>
  request<import("@/types").Task>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteTask = (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" });
export const spawnTask = (id: string) =>
  request<{ task: import("@/types").Task }>(`/tasks/${id}/spawn`, { method: "POST" }).then(
    (result) => result.task,
  );
export const redirectTask = (id: string, message: string) =>
  request<{ ok: boolean }>(`/tasks/${id}/redirect`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
export const killTask = (id: string) =>
  request<{ task: import("@/types").Task }>(`/tasks/${id}/kill`, { method: "POST" }).then(
    (result) => result.task,
  );
export const retryTask = (id: string) => request<import("@/types").Task>(`/tasks/${id}/retry`, { method: "POST" });

// Calendar
export const fetchWeekly = (date: string, projectId?: string) =>
  request<{ tasks: import("@/types").Task[] }>(
    withQuery("/calendar/weekly", { date, project_id: projectId }),
  ).then((result) => result.tasks);
export const fetchMonthly = (date: string, projectId?: string) =>
  request<{ tasks: import("@/types").Task[] }>(
    withQuery("/calendar/monthly", { date, project_id: projectId }),
  ).then((result) => result.tasks);
export const fetchDaily = (date: string, projectId?: string) =>
  request<{ tasks: import("@/types").Task[] }>(
    withQuery("/calendar/daily", { date, project_id: projectId }),
  ).then((result) => result.tasks);

// System
export const fetchSystemStatus = () => request<import("@/types").SystemStatus>("/system/status");
export const fetchSystemStats = () => request<import("@/types").SystemStats>("/system/stats");

// Projects
export const fetchProjects = () => request<import("@/types").Project[]>("/projects");
export const createProject = (data: { name: string; description?: string }) =>
  request<import("@/types").Project>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateProject = (id: string, data: Partial<import("@/types").Project>) =>
  request<import("@/types").Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const deleteProject = (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" });

// Project Members / Agents
export const fetchProjectMembers = (projectId: string) =>
  request<import("@/types").ProjectMember[]>(`/projects/${projectId}/members`);
export const fetchProjectAgents = (projectId: string) =>
  request<import("@/types").Agent[]>(`/projects/${projectId}/agents`);

// Activities
export const fetchActivities = (projectId: string) =>
  request<import("@/types").Activity[]>(`/projects/${projectId}/activities`);

// API Keys
export const fetchApiKeys = (projectId: string) =>
  request<import("@/types").ApiKey[]>(`/projects/${projectId}/keys`);
export const createApiKey = (projectId: string, label: string, expires_at?: string) =>
  request<import("@/types").ApiKey>(`/projects/${projectId}/keys`, {
    method: "POST",
    body: JSON.stringify({ label, expires_at }),
  });
export const createAuthToken = (projectId: string, label: string, expires_at?: string) =>
  request<import("@/types").ApiKey>("/auth/token", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, label, expires_at }),
  });
export const deleteApiKey = (projectId: string, keyId: string) =>
  request<void>(`/projects/${projectId}/keys/${keyId}`, { method: "DELETE" });

// Webhooks
export const fetchWebhooks = (projectId: string) =>
  request<import("@/types").Webhook[]>(withQuery("/webhooks", { project_id: projectId }));
export const createWebhook = (projectId: string, data: { url: string; events: string[]; active?: boolean }) =>
  request<import("@/types").Webhook>("/webhooks", {
    method: "POST",
    body: JSON.stringify({ ...data, project_id: projectId }),
  });
export const updateWebhook = (webhookId: string, data: Partial<import("@/types").Webhook>) =>
  request<import("@/types").Webhook>(`/webhooks/${webhookId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const deleteWebhook = (webhookId: string) => request<void>(`/webhooks/${webhookId}`, { method: "DELETE" });
