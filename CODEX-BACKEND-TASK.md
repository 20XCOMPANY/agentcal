# Task: Build AgentCal Backend

Read PRD.md for full context. Build the complete backend.

## Tech Stack
- Node.js 20+ / TypeScript
- Express.js
- SQLite via better-sqlite3
- WebSocket via ws
- pnpm

## What to build

### 1. package.json + tsconfig
- pnpm workspace with server/ and client/ packages
- Root package.json with dev scripts

### 2. server/src/db.ts
- SQLite init with better-sqlite3
- All tables from PRD (agents, tasks, task_dependencies, task_logs, task_events)
- WAL mode

### 3. server/src/routes/agents.ts
- Full CRUD for agents (GET/POST/PUT/DELETE)

### 4. server/src/routes/tasks.ts
- Full CRUD for tasks
- POST /tasks/:id/spawn — calls spawn-agent.sh
- POST /tasks/:id/redirect — calls redirect-agent.sh
- POST /tasks/:id/kill — calls kill-agent.sh
- POST /tasks/:id/retry

### 5. server/src/routes/calendar.ts
- GET /calendar/daily?date=YYYY-MM-DD
- GET /calendar/weekly?date=YYYY-MM-DD
- GET /calendar/monthly?date=YYYY-MM

### 6. server/src/routes/system.ts
- GET /system/status
- POST /system/sync (sync active-tasks.json)
- GET /system/stats

### 7. server/src/services/agent-swarm.ts
- Wrapper around .openclaw scripts (spawn, redirect, kill, status)
- child_process.exec calls

### 8. server/src/services/sync.ts
- Read active-tasks.json and sync to SQLite
- Run every 10 seconds

### 9. server/src/ws.ts
- WebSocket server on same port
- Broadcast task:created, task:updated, task:completed, task:failed events

### 10. server/src/index.ts
- Express app setup
- CORS enabled
- JSON body parser
- Mount all routes under /api
- WebSocket upgrade
- Start scheduler/sync
- Port 3100

## Important
- Use uuid for IDs
- All dates in ISO8601
- Return proper HTTP status codes
- Add error handling middleware
- Make it actually runnable with `pnpm dev`
