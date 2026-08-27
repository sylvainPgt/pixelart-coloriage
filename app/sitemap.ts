import type { MetadataRoute } from "next";
import { getGuideByKey, guides } from "@/lib/seo-content";
import { SITE_URL } from "@/lib/site-metadata";
import { getTrustPageByKey, getTrustPages } from "@/lib/trust-content";

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

  const studioPages: MetadataRoute.Sitemap = ["fr", "en"].map((locale) => ({
    url: `${SITE_URL}/${locale}/studio`,
    lastModified: new Date("2026-08-27"),
    changeFrequency: "weekly" as const,
    priority: 0.9,
    alternates: {
      languages: {
        "fr-FR": `${SITE_URL}/fr/studio`,
        "en-US": `${SITE_URL}/en/studio`,
        "x-default": `${SITE_URL}/fr/studio`,
      },
    },
  }));

  const trustPages: MetadataRoute.Sitemap = getTrustPages().map((page) => {
    const frenchPage = getTrustPageByKey("fr", page.key);
    const englishPage = getTrustPageByKey("en", page.key);
    return {
      url: `${SITE_URL}/${page.locale}/${page.slug}`,
      lastModified: new Date("2026-08-26"),
      changeFrequency: "yearly" as const,
      priority: page.key === "about" ? 0.55 : 0.35,
      alternates: {
        languages: {
          "fr-FR": `${SITE_URL}/fr/${frenchPage?.slug}`,
          "en-US": `${SITE_URL}/en/${englishPage?.slug}`,
          "x-default": `${SITE_URL}/${page.key === "about" ? `en/${englishPage?.slug}` : `fr/${frenchPage?.slug}`}`,
        },
      },
    };
  });

  return [...homepages, ...studioPages, ...guidePages, ...trustPages];
}
