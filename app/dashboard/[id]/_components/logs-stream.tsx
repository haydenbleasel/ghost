"use client";
import { useEffect, useRef, useState } from "react";

import { Panel, PanelCard } from "@/components/panel";

interface LogItem {
  id: string;
  seq: number;
  stream: string;
  line: string;
  ts: string;
}

export const LogsStream = ({ serverId }: { serverId: string }) => {
  const [lines, setLines] = useState<LogItem[]>([]);
  const cursorRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) {
        return;
      }
      const es = new EventSource(
        `/api/servers/${serverId}/logs/stream?cursor=${cursorRef.current}`
      );
      es.addEventListener("log", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as LogItem;
        cursorRef.current = Math.max(cursorRef.current, data.seq);
        setLines((prev) =>
          prev.some((l) => l.seq === data.seq)
            ? prev
            : [...prev.slice(-500), data]
        );
      });
      es.addEventListener("close", () => {
        es.close();
        setTimeout(connect, 250);
      });
      es.addEventListener("error", () => {
        es.close();
        setTimeout(connect, 2000);
      });
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
    <Panel>
      <PanelCard>
        <div
          ref={scrollRef}
          className="flex max-h-80 flex-col gap-1 overflow-auto px-3 py-2 font-mono text-xs"
        >
          {lines.length === 0 && (
            <span className="text-sm text-muted-foreground">
              Waiting for logs…
            </span>
          )}
          {lines.map((line) => (
            <span key={line.seq} className="whitespace-pre-wrap">
              {line.line}
            </span>
          ))}
        </div>
      </PanelCard>
    </Panel>
  );
};
