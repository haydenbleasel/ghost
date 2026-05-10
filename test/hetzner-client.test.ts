import { describe, expect, test } from "bun:test";

import { createHetznerClient } from "@/lib/providers/hetzner/client";

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
