import { describe, expect, test } from "bun:test";

import { errors as joseErrors } from "jose";

import { mintBootstrapJwt, verifyBootstrapJwt } from "@/lib/agent/bootstrap";

describe("bootstrap JWT", () => {
  test("mint then verify round-trips serverId and jti", async () => {
    const minted = await mintBootstrapJwt({ serverId: "srv_1" });
    expect(typeof minted.token).toBe("string");
    expect(minted.jti).toMatch(/^[0-9a-f-]{36}$/);
    expect(minted.expiresAt).toBeInstanceOf(Date);
    expect(minted.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const verified = await verifyBootstrapJwt(minted.token);
    expect(verified.serverId).toBe("srv_1");
    expect(verified.jti).toBe(minted.jti);
  });

  test("respects an explicit jti", async () => {
    const { token, jti } = await mintBootstrapJwt({
      jti: "fixed-id",
      serverId: "srv_2",
    });
    expect(jti).toBe("fixed-id");
    const verified = await verifyBootstrapJwt(token);
    expect(verified.jti).toBe("fixed-id");
  });

  test("rejects a token with the wrong audience/issuer", async () => {
    // Snapshot tokens are signed with the same secret but different aud.
    const { mintSnapshotDownloadToken } =
      await import("@/lib/agent/snapshot-token");
    const wrongAud = await mintSnapshotDownloadToken({
      buildId: "b",
      ttlSeconds: 60,
    });
    await expect(verifyBootstrapJwt(wrongAud)).rejects.toBeInstanceOf(
      joseErrors.JWTClaimValidationFailed
    );
  });
});
