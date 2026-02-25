# server/
> L2 | 父级: /AGENTS.md

成员清单
src/db.ts: SQLite 初始化与迁移核心，负责 WAL、schema、默认项目回填与行映射。
src/index.ts: HTTP 入口，挂载 CORS、API 认证上下文、REST 路由与 WebSocket 服务。
src/middleware/api-auth.ts: Bearer/x-api-key 认证中间件，向请求注入 `req.apiKey`。
src/routes/auth.ts: `/api/auth/token`，为远程 agent 签发 API token。
src/routes/agents.ts: 代理 CRUD 与 profile 扩展字段处理，写入活动流并广播状态。
src/routes/projects.ts: 项目路由聚合，提供 projects/agents/activities/keys/webhooks 子资源。
src/routes/tasks.ts: 任务全生命周期路由，支持 `project_id` 并写入实时活动流。
src/routes/webhooks.ts: 顶级 `/api/webhooks` 与 `/api/webhooks/events` 远程事件入口。
src/routes/calendar.ts: 日历聚合查询，按项目过滤任务视图。
src/services/activity.ts: 活动日志写入与查询服务，统一 WebSocket `activity:created` 推送。
src/services/auth.ts: API key 生成、解析、校验、脱敏服务。
src/services/sync.ts: active-tasks 同步服务，已支持 `project_id`。
src/ws.ts: WebSocket 初始化与事件广播。

目录结构
src/
├── db.ts
├── index.ts
├── middleware/
│   └── api-auth.ts
├── routes/
│   ├── agents.ts
│   ├── auth.ts
│   ├── calendar.ts
│   ├── projects.ts
│   ├── tasks.ts
│   └── webhooks.ts
├── services/
│   ├── activity.ts
│   ├── agent-swarm.ts
│   ├── auth.ts
│   └── sync.ts
├── types.ts
└── ws.ts

法则
- 路由层只做参数校验与编排，数据库写入复用 `db.ts` 与 `services/*`。
- 远程 agent 入口统一走 API key 认证与活动流审计。
- 所有多项目数据查询默认显式传递 `project_id`，避免跨项目污染。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
