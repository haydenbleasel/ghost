import { describe, expect, test } from "bun:test";

import { MissingHetznerCredentialsError } from "@/lib/hetzner/errors";

describe("MissingHetznerCredentialsError", () => {
  test("is an Error with the documented name and message", () => {
    const err = new MissingHetznerCredentialsError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("MissingHetznerCredentialsError");
    expect(err.message).toBe("Hetzner credentials not configured");
  });
});
