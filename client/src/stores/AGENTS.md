# stores/
> L2 | 父级: /client/src/AGENTS.md

成员清单
taskStore.ts: Task/calendar state machine with websocket log accumulation.
agentStore.ts: Agent state machine with load/upsert selectors.

法则
- Stores own domain state; page local state is only for transient UI controls.
- Upsert helpers must preserve existing collections and selection coherence.

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
