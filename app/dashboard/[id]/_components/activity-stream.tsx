'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useRef, useState } from 'react';

type ActivityItem = {
  id: string;
  seq: number;
  phase: string;
  message: string;
  source: string;
  occurredAt: string;
};

export const ActivityStream = ({ serverId }: { serverId: string }) => {
  const [events, setEvents] = useState<ActivityItem[]>([]);
  const cursorRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      es = new EventSource(
        `/api/servers/${serverId}/activity/stream?cursor=${cursorRef.current}`
      );
      es.addEventListener('activity', (event) => {
        const data = JSON.parse((event as MessageEvent).data) as ActivityItem;
        if (data.seq <= cursorRef.current) return;
        cursorRef.current = data.seq;
        setEvents((prev) => [...prev, data]);
      });
      es.addEventListener('close', () => {
        es?.close();
        reconnectTimer = setTimeout(connect, 250);
      });
      es.onerror = () => {
        es?.close();
        reconnectTimer = setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      cancelled = true;
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [serverId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent className="h-80 overflow-auto">
        <ol className="space-y-2 text-sm">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-start gap-3 border-l-2 border-muted pl-3"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(event.occurredAt).toLocaleTimeString()}
              </span>
              <div>
                <span className="font-medium">{event.phase}</span>
                <span className="ml-2 text-muted-foreground">
                  {event.message}
                </span>
              </div>
            </li>
          ))}
          {events.length === 0 && (
            <li className="text-muted-foreground">Waiting for events…</li>
          )}
        </ol>
      </CardContent>
    </Card>
  );
};
