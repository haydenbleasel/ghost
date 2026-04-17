import "server-only";
import { env } from "@/lib/env";
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  token: env.KV_REST_API_TOKEN,
  url: env.KV_REST_API_URL,
});
