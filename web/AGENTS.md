# web/
> L2 | 父级: /AGENTS.md

成员清单
src/types.ts: 前端统一领域类型，和后端 API 返回字段对齐。
src/store.ts: Zustand 全局状态，维护当前项目、任务、代理、活动与 UI 面板状态。
src/api/client.ts: REST 客户端，新增任务依赖树与系统队列/配置接口调用。
src/hooks/useWebSocket.ts: WebSocket 客户端，消费 task/agent/activity 事件并更新 store，并刷新队列状态。
src/components/ActivityPanel.tsx: 活动流面板，展示 `action/details` 结构活动。
src/components/CommandPalette.tsx: 命令面板，支持 Cmd/Ctrl 快捷键配合页面跳转与动作。
src/components/CreateTaskModal.tsx: 新建任务弹窗，携带 `project_id` 并支持 `depends_on` 依赖输入。
src/components/PromptTaskComposer.tsx: Notion-like Prompt-to-Task 输入区，实时解析预览并确认创建任务。
src/components/TaskDetailPanel.tsx: 任务详情侧栏，展示依赖关系箭头图、阻塞来源与队列位置。
src/pages/ApiKeysPage.tsx: API key 管理页，支持创建、复制、删除与一次性明文显示。
src/pages/WebhooksPage.tsx: Webhook 管理页，支持事件订阅、启停、编辑、删除。
src/pages/StatsPage.tsx: 统计页，适配新的后端 stats 结构。
src/pages/CalendarPage.tsx: 日历主界面，任务卡展示依赖阻塞状态与队列位置，内置 PromptTaskComposer。
src/pages/SettingsPage.tsx: 设置页，支持并发上限配置（max concurrent agents）与主题切换。
src/App.tsx: 应用壳，注册 `Cmd/Ctrl+K/L/N` 快捷键与主路由。

目录结构
src/
├── api/
│   └── client.ts
├── components/
│   ├── ActivityPanel.tsx
│   ├── CommandPalette.tsx
│   ├── CreateTaskModal.tsx
│   ├── PromptTaskComposer.tsx
│   └── ...
├── hooks/
│   └── useWebSocket.ts
├── pages/
│   ├── ApiKeysPage.tsx
│   ├── StatsPage.tsx
│   ├── WebhooksPage.tsx
│   └── ...
├── store.ts
└── types.ts

法则
- 类型优先：页面和 API 客户端必须共享 `src/types.ts`。
- 多项目查询必须附带 `project_id`，UI 切项目后即时刷新数据。
- WebSocket 事件统一走 store 的 upsert/prepend 方法，避免页面各自维护实时状态。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
