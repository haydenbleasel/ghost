"use client";
import Anser from "anser";
import { useEffect, useMemo, useRef, useState } from "react";

import { Panel, PanelCard } from "@/components/panel";

interface LogItem {
  id: string;
  seq: number;
  stream: string;
  line: string;
  ts: string;
}

const AnsiLine = ({ text }: { text: string }) => {
  const parts = useMemo(
    () => Anser.ansiToJson(text, { remove_empty: true, json: true }),
    [text]
  );
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => (
        <AnsiPart key={i} part={part} />
      ))}
    </span>
  );
};

const AnsiPart = ({ part }: { part: Anser.AnserJsonEntry }) => {
  const style: React.CSSProperties = {};
  if (part.fg) {
    style.color = `rgb(${part.fg})`;
  }
  if (part.bg) {
    style.backgroundColor = `rgb(${part.bg})`;
  }
  if (part.decorations.includes("bold")) {
    style.fontWeight = "bold";
  }
  if (part.decorations.includes("italic")) {
    style.fontStyle = "italic";
  }
  if (part.decorations.includes("underline")) {
    style.textDecoration = "underline";
  }
  if (part.decorations.includes("dim")) {
    style.opacity = 0.7;
  }
  return <span style={style}>{part.content}</span>;
};

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
            <AnsiLine key={line.seq} text={line.line} />
          ))}
        </div>
      </PanelCard>
    </Panel>
  );
};
