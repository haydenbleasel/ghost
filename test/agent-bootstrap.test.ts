import { describe, expect, test } from "bun:test";

import { errors as joseErrors, SignJWT } from "jose";

import { mintBootstrapJwt, verifyBootstrapJwt } from "@/lib/agent/bootstrap";
import { env } from "@/lib/env";

const BOOTSTRAP_AUDIENCE = "ghost-agent";
const BOOTSTRAP_ISSUER = "ghost";
const bootstrapSecret = new TextEncoder().encode(env.BOOTSTRAP_JWT_SECRET);

const signWithoutClaim = (claim: "sub" | "jti") => {
  const jwt = new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(BOOTSTRAP_ISSUER)
    .setAudience(BOOTSTRAP_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 60);
  if (claim === "jti") {
    jwt.setSubject("srv_x");
  } else {
    jwt.setJti("jti_x");
  }
  return jwt.sign(bootstrapSecret);
};

describe("bootstrap JWT", () => {
  test("mint then verify round-trips serverId and jti", async () => {
    const minted = await mintBootstrapJwt({ serverId: "srv_1" });
    expect(typeof minted.token).toBe("string");
    expect(minted.jti).toMatch(/^[0-9a-f-]{36}$/u);
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

  test("rejects a token missing the subject claim", async () => {
    const token = await signWithoutClaim("sub");
    await expect(verifyBootstrapJwt(token)).rejects.toThrow(
      /Invalid bootstrap token/u
    );
  });

  test("rejects a token missing the jti claim", async () => {
    const token = await signWithoutClaim("jti");
    await expect(verifyBootstrapJwt(token)).rejects.toThrow(
      /Invalid bootstrap token/u
    );
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
