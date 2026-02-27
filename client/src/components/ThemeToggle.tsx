/**
 * [INPUT]: Depends on current dark-mode state and toggle callback from layout shell.
 * [OUTPUT]: Renders light/dark mode toggle button.
 * [POS]: shared layout control for Tailwind class-based theme switching.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
interface ThemeToggleProps {
  darkMode: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ darkMode, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
      aria-label="Toggle theme"
    >
      <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
      <span>{darkMode ? "Light" : "Dark"}</span>
    </button>
  );
}
