# src/
> L2 | 父级: /client/AGENTS.md

成员清单
main.tsx: Browser entrypoint and root render bootstrap.
App.tsx: Route registration and websocket bootstrap.
types.ts: Shared domain types aligned to backend schemas.
api/client.ts: Typed REST wrappers for tasks/agents/calendar/system.
stores/taskStore.ts: Task state, calendar state, selected task, and live logs.
stores/agentStore.ts: Agent list state and upsert helpers.
hooks/useWebSocket.ts: Reconnecting websocket event dispatcher.
hooks/useCalendar.ts: Calendar date/view navigation helpers.
components/: Reusable layout and UI primitives.
pages/: Route-level feature pages.
lib/status.ts: Task status label/color presentation helpers.
styles/globals.css: Tailwind import and global visual tokens.

法则
- `types.ts` is the only shared type source for app modules.
- Keep page components thin; move reusable behavior to hooks/components/stores.
- Keep visual semantics centralized in `lib/status.ts`.

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
