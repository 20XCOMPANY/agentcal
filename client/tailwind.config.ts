/**
 * [INPUT]: Depends on client source files and Tailwind dark mode class strategy.
 * [OUTPUT]: Exposes Tailwind scan paths and theme extension for AgentCal UI tokens.
 * [POS]: client design token and utility generation contract.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(15, 23, 42, 0.08)",
      },
      colors: {
        surface: "#ffffff",
        "surface-muted": "#f8fafc",
        "surface-dark": "#0f172a",
        "surface-dark-muted": "#111827",
      },
    },
  },
} satisfies Config;
