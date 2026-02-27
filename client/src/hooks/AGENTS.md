# hooks/
> L2 | 父级: /client/src/AGENTS.md

成员清单
useCalendar.ts: View/date navigation and calendar query helpers.
useWebSocket.ts: Reconnecting websocket client dispatching task/agent/log events.

法则
- Hooks must stay deterministic and side-effect scoped.
- Realtime hook should only mutate stores through exposed actions.

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
