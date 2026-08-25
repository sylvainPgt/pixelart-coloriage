import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      { userAgent: ["OAI-SearchBot", "ChatGPT-User"], allow: "/", disallow: "/api/" },
      { userAgent: ["PerplexityBot", "Perplexity-User"], allow: "/", disallow: "/api/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
