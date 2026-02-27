/**
 * [INPUT]: Depends on Vite, React plugin, Tailwind plugin, and local backend proxy targets.
 * [OUTPUT]: Exposes frontend dev/build config with /api and /ws proxy wiring.
 * [POS]: client build/runtime gateway for local development and API bridging.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3100",
        ws: true,
      },
    },
  },
});
