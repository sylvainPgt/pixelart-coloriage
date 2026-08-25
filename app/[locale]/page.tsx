import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PixelStudio from "@/components/PixelStudio";
import { homeFaqs } from "@/lib/home-content";
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
    keywords: locale === "fr"
      ? ["pixel art à colorier", "photo en pixel art", "pixel art par numéro", "grille pixel art", "pixel art à imprimer"]
      : ["pixel art coloring pages", "photo to pixel art", "pixel art by number", "pixel art grid", "printable pixel art"],
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
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Mosaipix",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icons/mosaipix-512.png`,
          width: 512,
          height: 512,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Mosaipix",
        url: SITE_URL,
        description: content.description,
        inLanguage: ["fr", "en"],
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#application`,
        name: "Mosaipix",
        url: `${SITE_URL}/${locale}`,
        applicationCategory: "GameApplication",
        applicationSubCategory: "Pixel art coloring studio",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern web browser with JavaScript enabled",
        inLanguage: locale,
        description: content.description,
        image: `${SITE_URL}/og.png`,
        screenshot: [`${SITE_URL}/screenshots/mosaipix-desktop.jpg`, `${SITE_URL}/screenshots/mosaipix-mobile.jpg`],
        isAccessibleForFree: true,
        featureList: locale === "fr"
          ? ["24 modèles pixel art hors connexion", "Transformation locale de photos", "Grille de coloriage par numéro", "Téléchargement et impression", "Palette de 2 à 20 couleurs"]
          : ["24 offline pixel art patterns", "Local photo conversion", "Pixel art by number grid", "Download and printing", "2 to 20 color palette"],
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/${locale}#faq`,
        inLanguage: locale,
        mainEntity: homeFaqs[locale].map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <PixelStudio initialLocale={locale} />
    </>
  );
}
