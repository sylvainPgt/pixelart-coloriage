import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PixelStudio from "@/components/PixelStudio";
import type { Locale } from "@/lib/templates";

function parseLocale(value: string): Locale {
  if (value !== "fr" && value !== "en") notFound();
  return value;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  return {
    title: locale === "fr" ? "Studio de création" : "Creation studio",
    description: locale === "fr"
      ? "Crée, cadre, pixelise et colorie ton projet dans le studio Mosaipix."
      : "Create, crop, pixelate and color your project in the Mosaipix studio.",
    alternates: {
      canonical: `/${locale}/studio`,
      languages: { "fr-FR": "/fr/studio", "en-US": "/en/studio" },
    },
  };
}

export default async function StudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocale((await params).locale);
  return <PixelStudio initialLocale={locale} />;
}
