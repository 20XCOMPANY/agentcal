# client/
> L2 | 父级: /AGENTS.md

成员清单
package.json: Client package manifest with React/Vite/Tailwind dependencies and scripts.
vite.config.ts: Vite config with React plugin, Tailwind plugin, alias, and backend proxies.
tailwind.config.ts: Tailwind theme + dark mode class strategy.
tsconfig.json: TypeScript compiler settings for client source and config files.
index.html: App HTML shell with Inter font preload and root mount node.
postcss.config.cjs: PostCSS autoprefixer compatibility hook.
src/: Client runtime source tree for app shell, pages, stores, hooks, and styles.

目录结构
src/
├── AGENTS.md
├── App.tsx
├── main.tsx
├── types.ts
├── api/
├── components/
├── hooks/
├── lib/
├── pages/
├── stores/
└── styles/

法则
- Keep task and agent state in Zustand stores; do not duplicate domain state in page-local caches.
- Route all backend calls through `src/api/client.ts`.
- Realtime updates must flow through `useWebSocket` into stores.

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
