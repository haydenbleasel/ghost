'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useRef, useState } from 'react';

type LogItem = {
  id: string;
  seq: number;
  stream: string;
  line: string;
  ts: string;
};

export const LogsStream = ({ serverId }: { serverId: string }) => {
  const [lines, setLines] = useState<LogItem[]>([]);
  const cursorRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const es = new EventSource(
        `/api/servers/${serverId}/logs/stream?cursor=${cursorRef.current}`
      );
      es.addEventListener('log', (event) => {
        const data = JSON.parse((event as MessageEvent).data) as LogItem;
        cursorRef.current = Math.max(cursorRef.current, data.seq);
        setLines((prev) => [...prev.slice(-500), data]);
      });
      es.addEventListener('close', () => {
        es.close();
        setTimeout(connect, 250);
      });
      es.onerror = () => {
        es.close();
        setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Console</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="h-80 overflow-auto rounded-md bg-black p-3 font-mono text-xs text-green-400"
        >
          {lines.length === 0 && (
            <span className="text-muted-foreground">Waiting for logs…</span>
          )}
          {lines.map((line) => (
            <div key={line.id} className="whitespace-pre-wrap">
              {line.line}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
