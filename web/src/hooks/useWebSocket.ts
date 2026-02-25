import { useEffect, useRef } from "react";
import { useStore } from "@/store";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const upsertTask = useStore((s) => s.upsertTask);
  const upsertAgent = useStore((s) => s.upsertAgent);

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/ws`;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const { event, data } = msg;
          if (
            event === "task:created" ||
            event === "task:updated" ||
            event === "task:completed" ||
            event === "task:failed"
          ) {
            upsertTask(data);
          } else if (event === "agent:status") {
            upsertAgent(data);
          }
        } catch {
          // ignore non-json
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [upsertTask, upsertAgent]);
}
