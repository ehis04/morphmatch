import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return [];
  return ["/", "/match", "/versus", "/athletes", "/privacy"].map((path) => ({
    url: new URL(path, siteUrl).href,
  }));
}
