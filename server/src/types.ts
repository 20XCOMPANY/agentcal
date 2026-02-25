export type AgentType = "codex" | "claude";
export type AgentStatus = "idle" | "busy" | "offline";

export type TaskStatus =
  | "queued"
  | "running"
  | "pr_open"
  | "completed"
  | "failed"
  | "archived";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
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

export interface AgentRow {
  id: string;
  project_id: string | null;
  name: string;
  type: AgentType;
  status: AgentStatus;
  current_task_id: string | null;
  total_tasks: number;
  success_count: number;
  fail_count: number;
  avg_duration_min: number;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
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
  review_codex: ReviewStatus;
  review_gemini: ReviewStatus;
  review_claude: ReviewStatus;
  retry_count: number;
  max_retries: number;
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

export interface TaskListFilters {
  status?: TaskStatus;
  date?: string;
}

export interface SyncResult {
  source: string | null;
  scanned: number;
  upserted: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  synced_at: string;
}

// Multi-project workspace types
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

export interface AgentProfile {
  id: string;
  agent_id: string;
  emoji: string;
  avatar_url: string;
  color: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  project_id: string;
  agent_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ActivityFeedItem extends Activity {
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
