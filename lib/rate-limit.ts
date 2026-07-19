import "server-only";
import { headers } from "next/headers";

import { redis } from "./redis";

const WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES = 10;

const key = (ip: string) => `signin-failures:${ip}`;

export const clientIp = async (): Promise<string> => {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
};

// Fail open on Redis errors: a broken rate limiter shouldn't lock the owner
// out of their own instance.
export const isSignInRateLimited = async (ip: string): Promise<boolean> => {
  try {
    const failures = await redis.get<number>(key(ip));
    return (failures ?? 0) >= MAX_FAILURES;
  } catch {
    return false;
  }
};

export const recordSignInFailure = async (ip: string): Promise<void> => {
  try {
    await redis.incr(key(ip));
    // Refresh the TTL on every failure rather than only the first: if the
    // initial EXPIRE is ever missed (separate REST call, silently swallowed
    // here), the counter would otherwise live forever and permanently lock
    // the owner out once it crosses the threshold.
    await redis.expire(key(ip), WINDOW_SECONDS);
  } catch {
    // best-effort
  }
};
