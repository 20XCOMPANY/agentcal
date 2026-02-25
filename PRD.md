# AgentCal — PRD (Product Requirements Document)

## 一句话描述

AgentCal 是一个 Agent 任务日历系统，让你像管理开发团队一样管理多个 AI coding agents——可视化任务调度、实时状态追踪、自动化工作流，UI 体验对标 Notion。

---

## 背景

当前 Agent Swarm 架构（spawn-agent → tmux → worktree → PR）已经能跑，但缺少：
- 可视化界面：只能 CLI 看状态，没有全局视图
- 时间维度：不知道哪个 agent 什么时候在干什么
- 任务编排：手动 spawn，没有排队和依赖管理
- 历史回溯：完成的任务清理后就没了

AgentCal 解决这些问题，成为 Agent Swarm 的「控制面板」。

---

## 核心用户

- **老板（Zihan）**：看全局、下任务、review PR
- **编排层 Agent（Friday/Alma）**：调度任务、监控状态、纠偏
- **执行层 Agent（Codex/Claude Code）**：接收任务、汇报进度

---

## 功能需求

### P0 — MVP（老板醒来要看到的）

#### 1. 日历视图（Calendar View）
- 日/周/月三种视图切换
- 每个任务显示为时间块（类似 Google Calendar）
- 颜色编码：
  - 🟢 运行中（running）
  - 🟡 等待中（queued）
  - 🔵 PR 已开（pr_open）
  - ✅ 已完成（completed）
  - 🔴 失败（failed）
- 点击任务块展开详情面板

#### 2. Agent 管理
- Agent 列表页：显示所有注册的 agents（Codex、Claude Code 等）
- 每个 agent 的状态卡片：
  - 当前任务
  - 运行时长
  - 成功率
  - 最近完成的任务
- 支持注册新 agent 类型

#### 3. 任务 CRUD
- 创建任务：描述、agent 类型、优先级、预估时长、依赖任务
- 任务详情页（Notion-like block editor 风格）：
  - 任务描述（富文本）
  - 状态流转记录
  - Agent 日志（实时流式）
  - PR 链接 + CI 状态
  - Code Review 状态（3 个 AI reviewer）
- 编辑/删除/重试任务

#### 4. 实时状态同步
- 读取 `active-tasks.json` 作为数据源
- WebSocket 推送状态变更
- 与现有 Agent Swarm 脚本集成（spawn/kill/redirect/status）

#### 5. 快捷操作
- 从日历直接 spawn agent（调用 `spawn-agent.sh`）
- 从任务详情页 redirect agent（调用 `redirect-agent.sh`）
- 从任务详情页 kill agent（调用 `kill-agent.sh`）
- 一键查看 tmux session 日志

### P1 — 增强功能

#### 6. 任务队列 & 依赖
- 任务排队：RAM 不够时自动排队
- 依赖关系：任务 B 等任务 A 完成后自动启动
- 并发控制：最大同时运行 agent 数（默认 3）

#### 7. 通知集成
- Discord webhook 通知
- Telegram bot 通知
- 浏览器通知（Web Push）

#### 8. 历史 & 统计
- 已完成任务归档（不删除，标记为 archived）
- 统计面板：
  - 日/周/月任务完成数
  - 平均任务耗时
  - 成功率趋势
  - Agent 利用率

### P2 — 未来

#### 9. 主动工作发现
- 扫 Sentry → 自动创建 bug fix 任务
- 扫 GitHub Issues → 自动排期
- 扫会议笔记 → 自动拆解任务

#### 10. 多 Agent 协作视图
- 甘特图视图：看并行任务的时间线
- 依赖图：可视化任务依赖关系

---

## API 设计

### Base URL: `http://localhost:3100/api`

### Agents

```
GET    /agents              — 获取所有 agents
POST   /agents              — 注册新 agent
GET    /agents/:id          — 获取单个 agent 详情
PUT    /agents/:id          — 更新 agent 信息
DELETE /agents/:id          — 删除 agent
```

