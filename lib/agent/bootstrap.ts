import 'server-only';
import crypto from 'node:crypto';
import { env } from '@/lib/env';
import { BOOTSTRAP_TTL_SECONDS } from '@/protocol';
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(env.BOOTSTRAP_JWT_SECRET);
const ISSUER = 'ghost';
const AUDIENCE = 'ghost-agent';

export async function mintBootstrapJwt(input: {
  serverId: string;
  jti?: string;
}): Promise<{ token: string; jti: string; expiresAt: Date }> {
  const jti = input.jti ?? crypto.randomUUID();
  const expiresAt = new Date(Date.now() + BOOTSTRAP_TTL_SECONDS * 1000);

  const token = await new SignJWT({ serverId: input.serverId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(input.serverId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);

  return { token, jti, expiresAt };
}

export async function verifyBootstrapJwt(
  token: string
): Promise<{ serverId: string; jti: string }> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  const serverId = payload.sub;
  const jti = payload.jti;

  if (!serverId || !jti) {
    throw new Error('Invalid bootstrap token');
  }

  return { serverId, jti };
}
