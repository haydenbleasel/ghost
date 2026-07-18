import { vercel } from "@t3-oss/env-core/presets-zod";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z
      .string()
      .min(1)
      .startsWith("G-")
      .optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().min(1).url().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).startsWith("phc_").optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().min(1).url().optional(),
  },
  extends: [vercel()],
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    AUTH_EMAIL: process.env.AUTH_EMAIL,
    AUTH_PASSWORD: process.env.AUTH_PASSWORD,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    BOOTSTRAP_JWT_SECRET: process.env.BOOTSTRAP_JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    HETZNER_API_TOKEN: process.env.HETZNER_API_TOKEN,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SESSION_SECRET: process.env.SESSION_SECRET,
    VERCEL_AUTOMATION_BYPASS_SECRET:
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  },
  server: {
    ANALYZE: z.string().optional(),
    AUTH_EMAIL: z.string().min(1).email(),
    AUTH_PASSWORD: z.string().min(8),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).startsWith("vercel_blob_rw_"),
    BOOTSTRAP_JWT_SECRET: z.string().min(32),

    DATABASE_URL: z.string().min(1).url(),
    DATABASE_URL_UNPOOLED: z.string().min(1).url().optional(),
    HETZNER_API_TOKEN: z.string().min(1),
    KV_REST_API_TOKEN: z.string().min(1),

    KV_REST_API_URL: z.string().min(1).url(),

    NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),
    SENTRY_ORG: z.string().min(1).optional(),

    SENTRY_PROJECT: z.string().min(1).optional(),
    SESSION_SECRET: z.string().min(32),
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