**Agent Schema:**
```json
{
  "id": "string (uuid)",
  "name": "string",
  "type": "codex | claude",
  "status": "idle | busy | offline",
  "current_task_id": "string | null",
  "stats": {
    "total_tasks": 0,
    "success_count": 0,
    "fail_count": 0,
    "avg_duration_min": 0
  },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Tasks

```
GET    /tasks               — 获取所有任务（支持 ?status=running&date=2025-02-25）
POST   /tasks               — 创建新任务
GET    /tasks/:id           — 获取任务详情
PUT    /tasks/:id           — 更新任务
DELETE /tasks/:id           — 删除任务
POST   /tasks/:id/spawn     — 启动 agent 执行此任务
POST   /tasks/:id/redirect  — 中途纠偏（body: { message: "..." }）
POST   /tasks/:id/kill      — 停止任务
POST   /tasks/:id/retry     — 重试失败的任务
```

**Task Schema:**
```json
{
  "id": "string (uuid)",
  "title": "string",
  "description": "string (markdown)",
  "status": "queued | running | pr_open | completed | failed | archived",
  "priority": "low | medium | high | urgent",
  "agent_type": "codex | claude",
  "agent_id": "string | null",
  "branch": "string | null",
  "pr_url": "string | null",
  "pr_number": "number | null",
  "ci_status": "pending | passing | failing | null",
  "reviews": {
    "codex": "pending | approved | rejected",
    "gemini": "pending | approved | rejected",
    "claude": "pending | approved | rejected"
  },
  "retry_count": 0,
  "max_retries": 3,
  "depends_on": ["task_id"],
  "scheduled_at": "ISO8601 | null",
  "started_at": "ISO8601 | null",
  "completed_at": "ISO8601 | null",
  "estimated_duration_min": 30,
  "actual_duration_min": null,
  "tmux_session": "string | null",
  "worktree_path": "string | null",
  "log_path": "string | null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Calendar

```
GET /calendar/daily?date=YYYY-MM-DD     — 某天的任务
GET /calendar/weekly?date=YYYY-MM-DD    — 某周的任务（date 所在周）
GET /calendar/monthly?date=YYYY-MM      — 某月的任务
```

### WebSocket

```
ws://localhost:3100/ws

Events:
- task:created    { task }
- task:updated    { task }
- task:completed  { task }
- task:failed     { task, error }
- agent:status    { agent }
- log:append      { task_id, line }
```

### System

```
GET  /system/status          — 系统状态（RAM、CPU、活跃 agents 数）
POST /system/sync            — 手动同步 active-tasks.json
GET  /system/stats            — 统计数据
```

---

## 数据库 Schema（SQLite）

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('codex', 'claude')),
  status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'busy', 'offline')),
  current_task_id TEXT,
  total_tasks INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  avg_duration_min REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (current_task_id) REFERENCES tasks(id)
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK(status IN ('queued', 'running', 'pr_open', 'completed', 'failed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  agent_type TEXT NOT NULL DEFAULT 'codex'
    CHECK(agent_type IN ('codex', 'claude')),
  agent_id TEXT,
  branch TEXT,
  pr_url TEXT,
  pr_number INTEGER,
  ci_status TEXT CHECK(ci_status IN ('pending', 'passing', 'failing')),
  review_codex TEXT DEFAULT 'pending',
  review_gemini TEXT DEFAULT 'pending',
  review_claude TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  estimated_duration_min INTEGER DEFAULT 30,
  actual_duration_min INTEGER,
  tmux_session TEXT,
  worktree_path TEXT,
  log_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE task_dependencies (
  task_id TEXT NOT NULL,
  depends_on_task_id TEXT NOT NULL,
  PRIMARY KEY (task_id, depends_on_task_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id)
);

CREATE TABLE task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  level TEXT DEFAULT 'info' CHECK(level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE task_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_scheduled_at ON tasks(scheduled_at);
CREATE INDEX idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX idx_task_logs_task_id ON task_logs(task_id);
CREATE INDEX idx_task_events_task_id ON task_events(task_id);
```

---

## UI 设计要求

### 整体风格：Notion-like
- 干净、留白多、无边框卡片
- 左侧导航栏（可折叠）
- 主内容区自适应
- 深色/浅色模式切换
- 字体：Inter / system-ui
- 圆角：8px
- 阴影：subtle, 0 2px 8px rgba(0,0,0,0.08)

### 页面结构

```
┌─────────────────────────────────────────────┐
│  🗓 AgentCal                    [☀️/🌙] [⚙️] │
├──────┬──────────────────────────────────────┤
│      │                                      │
│ 📅   │   [Day] [Week] [Month]    < Today >  │
│ Cal  │                                      │
│      │  ┌─────┬─────┬─────┬─────┬─────┐    │
│ 🤖   │  │ Mon │ Tue │ Wed │ Thu │ Fri │    │
│Agents│  ├─────┼─────┼─────┼─────┼─────┤    │
│      │  │░░░░░│     │░░░░░│     │     │    │
│ 📊   │  │fix  │     │add  │     │     │    │
│Stats │  │login│     │dark │     │     │    │
│      │  │░░░░░│     │mode │     │     │    │
│ ⚙️   │  │     │     │░░░░░│     │     │    │
│ Set  │  └─────┴─────┴─────┴─────┴─────┘    │
│      │                                      │
└──────┴──────────────────────────────────────┘
```

### 任务详情面板（右侧滑出 or 全屏）

```
┌──────────────────────────────────────┐
│ Fix login timeout bug          [🔴]  │
│ ─────────────────────────────────── │
│ Status: 🟢 Running (15m)            │
│ Agent: Codex #1                      │
│ Branch: feat/fix-login-timeout-xxx   │
│ PR: —                                │
│ ─────────────────────────────────── │
│                                      │
│ ## Description                       │
│ Fix the login timeout bug in         │
│ auth.ts line 45. Add proper error    │
│ handling for network failures.       │
│                                      │
│ ## Live Log                          │
│ ┌──────────────────────────────────┐ │
│ │ > Reading auth.ts...             │ │
│ │ > Found timeout issue at L45     │ │
│ │ > Writing fix...                 │ │
│ │ > Running tests...               │ │
│ │ █                                │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [Redirect] [Kill] [Retry]           │
└──────────────────────────────────────┘
```

### 组件库
- 不用重型 UI 框架
- 推荐：Tailwind CSS + Headless UI（或 Radix UI）
- 日历组件：自己写或用轻量库（不要 FullCalendar 那种重的）
- 图表：Chart.js 或 Recharts（统计页用）

---

## 技术栈

### 后端
- **Runtime**: Node.js 20+
- **Framework**: Express.js + TypeScript
- **Database**: SQLite（via better-sqlite3）
- **WebSocket**: ws 库
- **进程管理**: 直接调用 .openclaw 脚本（child_process.exec）

### 前端
- **Framework**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **状态管理**: Zustand（轻量）
- **路由**: React Router v6
- **HTTP**: fetch（不需要 axios）
- **WebSocket**: 原生 WebSocket
- **日历**: 自研轻量组件
- **图表**: Recharts（统计页）

### 开发工具
- **Monorepo**: 不需要，前后端放一个 repo
- **包管理**: pnpm
- **Lint**: ESLint + Prettier
- **测试**: Vitest（后端）+ Playwright（E2E）

### 项目结构

```
agentcal/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── server/
│   ├── src/
│   │   ├── index.ts              # Express 入口
│   │   ├── db.ts                 # SQLite 初始化
│   │   ├── routes/
│   │   │   ├── agents.ts
│   │   │   ├── tasks.ts
│   │   │   ├── calendar.ts
│   │   │   └── system.ts
│   │   ├── services/
│   │   │   ├── agent-swarm.ts    # 调用 .openclaw 脚本
│   │   │   ├── task-scheduler.ts # 任务队列 & 依赖
│   │   │   └── sync.ts           # active-tasks.json 同步
│   │   ├── ws.ts                 # WebSocket 服务
│   │   └── types.ts
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── CalendarPage.tsx
│   │   │   ├── AgentsPage.tsx
│   │   │   ├── TaskDetailPage.tsx
│   │   │   └── StatsPage.tsx
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   ├── Calendar/
│   │   │   ├── TaskCard/
│   │   │   ├── AgentCard/
│   │   │   ├── LogViewer/
│   │   │   └── common/
│   │   ├── stores/
│   │   │   ├── taskStore.ts
│   │   │   └── agentStore.ts
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useCalendar.ts
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── index.html
│   ├── vite.config.ts
│   └── tailwind.config.ts
└── README.md
```

---

## 与 Agent Swarm 集成

### 数据同步策略

1. **启动时**：读取 `active-tasks.json`，同步到 SQLite
2. **运行时**：
   - 通过 AgentCal 创建的任务 → 写 SQLite + 调用 `spawn-agent.sh`
   - `check-agents.sh` 检测到变更 → 更新 `active-tasks.json` → AgentCal 定时同步（每 10s）
3. **双向同步**：AgentCal 是 source of truth，`active-tasks.json` 作为兼容层

### 脚本调用映射

| AgentCal 操作 | 调用的脚本 |
|---|---|
| 创建并启动任务 | `spawn-agent.sh "{description}" {agent_type}` |
| 纠偏 | `redirect-agent.sh {tmux_session} "{message}"` |
| 停止任务 | `kill-agent.sh {tmux_session}` |
| 查看状态 | `status.sh`（或直接读 SQLite） |
| 清理 | `cleanup.sh` |

---

## Definition of Done（MVP）

- [ ] 后端 API 全部可用（agents, tasks, calendar, system）
- [ ] WebSocket 实时推送任务状态变更
- [ ] 日历视图（日/周）可用，任务显示为彩色时间块
- [ ] 任务详情面板：描述、状态、日志、操作按钮
- [ ] Agent 列表页：状态卡片
- [ ] 能通过 UI 创建任务并 spawn agent
- [ ] 能通过 UI redirect / kill agent
- [ ] 与 active-tasks.json 双向同步
- [ ] 深色模式
- [ ] 本地跑起来 `pnpm dev` 一键启动

---

## 非功能需求

- **性能**：页面加载 < 1s，WebSocket 延迟 < 500ms
- **兼容**：Chrome/Safari/Firefox 最新版
- **响应式**：桌面优先，平板可用，手机不要求
- **安全**：仅本地访问（localhost），不需要认证

---

## 时间估算

| 模块 | 预估 |
|---|---|
| 后端 API + DB | Codex 30min |
| WebSocket | Codex 15min |
| Agent Swarm 集成 | Codex 20min |
| 前端日历视图 | Claude Code 45min |
| 前端任务详情 | Claude Code 30min |
| 前端 Agent 页 | Claude Code 20min |
| 样式 + 深色模式 | Claude Code 20min |
| 联调 + 修 bug | 30min |
| **总计** | **~3.5h** |

可以 2 个 agent 并行（后端 Codex + 前端 Claude Code），实际 ~2h 完成。
