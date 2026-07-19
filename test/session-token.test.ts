import { describe, expect, test } from "bun:test";

import { SignJWT } from "jose";

import { mintSessionToken, verifySessionToken } from "@/lib/session-token";

const SESSION_ISSUER = "ghost";
const SESSION_AUDIENCE = "ghost-session";
const sessionSecret = new TextEncoder().encode(process.env.GHOST_SECRET);

const ownerEmail = process.env.AUTH_EMAIL ?? "";

describe("session token", () => {
  test("mint then verify returns the owner email", async () => {
    const token = await mintSessionToken(ownerEmail);
    expect(token.split(".").length).toBe(3);

    const result = await verifySessionToken(token);
    expect(result).toEqual({ email: ownerEmail });
  });

  test("verify returns null for a missing token", async () => {
    expect(await verifySessionToken("")).toBeNull();
  });

  test("verify returns null for an expired token", async () => {
    const token = await new SignJWT({ email: ownerEmail })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(SESSION_ISSUER)
      .setAudience(SESSION_AUDIENCE)
      .setSubject("owner")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(sessionSecret);
    expect(await verifySessionToken(token)).toBeNull();
  });

  test("verify returns null for a tampered token", async () => {
    const token = await mintSessionToken(ownerEmail);
    const [header, payload, sig] = token.split(".");
    // Flip the first signature char; avoid the last char, whose low base64
    // bits are padding and don't affect the decoded signature bytes.
    const flipped = sig[0] === "A" ? "B" : "A";
    const tampered = `${header}.${payload}.${flipped}${sig.slice(1)}`;
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  test("verify returns null when the email claim is not the owner", async () => {
    const token = await mintSessionToken("previous-owner@example.com");
    expect(await verifySessionToken(token)).toBeNull();
  });
});
