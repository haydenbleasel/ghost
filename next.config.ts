import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

import { env } from "@/lib/env";

let config: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        hostname: "shared.fastly.steamstatic.com",
        pathname: "/store_item_assets/steam/apps/**",
        protocol: "https",
      },
    ],
  },
};

if (env.ANALYZE === "true") {
  config = withBundleAnalyzer()(config);
}

export default withWorkflow(config);
