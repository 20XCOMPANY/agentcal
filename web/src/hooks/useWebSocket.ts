import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import type { Activity, Agent, Task, WSEvent } from "@/types";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const upsertTask = useStore((s) => s.upsertTask);
  const upsertAgent = useStore((s) => s.upsertAgent);
  const prependActivity = useStore((s) => s.prependActivity);
  const currentProject = useStore((s) => s.currentProject);

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
          const msg = JSON.parse(ev.data) as WSEvent;
          const { event, data } = msg;
          if (
            event === "task:created" ||
            event === "task:updated" ||
            event === "task:completed" ||
            event === "task:failed"
          ) {
            const task = (data as { task?: Task }).task;
            if (task) {
              upsertTask(task);
            }
          } else if (event === "agent:status") {
            const agent = (data as { agent?: Agent }).agent;
            if (agent) {
              upsertAgent(agent);
            }
          } else if (event === "activity:created") {
            const activity = (data as { activity?: Activity }).activity;
            if (activity && (!currentProject || activity.project_id === currentProject.id)) {
              prependActivity(activity);
            }
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
  }, [currentProject, prependActivity, upsertTask, upsertAgent]);
}
