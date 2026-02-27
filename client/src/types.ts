/**
 * [INPUT]: Depends on backend API schemas and websocket payload contracts.
 * [OUTPUT]: Exposes shared frontend domain types for tasks, agents, calendar, and stats.
 * [POS]: client single source of type truth consumed by stores, hooks, pages, and api layer.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
export type AgentType = "codex" | "claude";
export type AgentStatus = "idle" | "busy" | "offline";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus =
  | "blocked"
  | "queued"
  | "running"
  | "pr_open"
  | "completed"
  | "failed"
  | "archived";
export type CIStatus = "pending" | "passing" | "failing" | null;
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface AgentStats {
  total_tasks: number;
  success_count: number;
  fail_count: number;
  avg_duration_min: number;
}

export interface Agent {
  id: string;
  project_id: string | null;
  name: string;
  type: AgentType;
  status: AgentStatus;
  current_task_id: string | null;
  stats: AgentStats;
  emoji?: string;
  color?: string;
  avatar_url?: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TaskReviews {
  codex: ReviewStatus;
  gemini: ReviewStatus;
  claude: ReviewStatus;
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
  reviews: TaskReviews;
  retry_count: number;
  max_retries: number;
  depends_on: string[];
  blocked_by: string[];
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

export interface CalendarDailyResponse {
  date: string;
  tasks: Task[];
}

export interface CalendarWeeklyResponse {
  week_start: string;
  week_end: string;
  tasks: Task[];
}

export interface CalendarMonthlyResponse {
  month: string;
  from: string;
  to: string;
  tasks: Task[];
}

export interface PromptTaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  agent_type: AgentType;
  scheduled_at: string | null;
  depends_on: string[];
}

export interface PromptParserMeta {
  provider: "openai" | "anthropic" | "fallback";
  model: string | null;
  fallback: boolean;
  reason?: string;
}

export interface PromptTaskFromPromptResponse {
  parsed: PromptTaskDraft;
  parser: PromptParserMeta;
  task?: Task;
  dry_run: boolean;
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
  by_status: Array<{
    status: TaskStatus;
    count: number;
  }>;
  completion_trend_30d: Array<{
    date: string;
    count: number;
  }>;
  agent_utilization: Array<{
    id: string;
    name: string;
    type: AgentType;
    status: AgentStatus;
    total_tasks: number;
    success_count: number;
    fail_count: number;
    avg_duration_min: number;
    running_tasks: number;
  }>;
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
}

export interface QueueStatus {
  generated_at: string;
  max_concurrent_agents: number;
  running_count: number;
  available_slots: number;
}

export interface SystemConfig {
  max_concurrent_agents: number;
}

export type CalendarView = "day" | "week" | "month";

export interface WebSocketEnvelope<T = unknown> {
  event: string;
  data: T;
  timestamp: string;
}
