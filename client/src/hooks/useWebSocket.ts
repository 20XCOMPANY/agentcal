/**
 * [INPUT]: Depends on browser WebSocket API and task/agent store mutation actions.
 * [OUTPUT]: Maintains reconnecting ws subscription and dispatches realtime task/agent/log events.
 * [POS]: client realtime bridge between backend websocket stream and Zustand state.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useEffect } from "react";
import { useAgentStore } from "@/stores/agentStore";
import { useTaskStore } from "@/stores/taskStore";
import type { Agent, Task, WebSocketEnvelope } from "@/types";

function resolveWebSocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export function useWebSocket(): void {
  const upsertTask = useTaskStore((state) => state.upsertTask);
  const appendLog = useTaskStore((state) => state.appendLog);
  const upsertAgent = useAgentStore((state) => state.upsertAgent);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retry = 0;
    let closedByUser = false;

    const connect = () => {
      socket = new WebSocket(resolveWebSocketUrl());

      socket.onopen = () => {
        retry = 0;
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(event.data) as WebSocketEnvelope;
          switch (payload.event) {
            case "task:created":
            case "task:updated":
            case "task:completed":
            case "task:failed": {
              const task = (payload.data as { task?: Task }).task;
              if (task) {
                upsertTask(task);
              }
              break;
            }
            case "agent:status": {
              const agent = (payload.data as { agent?: Agent }).agent;
              if (agent) {
                upsertAgent(agent);
              }
              break;
            }
            case "log:append": {
              const data = payload.data as { task_id?: string; line?: string };
              if (data.task_id && data.line) {
                appendLog(data.task_id, data.line);
              }
              break;
            }
            default:
              break;
          }
        } catch {
          // Ignore malformed payloads from non-standard ws senders.
        }
      };

      socket.onclose = () => {
        if (closedByUser) {
          return;
        }
        retry = retry + 1;
        const delayMs = Math.min(1000 * 2 ** Math.min(retry, 4), 10000);
        timer = setTimeout(connect, delayMs);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      closedByUser = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    };
  }, [appendLog, upsertAgent, upsertTask]);
}
