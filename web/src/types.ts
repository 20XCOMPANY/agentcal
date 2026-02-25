export type AgentType = "codex" | "claude";
export type AgentStatus = "idle" | "busy" | "offline";
export type TaskStatus = "queued" | "running" | "pr_open" | "completed" | "failed" | "archived";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type CIStatus = "pending" | "passing" | "failing" | null;
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Agent {
  id: string;
  project_id: string | null;
  name: string;
  type: AgentType;
  status: AgentStatus;
  emoji?: string;
  avatar_url?: string;
  color?: string;
  settings?: Record<string, unknown>;
  current_task_id: string | null;
  stats: {
    total_tasks: number;
    success_count: number;
    fail_count: number;
    avg_duration_min: number;
  };
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  agent_type: AgentType;
  agent_id: string | null;
  branch: string | null;
  pr_url: string | null;
  pr_number: number | null;
  ci_status: CIStatus;
  reviews: {
    codex: ReviewStatus;
    gemini: ReviewStatus;
    claude: ReviewStatus;
  };
  retry_count: number;
  max_retries: number;
  depends_on: string[];
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_duration_min: number;
  actual_duration_min: number | null;
  tmux_session: string | null;
  worktree_path: string | null;
  log_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemStatus {
  timestamp: string;
  cpu: {
    cores: number;
    load_avg: number[];
  };
  memory: {
    total_mb: number;
    free_mb: number;
    used_mb: number;
    usage_percent: number;
  };
  agents: {
    active: number;
    total: number;
  };
  tasks: {
    running: number;
  };
  process: {
    uptime_sec: number;
    pid: number;
  };
  swarm: {
    stdout: string;
    stderr: string;
  } | null;
}

export interface SystemStats {
  generated_at: string;
  totals: {
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    avg_duration_min: number | null;
    success_rate: number;
  };
  by_status: Array<{ status: string; count: number }>;
  completion_trend_30d: Array<{ date: string; count: number }>;
  agent_utilization: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    total_tasks: number;
    success_count: number;
    fail_count: number;
    avg_duration_min: number;
    running_tasks: number;
  }>;
}

export interface CalendarDay {
  date: string;
  tasks: Task[];
}

export type CalendarView = "day" | "week" | "month";

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  agent_id: string;
  role: "owner" | "member";
  joined_at: string;
}

export interface Activity {
  id: string;
  project_id: string;
  agent_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  agent_name?: string;
  agent_type?: AgentType;
}

export interface ApiKey {
  id: string;
  project_id: string;
  key: string;
  label: string;
  created_at: string;
  expires_at: string | null;
}

export interface Webhook {
  id: string;
  project_id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  priority: TaskPriority;
  agent_type: AgentType;
  project_id?: string;
  scheduled_at?: string | null;
  depends_on?: string[];
}

export interface WSEvent<T = unknown> {
  event: string;
  data: T;
  timestamp: string;
}
