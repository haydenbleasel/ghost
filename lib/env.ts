import { vercel } from '@t3-oss/env-core/presets-zod';
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  extends: [vercel()],
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).startsWith('phc_').optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().min(1).url().optional(),
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z
      .string()
      .min(1)
      .startsWith('G-')
      .optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().min(1).url().optional(),
    NEXT_PUBLIC_APP_URL: z.string().min(1).url(),
  },
  server: {
    DATABASE_URL: z.string().min(1).url(),
    DIRECT_URL: z.string().min(1).url().optional(),

    UPSTASH_REDIS_REST_URL: z.string().min(1).url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

    HETZNER_TOKEN: z.string().min(1),
    HETZNER_IMAGE_ID: z.string().min(1),
    HETZNER_LOCATION: z.string().min(1).default('nbg1'),
    HETZNER_SERVER_TYPE: z.string().min(1).default('cx22'),

    BOOTSTRAP_JWT_SECRET: z.string().min(32),

    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().min(1).url(),

    STRIPE_SECRET_KEY: z.string().min(1).optional(),

    SENTRY_ORG: z.string().min(1).optional(),
    SENTRY_PROJECT: z.string().min(1).optional(),

    NEXT_RUNTIME: z.enum(['nodejs', 'edge']).optional(),
    ANALYZE: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    HETZNER_TOKEN: process.env.HETZNER_TOKEN,
    HETZNER_IMAGE_ID: process.env.HETZNER_IMAGE_ID,
    HETZNER_LOCATION: process.env.HETZNER_LOCATION,
    HETZNER_SERVER_TYPE: process.env.HETZNER_SERVER_TYPE,
    BOOTSTRAP_JWT_SECRET: process.env.BOOTSTRAP_JWT_SECRET,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    ANALYZE: process.env.ANALYZE,
  },
});
