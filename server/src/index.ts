import http from "node:http";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { closeDb, DB_PATH } from "./db";
import agentsRouter from "./routes/agents";
import calendarRouter from "./routes/calendar";
import projectsRouter from "./routes/projects";
import { createSystemRouter } from "./routes/system";
import tasksRouter from "./routes/tasks";
import { startSyncScheduler, stopSyncScheduler, triggerManualSync } from "./services/sync";
import { setupWebSocketServer } from "./ws";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agentcal-backend" });
});

app.use("/api/agents", agentsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/system", createSystemRouter({ runSync: triggerManualSync }));

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "internal server error";
  console.error("[agentcal] error", error);
  res.status(500).json({ error: message });
});

const server = http.createServer(app);
setupWebSocketServer(server);

const port = Number.parseInt(process.env.PORT ?? "3100", 10);

server.listen(port, () => {
  console.log(`[agentcal] server listening on http://localhost:${port}`);
  console.log(`[agentcal] sqlite database: ${DB_PATH}`);
  startSyncScheduler(10_000);
});

function shutdown(signal: string): void {
  console.log(`[agentcal] received ${signal}, shutting down`);
  stopSyncScheduler();

  server.close(() => {
    closeDb();
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
