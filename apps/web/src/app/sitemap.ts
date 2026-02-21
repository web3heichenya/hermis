import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/seo";

const routes = ["", "/dashboard", "/missions", "/reviews", "/analytics"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => {
    const url = (path ? `${siteConfig.url}${path}` : siteConfig.url).replace(/(?<!:)\/\//g, "/");

    return {
      url,
      lastModified: new Date(),
      changeFrequency: path === "" ? "daily" : "weekly",
      priority: path === "" ? 1 : 0.8,
    } satisfies MetadataRoute.Sitemap[number];
  });
}
