import { describe, expect, test } from "bun:test";

import {
  formatProviderError,
  MissingProviderCredentialsError,
  ProviderApiError,
} from "@/lib/providers/errors";

describe("MissingProviderCredentialsError", () => {
  test("is an Error with the documented name and message", () => {
    const err = new MissingProviderCredentialsError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("MissingProviderCredentialsError");
    expect(err.message).toBe("Provider credentials not configured");
  });
});

describe("ProviderApiError", () => {
  test("formats message and exposes status/code", () => {
    const err = new ProviderApiError(429, "rate_limit_exceeded", "slow down");
    expect(err.message).toBe("Provider API rate_limit_exceeded: slow down");
    expect(err.status).toBe(429);
    expect(err.code).toBe("rate_limit_exceeded");
    expect(err.name).toBe("ProviderApiError");
    expect(err).toBeInstanceOf(Error);
  });

  test("isClientError true for 4xx, false for 5xx and 3xx", () => {
    expect(new ProviderApiError(400, "bad", "x").isClientError).toBe(true);
    expect(new ProviderApiError(404, "nf", "x").isClientError).toBe(true);
    expect(new ProviderApiError(499, "x", "x").isClientError).toBe(true);
    expect(new ProviderApiError(500, "x", "x").isClientError).toBe(false);
    expect(new ProviderApiError(302, "x", "x").isClientError).toBe(false);
  });
});

describe("formatProviderError", () => {
  test("uses error body message when present", () => {
    const res = new Response(null, {
      status: 422,
      statusText: "Unprocessable",
    });
    expect(formatProviderError({ error: { message: "bad field" } }, res)).toBe(
      "bad field"
    );
  });

  test("falls back to statusText when error body is missing", () => {
    const res = new Response(null, { status: 503, statusText: "Unavailable" });
    expect(formatProviderError(undefined, res)).toBe("Unavailable");
  });
});
