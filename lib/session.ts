import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "./env";
import {
  mintSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifySessionToken,
} from "./session-token";

export interface SessionUser {
  email: string;
}

export const getSession = async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
};

export const requireUser = async (): Promise<SessionUser> => {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest();

// Hashing both sides first sidesteps timingSafeEqual's equal-length
// requirement and avoids leaking credential length.
const safeEqual = (input: string, expected: string) =>
  timingSafeEqual(sha256(input), sha256(expected));

export const verifyCredentials = (email: string, password: string): boolean => {
  // Evaluate both comparisons before combining so a wrong email doesn't
  // short-circuit past the password check (no early-exit timing signal).
  const emailOk = safeEqual(email, env.AUTH_EMAIL);
  const passwordOk = safeEqual(password, env.AUTH_PASSWORD);
  return emailOk && passwordOk;
};

export const createSession = async (): Promise<void> => {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await mintSessionToken(env.AUTH_EMAIL), {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
};

export const destroySession = async (): Promise<void> => {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
};
