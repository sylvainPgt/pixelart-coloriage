import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PixelStudio from "@/components/PixelStudio";
import { SITE_URL } from "@/lib/site-metadata";
import type { Locale } from "@/lib/templates";

const seo = {
  fr: {
    title: "Créer un pixel art à colorier gratuitement | Mosaipix",
    description: "Transforme une photo, une idée ou l’un de nos 24 modèles en pixel art numéroté. Colorie en ligne, télécharge ou imprime gratuitement.",
    imageAlt: "Studio Mosaipix pour créer un coloriage pixel art",
  },
  en: {
    title: "Create printable pixel art coloring pages | Mosaipix",
    description: "Turn a photo, an idea or one of 24 ready-made patterns into numbered pixel art. Color online, download or print for free.",
    imageAlt: "Mosaipix studio for creating pixel art coloring pages",
  },
} satisfies Record<Locale, { title: string; description: string; imageAlt: string }>;

function parseLocale(value: string): Locale {
  if (value !== "fr" && value !== "en") notFound();
  return value;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  const content = seo[locale];
  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "fr-FR": "/fr",
        "en-US": "/en",
        "x-default": "/fr",
      },
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/${locale}`,
      siteName: "Mosaipix",
      title: content.title,
      description: content.description,
      locale: locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: locale === "fr" ? ["en_US"] : ["fr_FR"],
      images: [{ url: "/og.png", width: 1200, height: 630, alt: content.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.description,
      images: ["/og.png"],
    },
  };
}

export default async function LocalizedHome({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocale((await params).locale);
  const content = seo[locale];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Mosaipix",
    url: `${SITE_URL}/${locale}`,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    inLanguage: locale,
    description: content.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <PixelStudio initialLocale={locale} />
    </>
  );
}
