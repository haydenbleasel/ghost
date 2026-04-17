import { vercel } from "@t3-oss/env-core/presets-zod";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_URL: z.string().min(1).url(),
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().min(1).startsWith("G-").optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().min(1).url().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).startsWith("phc_").optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().min(1).url().optional(),
  },
  extends: [vercel()],
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BOOTSTRAP_JWT_SECRET: process.env.BOOTSTRAP_JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    HETZNER_IMAGE_ID: process.env.HETZNER_IMAGE_ID,
    HETZNER_LOCATION: process.env.HETZNER_LOCATION,
    HETZNER_SERVER_TYPE: process.env.HETZNER_SERVER_TYPE,
    HETZNER_TOKEN: process.env.HETZNER_TOKEN,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  },
  server: {
    ANALYZE: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(32),

    BETTER_AUTH_URL: z.string().min(1).url(),
    BOOTSTRAP_JWT_SECRET: z.string().min(32),

    DATABASE_URL: z.string().min(1).url(),
    DIRECT_URL: z.string().min(1).url().optional(),
    HETZNER_IMAGE_ID: z.string().min(1),
    HETZNER_LOCATION: z.string().min(1).default("nbg1"),

    HETZNER_SERVER_TYPE: z.string().min(1).default("cx22"),

    HETZNER_TOKEN: z.string().min(1),
    KV_REST_API_TOKEN: z.string().min(1),

    KV_REST_API_URL: z.string().min(1).url(),

    NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),
    SENTRY_ORG: z.string().min(1).optional(),

    SENTRY_PROJECT: z.string().min(1).optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
  },
});
