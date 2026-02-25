import type { IncomingMessage, Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { nowIso } from "./db";

let wss: WebSocketServer | null = null;

function getPathname(req: IncomingMessage): string {
  if (!req.url) {
    return "";
  }

  try {
    return new URL(req.url, "http://localhost").pathname;
  } catch {
    return "";
  }
}

export function setupWebSocketServer(server: Server): WebSocketServer {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (getPathname(req) !== "/ws") {
      socket.destroy();
      return;
    }

    wss?.handleUpgrade(req, socket, head, (wsClient) => {
      wss?.emit("connection", wsClient, req);
    });
  });

  wss.on("connection", (wsClient) => {
    wsClient.send(
      JSON.stringify({
        event: "system:connected",
        data: { connected_at: nowIso() },
        timestamp: nowIso(),
      }),
    );
  });

  return wss;
}

export function broadcast(event: string, data: unknown): void {
  if (!wss) {
    return;
  }

  const payload = JSON.stringify({
    event,
    data,
    timestamp: nowIso(),
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
