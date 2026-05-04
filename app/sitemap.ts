import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

const sitemap = (): MetadataRoute.Sitemap => {
  const base = env.NEXT_PUBLIC_APP_URL;
  const lastModified = new Date();

  return [
    {
      changeFrequency: "monthly",
      lastModified,
      priority: 1,
      url: `${base}/`,
    },
    {
      changeFrequency: "monthly",
      lastModified,
      priority: 0.8,
      url: `${base}/how-it-works`,
    },
  ];
};

export default sitemap;
