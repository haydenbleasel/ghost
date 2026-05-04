import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

const robots = (): MetadataRoute.Robots => ({
  rules: [
    {
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/sign-in", "/sign-up"],
      userAgent: "*",
    },
  ],
  sitemap: `${env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
});

export default robots;
