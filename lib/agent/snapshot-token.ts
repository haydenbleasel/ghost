import "server-only";
import { jwtVerify, SignJWT } from "jose";

import { env } from "@/lib/env";

const secret = new TextEncoder().encode(env.BOOTSTRAP_JWT_SECRET);
const ISSUER = "ghost";
const AUDIENCE = "ghost-snapshot-download";

export const mintSnapshotDownloadToken = (input: {
  buildId: string;
  ttlSeconds: number;
}): Promise<string> =>
  new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(input.buildId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + input.ttlSeconds)
    .sign(secret);

export const verifySnapshotDownloadToken = async (
  token: string
): Promise<{ buildId: string }> => {
  const { payload } = await jwtVerify(token, secret, {
    audience: AUDIENCE,
    issuer: ISSUER,
  });
  const buildId = payload.sub;
  if (!buildId) {
    throw new Error("Invalid snapshot download token");
  }
  return { buildId };
};
