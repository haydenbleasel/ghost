import "server-only";
import { setTimeout as delay } from "node:timers/promises";

const KEEPALIVE_MS = 15_000;
const MAX_DURATION_MS = 270_000;
const DEFAULT_POLL_MS = 1000;

interface StreamEvent {
  seq: number;
  event: unknown;
}

export interface SseOpts {
  eventName?: string;
  pollMs?: number;
  initialCursor: number;
  fetchSince: (cursor: number) => Promise<StreamEvent[]>;
}

export const createSseResponse = (opts: SseOpts): Response => {
  const encoder = new TextEncoder();
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  const event = opts.eventName ?? "message";

  let cursor = opts.initialCursor;
  const abort = new AbortController();

  const stream = new ReadableStream({
    cancel() {
      abort.abort();
    },
    async start(controller) {
      const write = (data: string) => {
        if (abort.signal.aborted) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          abort.abort();
        }
      };

      const writeEvent = (name: string, data: unknown) => {
        write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const writeComment = (text: string) => {
        write(`: ${text}\n\n`);
      };

      const keepalive = setInterval(() => writeComment("keepalive"), KEEPALIVE_MS);

      const deadline = Date.now() + MAX_DURATION_MS;

      try {
        while (!abort.signal.aborted && Date.now() < deadline) {
          const items = await opts.fetchSince(cursor);
          for (const item of items) {
            writeEvent(event, item.event);
            cursor = item.seq;
          }

          if (abort.signal.aborted) {
            break;
          }

          const remaining = deadline - Date.now();
          if (remaining <= 0) {
            break;
          }

          try {
            await delay(Math.min(pollMs, remaining), undefined, { signal: abort.signal });
          } catch {
            // aborted
          }
        }

        if (!abort.signal.aborted) {
          writeEvent("close", { cursor, reason: "max_duration" });
        }
      } catch (error) {
        writeEvent("error", {
          message: error instanceof Error ? error.message : "stream error",
        });
      } finally {
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          // noop
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
};
