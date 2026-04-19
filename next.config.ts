import { env } from "@/lib/env";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const otelRegex = /@opentelemetry\/instrumentation/;

let config: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },

  rewrites() {
    return Promise.resolve([
      {
        destination: "https://us-assets.i.posthog.com/static/:path*",
        source: "/ingest/static/:path*",
      },
      {
        destination: "https://us.i.posthog.com/:path*",
        source: "/ingest/:path*",
      },
      {
        destination: "https://us.i.posthog.com/decide",
        source: "/ingest/decide",
      },
    ]);
  },

  webpack(cfg) {
    cfg.ignoreWarnings = [{ module: otelRegex }];
    return cfg;
  },
};

if (env.VERCEL) {
  config = withSentryConfig(
    { ...config, transpilePackages: ["@sentry/nextjs"] },
    {
      automaticVercelMonitors: true,
      disableLogger: true,
      org: env.SENTRY_ORG,
      project: env.SENTRY_PROJECT,
      silent: !env.CI,
      tunnelRoute: "/monitoring",
      widenClientFileUpload: true,
    },
  );
}

if (env.ANALYZE === "true") {
  config = withBundleAnalyzer()(config);
}

export default withWorkflow(config);
