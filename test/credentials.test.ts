import { describe, expect, test } from "bun:test";

import { verifyCredentials } from "@/lib/session";

const email = process.env.AUTH_EMAIL ?? "";
const password = process.env.AUTH_PASSWORD ?? "";

describe("verifyCredentials", () => {
  test("accepts the configured owner credentials", () => {
    expect(verifyCredentials(email, password)).toBe(true);
  });

  test("rejects a wrong email", () => {
    expect(verifyCredentials("intruder@example.com", password)).toBe(false);
  });

  test("rejects a wrong password", () => {
    expect(verifyCredentials(email, "wrong-password")).toBe(false);
  });

  test("rejects empty credentials", () => {
    expect(verifyCredentials("", "")).toBe(false);
  });

  test("handles inputs of a different length without throwing", () => {
    expect(verifyCredentials(`${email}x`, `${password}longer`)).toBe(false);
    expect(verifyCredentials(email.slice(0, 3), password.slice(0, 3))).toBe(
      false
    );
  });
});
