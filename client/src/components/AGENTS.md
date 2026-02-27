# components/
> L2 | 父级: /client/src/AGENTS.md

成员清单
Layout.tsx: Shell wrapper with sidebar and main outlet.
Sidebar.tsx: Collapsible navigation with route links and theme switch.
ThemeToggle.tsx: Theme toggle control.
CalendarGrid.tsx: Custom day/week/month scheduling grid.
TaskCard.tsx: Status-colored task block renderer.
LogViewer.tsx: Auto-scrolling live log panel.

法则
- Keep components presentational; domain mutations should come from stores/pages.
- Preserve 8px radius and subtle shadow for Notion-like consistency.

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
