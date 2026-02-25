const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export const api = {
  agents: {
    list: () => request<import("@/types").Agent[]>("/agents"),
    get: (id: string) => request<import("@/types").Agent>(`/agents/${id}`),
    create: (data: { name: string; type: string }) =>
      request<import("@/types").Agent>("/agents", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import("@/types").Agent>) =>
      request<import("@/types").Agent>(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/agents/${id}`, { method: "DELETE" }),
  },
  tasks: {
    list: (filters?: { status?: string; date?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.date) params.set("date", filters.date);
      const qs = params.toString();
      return request<import("@/types").Task[]>(`/tasks${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<import("@/types").Task>(`/tasks/${id}`),
    create: (data: Partial<import("@/types").Task>) =>
      request<import("@/types").Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import("@/types").Task>) =>
      request<import("@/types").Task>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
    spawn: (id: string) => request<import("@/types").Task>(`/tasks/${id}/spawn`, { method: "POST" }),
    redirect: (id: string, message: string) =>
      request<import("@/types").Task>(`/tasks/${id}/redirect`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    kill: (id: string) => request<import("@/types").Task>(`/tasks/${id}/kill`, { method: "POST" }),
    retry: (id: string) => request<import("@/types").Task>(`/tasks/${id}/retry`, { method: "POST" }),
  },
  calendar: {
    daily: (date: string) => request<import("@/types").CalendarDay>(`/calendar/daily?date=${date}`),
    weekly: (date: string) => request<import("@/types").CalendarDay[]>(`/calendar/weekly?date=${date}`),
    monthly: (month: string) => request<import("@/types").CalendarDay[]>(`/calendar/monthly?date=${month}`),
  },
  system: {
    status: () => request<import("@/types").SystemStatus>("/system/status"),
    stats: () => request<import("@/types").SystemStats>("/system/stats"),
    sync: () => request<unknown>("/system/sync", { method: "POST" }),
  },
};
