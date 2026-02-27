# agentcal - OpenClaw Seeded Project

This repository is managed by OpenClaw swarm seeding for reusable multi-agent delivery workflows.

<directory>
.openclaw/ - Project thin control plane (seeded wrappers + SQLite state + compatibility projection)
.pnpm-store/ - Project module
client/ - Project module
server/ - Project module
web/ - Project module
</directory>

<config>
CODEX-BACKEND-TASK.md - Project file
package.json - Project file
pnpm-lock.yaml - Project file
pnpm-workspace.yaml - Project file
PRD.md - Project file
REFACTOR_TASK.md - Project file
client/AGENTS.md - Client module map
server/AGENTS.md - Server module map
tsconfig.json - Project file
web/AGENTS.md - Web module map
</config>

Rules
- Keep project-specific behavior in code; keep orchestration behavior in `.openclaw/` wrappers and `swarm-core`.
- Treat `.openclaw/swarm.db` as task truth source and `active-tasks.json` as compatibility projection only.

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
