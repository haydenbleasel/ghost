import "server-only";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

export const redis = new Redis({
  token: env.KV_REST_API_TOKEN,
  url: env.KV_REST_API_URL,
});
