# pages/
> L2 | 父级: /client/src/AGENTS.md

成员清单
CalendarPage.tsx: Main planning surface with prompt-to-task and calendar views.
AgentsPage.tsx: Agent fleet cards with status and stats.
TaskDetailPage.tsx: Notion-like task deep view with live logs and control actions.
StatsPage.tsx: Recharts analytics for throughput, success, and utilization.
SettingsPage.tsx: Scheduler config and backend status page.

法则
- Page files orchestrate data load and composition; reusable UI lives in components.
- Task actions (redirect/kill/retry/spawn) must handle optimistic errors clearly.

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
