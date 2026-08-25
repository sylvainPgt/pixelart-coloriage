import type { MetadataRoute } from "next";
import { getGuideByKey, guides } from "@/lib/seo-content";
import { SITE_URL } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const homepages: MetadataRoute.Sitemap = ["fr", "en"].map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: new Date("2026-08-25"),
    changeFrequency: "weekly" as const,
    priority: locale === "fr" ? 1 : 0.9,
    alternates: {
      languages: {
        "fr-FR": `${SITE_URL}/fr`,
        "en-US": `${SITE_URL}/en`,
        "x-default": `${SITE_URL}/fr`,
      },
    },
  }));

  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => {
    const frenchGuide = getGuideByKey("fr", guide.key);
    const englishGuide = getGuideByKey("en", guide.key);
    return {
      url: `${SITE_URL}/${guide.locale}/guides/${guide.slug}`,
      lastModified: new Date("2026-08-25"),
      changeFrequency: "monthly" as const,
      priority: 0.75,
      alternates: {
        languages: {
          "fr-FR": `${SITE_URL}/fr/guides/${frenchGuide?.slug}`,
          "en-US": `${SITE_URL}/en/guides/${englishGuide?.slug}`,
          "x-default": `${SITE_URL}/en/guides/${englishGuide?.slug}`,
        },
      },
    };
  });

  return [...homepages, ...guidePages];
}
