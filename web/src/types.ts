export type AgentType = "codex" | "claude";
export type AgentStatus = "idle" | "busy" | "offline";
export type TaskStatus = "queued" | "running" | "pr_open" | "completed" | "failed" | "archived";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type CIStatus = "pending" | "passing" | "failing" | null;
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  emoji?: string;
  color?: string;
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
  cpu_percent: number;
  memory_percent: number;
  active_agents: number;
  running_tasks: number;
  uptime_seconds: number;
}

export interface SystemStats {
  totals: {
    tasks: number;
    completed: number;
    failed: number;
    running: number;
    queued: number;
  };
  by_status: Record<string, number>;
  completion_trend_30d: Array<{ date: string; completed: number; failed: number }>;
  agent_utilization: Array<{
    agent_id: string;
    agent_name: string;
    total_tasks: number;
    success_rate: number;
    avg_duration_min: number;
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
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export interface Activity {
  id: string;
  project_id: string;
  type: "task_created" | "task_completed" | "task_failed" | "agent_assigned" | "pr_opened" | "pr_merged";
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ApiKey {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  project_id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  priority: TaskPriority;
  agent_type: AgentType;
  scheduled_at?: string;
  depends_on?: string[];
}
