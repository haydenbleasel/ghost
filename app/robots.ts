import type { MetadataRoute } from "next";

import { SEO_URL } from "@/lib/env";

const robots = (): MetadataRoute.Robots => ({
  rules: [
    {
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/sign-in", "/sign-up"],
      userAgent: "*",
    },
  ],
  sitemap: `${SEO_URL}/sitemap.xml`,
});

export default robots;
