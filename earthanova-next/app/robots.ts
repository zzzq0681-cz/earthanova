import type { MetadataRoute } from "next";

// Mirrors the original site setting `robots.index: false`.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
