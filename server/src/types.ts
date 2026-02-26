/**
 * [INPUT]: 依赖 server/db 的表结构与 routes/services 的任务生命周期约束。
 * [OUTPUT]: 对外提供服务端领域类型（Agent/Task/Prompt 解析）供路由和服务复用。
 * [POS]: server 类型系统核心，统一校验与序列化边界。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
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

export interface PromptTaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  agent_type: AgentType;
  scheduled_at: string | null;
  depends_on: string[];
}

export type PromptParserProvider = "openai" | "anthropic" | "fallback";

export interface PromptParserMeta {
  provider: PromptParserProvider;
  model: string | null;
  fallback: boolean;
  reason?: string;
}

export interface PromptTaskParseResult {
  parsed: PromptTaskDraft;
  parser: PromptParserMeta;
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
