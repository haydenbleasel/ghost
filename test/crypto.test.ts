import { describe, expect, test } from "bun:test";

import { decryptSecret, encryptSecret } from "@/lib/crypto";

describe("encryptSecret/decryptSecret", () => {
  test("round-trips a plaintext", () => {
    const plaintext = "hunter2";
    expect(decryptSecret(encryptSecret(plaintext))).toBe(plaintext);
  });

  test("round-trips unicode and empty strings", () => {
    expect(decryptSecret(encryptSecret(""))).toBe("");
    expect(decryptSecret(encryptSecret("héllo 🐈‍⬛"))).toBe("héllo 🐈‍⬛");
  });

  test("produces a fresh ciphertext for each call (random IV)", () => {
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same");
    expect(decryptSecret(b)).toBe("same");
  });

  test("rejects payloads shorter than IV+tag", () => {
    const tooShort = Buffer.alloc(10).toString("base64");
    expect(() => decryptSecret(tooShort)).toThrow(/malformed/i);
  });

  test("rejects ciphertext whose auth tag has been tampered", () => {
    const encrypted = encryptSecret("payload");
    const buf = Buffer.from(encrypted, "base64");
    // Replace a byte inside the auth-tag region (offset 12..28) so GCM
    // authentication fails on decrypt.
    buf[15] = (buf[15] + 1) % 256;
    const tampered = buf.toString("base64");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
