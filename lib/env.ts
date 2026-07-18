import { vercel } from "@t3-oss/env-core/presets-zod";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { DEFAULT_AUTH_EMAIL } from "./session-token";

export const env = createEnv({
  client: {},
  extends: [vercel()],
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    AUTH_EMAIL: process.env.AUTH_EMAIL,
    AUTH_PASSWORD: process.env.AUTH_PASSWORD,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    GHOST_SECRET: process.env.GHOST_SECRET,
    HETZNER_API_TOKEN: process.env.HETZNER_API_TOKEN,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    VERCEL_AUTOMATION_BYPASS_SECRET:
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  },
  server: {
    ANALYZE: z.string().optional(),
    AUTH_EMAIL: z.string().min(1).email().default(DEFAULT_AUTH_EMAIL),
    AUTH_PASSWORD: z.string().min(8),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).startsWith("vercel_blob_rw_"),
    DATABASE_URL: z.string().min(1).url(),
    DATABASE_URL_UNPOOLED: z.string().min(1).url().optional(),

    // Single signing secret for the session cookie, agent bootstrap JWTs, and
    // snapshot download tokens — the audiences are namespaced per use.
    GHOST_SECRET: z.string().min(32),
    HETZNER_API_TOKEN: z.string().min(1),
    KV_REST_API_TOKEN: z.string().min(1),

    KV_REST_API_URL: z.string().min(1).url(),

    NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),
    VERCEL_AUTOMATION_BYPASS_SECRET: z.string().min(1).optional(),
  },
});

const LOCAL_URL = "http://localhost:3000";

const productionUrl = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : null;
const branchUrl = env.VERCEL_BRANCH_URL
  ? `https://${env.VERCEL_BRANCH_URL}`
  : null;

// Always points at the production deployment. Used for canonical SEO surfaces
// (sitemap, robots, metadataBase, Schema.org url) so previews don't leak their
// .vercel.app hostname into search indexes.
export const SEO_URL = productionUrl ?? LOCAL_URL;

// Points at the current deployment so Hetzner agents call back to whichever
// deployment provisioned them. Production deployments use the project's prod
// URL; previews use the branch-stable URL (so callbacks survive redeploys of
// the same branch); dev falls back to localhost.
export const API_URL =
  env.VERCEL_ENV === "production"
    ? (productionUrl ?? LOCAL_URL)
    : (branchUrl ?? LOCAL_URL);

// Identity used to scope per-user snapshot images so a build on one deployment
// can't clobber another deployment's golden image. Production shares one
// snapshot; preview branches each get their own; local dev is its own bucket.
export const SNAPSHOT_ENVIRONMENT: string = (() => {
  if (env.VERCEL_ENV === "production") {
    return "production";
  }
  if (env.VERCEL_ENV === "preview") {
    return `preview:${env.VERCEL_GIT_COMMIT_REF ?? "unknown"}`;
  }
  return "development";
})();
