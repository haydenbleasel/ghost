// Edge-safe: imported by the middleware proxy, so this module must only use
// jose and process.env — no lib/env (zod validation) or node:crypto.
import { jwtVerify, SignJWT } from "jose";

const ISSUER = "ghost";
const AUDIENCE = "ghost-session";

export const SESSION_COOKIE = "ghost_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
// Fallback owner identity when AUTH_EMAIL is unset. Must match lib/env.ts's
// default so tokens minted via env.AUTH_EMAIL verify here in the middleware.
export const DEFAULT_AUTH_EMAIL = "admin@ghost.local";

const ownerEmail = () => process.env.AUTH_EMAIL || DEFAULT_AUTH_EMAIL;

const secret = () => new TextEncoder().encode(process.env.GHOST_SECRET);

export const mintSessionToken = (email: string): Promise<string> =>
  new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject("owner")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
    .sign(secret());

export const verifySessionToken = async (
  token: string | undefined
): Promise<{ email: string } | null> => {
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, secret(), {
      audience: AUDIENCE,
      issuer: ISSUER,
    });
    // Reject sessions minted for a previous owner so rotating AUTH_EMAIL
    // revokes them.
    if (typeof payload.email !== "string" || payload.email !== ownerEmail()) {
      return null;
    }
    return { email: payload.email };
  } catch {
    return null;
  }
};
