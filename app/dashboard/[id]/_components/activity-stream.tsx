"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, PanelCard } from "@/components/panel";

interface ActivityItem {
  id: string;
  seq: number;
  phase: string;
  message: string;
  source: string;
  occurredAt: string;
}

export const ActivityStream = ({ serverId }: { serverId: string }) => {
  const [events, setEvents] = useState<ActivityItem[]>([]);
  const cursorRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) {
        return;
      }
      es = new EventSource(`/api/servers/${serverId}/activity/stream?cursor=${cursorRef.current}`);
      es.addEventListener("activity", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as ActivityItem;
        cursorRef.current = Math.max(cursorRef.current, data.seq);
        setEvents((prev) => (prev.some((e) => e.seq === data.seq) ? prev : [...prev, data]));
      });
      es.addEventListener("close", () => {
        es?.close();
        reconnectTimer = setTimeout(connect, 250);
      });
      es.addEventListener("error", () => {
        es?.close();
        reconnectTimer = setTimeout(connect, 2000);
      });
    };

    connect();
    return () => {
      cancelled = true;
      es?.close();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [serverId]);

  return (
    <Panel>
      <PanelCard>
        <ol className="flex max-h-80 flex-col gap-1 overflow-auto">
          {events.map((event) => (
            <li
              key={event.seq}
              className="flex flex-row items-center gap-4 rounded-lg px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(event.occurredAt).toLocaleTimeString()}
              </span>
              <span className="font-medium">{event.phase}</span>
              <span className="text-muted-foreground">{event.message}</span>
            </li>
          ))}
          {events.length === 0 && (
            <li className="rounded-lg px-3 py-2 text-sm text-muted-foreground">
              Waiting for events…
            </li>
          )}
        </ol>
      </PanelCard>
    </Panel>
  );
};
