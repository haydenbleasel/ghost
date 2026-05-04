import { describe, expect, test } from "bun:test";

import { canonicalize, fromBase64Url, toBase64Url } from "@/protocol";

describe("canonicalize", () => {
  test("joins fields with newlines in fixed order", () => {
    expect(
      canonicalize({
        body: "{}",
        method: "post",
        nonce: "n1",
        path: "/api/x?y=1",
        timestamp: "1700000000000",
      })
    ).toBe("POST\n/api/x?y=1\n1700000000000\nn1\n{}");
  });

  test("uppercases the method", () => {
    const result = canonicalize({
      body: "",
      method: "get",
      nonce: "n",
      path: "/",
      timestamp: "1",
    });
    expect(result.startsWith("GET\n")).toBe(true);
  });

  test("preserves empty body", () => {
    expect(
      canonicalize({
        body: "",
        method: "GET",
        nonce: "n",
        path: "/",
        timestamp: "1",
      })
    ).toBe("GET\n/\n1\nn\n");
  });
});

describe("base64url", () => {
  test("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
  });

  test("uses url-safe alphabet (no +, /, =)", () => {
    // Chosen to produce '+' and '/' in standard base64.
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf, 0xfe, 0xff, 0xff]);
    const encoded = toBase64Url(bytes);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });

  test("decodes input without padding", () => {
    // 'AQ' decodes to a single byte (0x01); standard base64 would be 'AQ=='.
    expect(fromBase64Url("AQ")).toEqual(new Uint8Array([0x01]));
  });

  test("encodes empty input as empty string", () => {
    expect(toBase64Url(new Uint8Array())).toBe("");
    expect(fromBase64Url("")).toEqual(new Uint8Array());
  });
});
