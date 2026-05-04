import { describe, expect, test } from "bun:test";

import { HetznerApiError, throwIfHetznerError } from "@/lib/hetzner";

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
