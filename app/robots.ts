import type { MetadataRoute } from "next";

// The whole app sits behind the owner sign-in — nothing to index.
const robots = (): MetadataRoute.Robots => ({
  rules: [{ disallow: "/", userAgent: "*" }],
});

export default robots;
