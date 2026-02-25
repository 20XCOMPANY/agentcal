Refactor agentcal to support multi-project workspaces and multi-agent collaboration, inspired by Roro's architecture.

Current state:
- Backend: Express + TypeScript + SQLite at ~/.openclaw/workspace/agentcal/
- Frontend: React + Vite + Tailwind at ~/.openclaw/workspace/agentcal/web/
- Running: backend on 3100, frontend on 5173

Requirements:
1. Add multi-project/workspace support
   - Each project is an isolated workspace
   - Projects have name, description, created_at
   - Agents can be assigned to projects
   - Add projects table: id, name, description, created_at, updated_at

2. Enhance agent management
   - Add agent profiles (name, emoji, avatar_url, color)
   - Support multiple agents per project
   - Track agent activity/status
   - Add agent_profiles table: id, agent_id, emoji, avatar_url, color, settings JSON

3. Add real-time activity feed
   - WebSocket events for all actions (agent.registered, task.created, etc.)
   - Activity log table: id, project_id, agent_id, action, details JSON, created_at
   - API to fetch activity feed
   - Display in sidebar or dedicated page

4. Add keyboard shortcuts
   - cmd+L for quick command palette
   - cmd+K for search
   - cmd+N for new task

5. Remote agent support
   - API authentication (API tokens)
   - Webhook endpoints for remote agents
   - CORS configuration for external access
   - Add api_keys table: id, project_id, key, label, created_at, expires_at
   - Add webhooks table: id, project_id, url, events JSON, active boolean

6. Pressure testing
   - Create test script for 100+ concurrent tasks
   - Load testing for WebSocket connections
   - Database performance optimization (indexes, WAL mode)

Database changes:
- projects table (new)
- agent_profiles table (new)
- activities table (new)
- api_keys table (new)
- webhooks table (new)
- Add project_id to agents and tasks tables

API changes:
- GET/POST /api/projects
- GET/POST /api/projects/:id/agents
- GET /api/projects/:id/activities
- POST /api/auth/token (generate API key)
- GET/POST /api/webhooks

Frontend changes:
- Project selector dropdown in sidebar
- Activity feed panel
- Command palette (cmd+K / cmd+L)
- Agent profile editor
- API key management page
- Webhook configuration page

Keep existing API structure but extend it. Update both backend and frontend.

Start with database schema changes in server/src/db/, then backend API routes, then frontend UI.

Work systematically:
1. First update database schema and seed data
2. Then add new API routes
3. Then update frontend components
4. Finally create load test script

The goal is to make agentcal usable by remote agents like pingping.