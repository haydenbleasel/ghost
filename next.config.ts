import { env } from '@/lib/env';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';

const otelRegex = /@opentelemetry\/instrumentation/;

let config: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },

  webpack(cfg) {
    cfg.ignoreWarnings = [{ module: otelRegex }];
    return cfg;
  },
};

config = withWorkflow(config);

if (env.VERCEL) {
  config = withSentryConfig(
    { ...config, transpilePackages: ['@sentry/nextjs'] },
    {
      org: env.SENTRY_ORG,
      project: env.SENTRY_PROJECT,
      silent: !env.CI,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
      disableLogger: true,
      automaticVercelMonitors: true,
    }
  );
}

if (env.ANALYZE === 'true') {
  config = withBundleAnalyzer()(config);
}

export default config;
