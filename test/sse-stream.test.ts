import { describe, expect, test } from "bun:test";

import { createSseResponse } from "@/lib/sse/stream";

const getReader = (res: Response) => {
  if (!res.body) {
    throw new Error("expected SSE response to have a body");
  }
  return res.body.getReader();
};

const readChunks = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  predicate: (text: string) => boolean,
  timeoutMs = 1000
) => {
  const decoder = new TextDecoder();
  const deadline = Date.now() + timeoutMs;
  let buffer = "";
  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) {
      return buffer;
    }
    buffer += decoder.decode(value, { stream: true });
    if (predicate(buffer)) {
      return buffer;
    }
  }
  throw new Error(`timed out waiting for predicate; buffer=\n${buffer}`);
};

describe("createSseResponse", () => {
  test("sets the SSE response headers", () => {
    const res = createSseResponse({
      fetchSince: () => Promise.resolve([]),
      initialCursor: 0,
    });
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(res.headers.get("Connection")).toBe("keep-alive");
    expect(res.headers.get("X-Accel-Buffering")).toBe("no");
    void res.body?.cancel();
  });

  test("emits fetched events as named SSE messages and advances the cursor across polls", async () => {
    // Each call returns the next event only if the cursor matches the expected
    // value, proving the cursor is being passed forward between polls.
    const res = createSseResponse({
      eventName: "tick",
      fetchSince: (cursor) => {
        if (cursor === 0) {
          return Promise.resolve([{ event: { value: 1 }, seq: 1 }]);
        }
        if (cursor === 1) {
          return Promise.resolve([{ event: { value: 2 }, seq: 2 }]);
        }
        return Promise.resolve([]);
      },
      initialCursor: 0,
      pollMs: 5,
    });

    const reader = getReader(res);
    const text = await readChunks(reader, (b) => b.includes('"value":2'));
    expect(text).toContain("event: tick\n");
    expect(text).toContain('data: {"value":1}');
    expect(text).toContain('data: {"value":2}');
    await reader.cancel();
  });

  test("surfaces fetch errors as an 'error' event", async () => {
    const res = createSseResponse({
      fetchSince: () => Promise.reject(new Error("boom")),
      initialCursor: 0,
      pollMs: 5,
    });
    const reader = getReader(res);
    const text = await readChunks(reader, (b) => b.includes("event: error"));
    expect(text).toContain("event: error\n");
    expect(text).toContain('"message":"boom"');
    await reader.cancel();
  });

  test("defaults to 'message' event name when none is provided", async () => {
    const res = createSseResponse({
      fetchSince: (cursor) =>
        cursor === 0
          ? Promise.resolve([{ event: { hello: true }, seq: 1 }])
          : Promise.resolve([]),
      initialCursor: 0,
      pollMs: 5,
    });
    const reader = getReader(res);
    const text = await readChunks(reader, (b) => b.includes('"hello":true'));
    expect(text).toContain("event: message\n");
    await reader.cancel();
  });
});
