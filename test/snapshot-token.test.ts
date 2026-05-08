import { describe, expect, test } from "bun:test";

import { errors as joseErrors, SignJWT } from "jose";

import {
  mintSnapshotDownloadToken,
  verifySnapshotDownloadToken,
} from "@/lib/agent/snapshot-token";
import { env } from "@/lib/env";

const SNAPSHOT_AUDIENCE = "ghost-snapshot-download";
const SNAPSHOT_ISSUER = "ghost";
const snapshotSecret = new TextEncoder().encode(env.BOOTSTRAP_JWT_SECRET);

describe("snapshot download token", () => {
  test("mint then verify returns the original buildId", async () => {
    const token = await mintSnapshotDownloadToken({
      buildId: "build_abc",
      ttlSeconds: 60,
    });
    expect(typeof token).toBe("string");
    // header.payload.sig
    expect(token.split(".").length).toBe(3);

    const result = await verifySnapshotDownloadToken(token);
    expect(result.buildId).toBe("build_abc");
  });

  test("verify rejects an expired token", async () => {
    const token = await mintSnapshotDownloadToken({
      buildId: "build_expired",
      ttlSeconds: -10,
    });
    await expect(verifySnapshotDownloadToken(token)).rejects.toBeInstanceOf(
      joseErrors.JWTExpired
    );
  });

  test("verify rejects a token missing the subject claim", async () => {
    // Mint a structurally-valid token (correct issuer/audience/secret) but with
    // no `sub`, so we exercise the explicit validation rather than jose's
    // signature/claim checks.
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(SNAPSHOT_ISSUER)
      .setAudience(SNAPSHOT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
      .sign(snapshotSecret);
    await expect(verifySnapshotDownloadToken(token)).rejects.toThrow(
      /Invalid snapshot download token/u
    );
  });

  test("verify rejects a tampered token", async () => {
    const token = await mintSnapshotDownloadToken({
      buildId: "build_tamper",
      ttlSeconds: 60,
    });
    const [header, payload, sig] = token.split(".");
    // Flip the first signature char; avoid the last char, whose low base64
    // bits are padding and don't affect the decoded signature bytes.
    const flipped = sig[0] === "A" ? "B" : "A";
    const tampered = `${header}.${payload}.${flipped}${sig.slice(1)}`;
    await expect(verifySnapshotDownloadToken(tampered)).rejects.toThrow();
  });
});
