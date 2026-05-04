"use client";
import Anser from "anser";
import { useEffect, useMemo, useRef, useState } from "react";
import { StickToBottom } from "use-stick-to-bottom";

interface LogItem {
  id: string;
  seq: number;
  stream: string;
  line: string;
  ts: string;
}

// Some upstream log producers emit ANSI in caret notation (`^[[0m`) rather than
// the raw ESC byte. Convert it back so anser can parse it.
const CARET_CSI = /\^\[\[([0-9;]*)([a-zA-Z])/g;
const normalizeAnsi = (text: string) =>
  text.replace(CARET_CSI, "\x1b[$1$2");

const AnsiLine = ({ text }: { text: string }) => {
  const parts = useMemo(
    () =>
      Anser.ansiToJson(normalizeAnsi(text), {
        remove_empty: true,
        json: true,
      }),
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

  return (
    <StickToBottom
      className="flex flex-1 flex-col"
      initial="instant"
      resize="smooth"
    >
      <StickToBottom.Content className="flex flex-col gap-1 font-mono text-xs">
        {lines.length === 0 && (
          <span className="px-3 py-2 text-sm text-muted-foreground">
            Waiting for logs…
          </span>
        )}
        {lines.map((line) => (
          <AnsiLine key={line.seq} text={line.line} />
        ))}
      </StickToBottom.Content>
    </StickToBottom>
  );
};
