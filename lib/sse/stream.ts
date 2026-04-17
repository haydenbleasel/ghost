import 'server-only';

const KEEPALIVE_MS = 15_000;
const MAX_DURATION_MS = 270_000;
const DEFAULT_POLL_MS = 1_000;

type StreamEvent = { seq: number; event: unknown };

export type SseOpts = {
  eventName?: string;
  pollMs?: number;
  initialCursor: number;
  fetchSince: (cursor: number) => Promise<StreamEvent[]>;
};

export function createSseResponse(opts: SseOpts): Response {
  const encoder = new TextEncoder();
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  const event = opts.eventName ?? 'message';

  let cursor = opts.initialCursor;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const write = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      };

      const writeEvent = (name: string, data: unknown) => {
        write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const writeComment = (text: string) => {
        write(`: ${text}\n\n`);
      };

      const keepalive = setInterval(() => writeComment('keepalive'), KEEPALIVE_MS);

      const deadline = Date.now() + MAX_DURATION_MS;

      try {
        while (!closed && Date.now() < deadline) {
          const items = await opts.fetchSince(cursor);
          for (const item of items) {
            writeEvent(event, item.event);
            cursor = item.seq;
          }

          if (closed) break;

          const remaining = deadline - Date.now();
          if (remaining <= 0) break;

          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(pollMs, remaining))
          );
        }

        if (!closed) {
          writeEvent('close', { reason: 'max_duration', cursor });
        }
      } catch (error) {
        writeEvent('error', {
          message: error instanceof Error ? error.message : 'stream error',
        });
      } finally {
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          /* noop */
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
