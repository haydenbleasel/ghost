import { describe, expect, test } from "bun:test";

import {
  createHetznerClient,
  HetznerApiError,
  throwIfHetznerError,
} from "@/lib/hetzner";

describe("createHetznerClient", () => {
  test("returns a client whose GET attaches the bearer token to the Hetzner API host", async () => {
    let capturedRequest: Request | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((input: Request | string | URL, init?: RequestInit) => {
      capturedRequest =
        input instanceof Request ? input : new Request(input, init);
      return Promise.resolve(new Response("{}", { status: 200 }));
    }) as typeof fetch;

    try {
      // openapi-fetch binds globalThis.fetch at client construction, so the
      // client must be created after the swap.
      const client = createHetznerClient("test-token");
      expect(typeof client.GET).toBe("function");
      // Path doesn't matter; we only care about how the client builds the request.
      await client.GET("/server_types" as never);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest?.url).toBe(
      "https://api.hetzner.cloud/v1/server_types"
    );
    expect(capturedRequest?.headers.get("Authorization")).toBe(
      "Bearer test-token"
    );
  });
});

describe("HetznerApiError", () => {
  test("formats message and exposes status/code", () => {
    const err = new HetznerApiError(429, "rate_limit_exceeded", "slow down");
    expect(err.message).toBe("Hetzner API rate_limit_exceeded: slow down");
    expect(err.status).toBe(429);
    expect(err.code).toBe("rate_limit_exceeded");
    expect(err.name).toBe("HetznerApiError");
    expect(err).toBeInstanceOf(Error);
  });

  test("isClientError true for 4xx, false for 5xx and 3xx", () => {
    expect(new HetznerApiError(400, "bad", "x").isClientError).toBe(true);
    expect(new HetznerApiError(404, "nf", "x").isClientError).toBe(true);
    expect(new HetznerApiError(499, "x", "x").isClientError).toBe(true);
    expect(new HetznerApiError(500, "x", "x").isClientError).toBe(false);
    expect(new HetznerApiError(302, "x", "x").isClientError).toBe(false);
  });
});

describe("throwIfHetznerError", () => {
  const okResponse = new Response(null, { status: 200 });

  test("does nothing when response.ok", () => {
    expect(() => throwIfHetznerError(undefined, okResponse)).not.toThrow();
  });

  test("uses error body code/message when present", () => {
    const res = new Response(null, {
      status: 422,
      statusText: "Unprocessable",
    });
    let caught: HetznerApiError | undefined;
    try {
      throwIfHetznerError(
        { error: { code: "invalid_input", message: "bad field" } },
        res
      );
    } catch (error) {
      caught = error as HetznerApiError;
    }
    expect(caught).toBeInstanceOf(HetznerApiError);
    expect(caught?.status).toBe(422);
    expect(caught?.code).toBe("invalid_input");
    expect(caught?.message).toBe("Hetzner API invalid_input: bad field");
  });

  test("falls back to status/statusText when error body is missing", () => {
    const res = new Response(null, { status: 503, statusText: "Unavailable" });
    let caught: HetznerApiError | undefined;
    try {
      throwIfHetznerError(undefined, res);
    } catch (error) {
      caught = error as HetznerApiError;
    }
    expect(caught?.status).toBe(503);
    expect(caught?.code).toBe("503");
    expect(caught?.message).toBe("Hetzner API 503: Unavailable");
  });
});
