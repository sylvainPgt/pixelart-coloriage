import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import RootDocument from "@/components/RootDocument";
import { baseMetadata, siteViewport } from "@/lib/site-metadata";
import type { Locale } from "@/lib/templates";
import "../globals.css";

export const metadata = baseMetadata;
export const viewport = siteViewport;
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "fr" }, { locale: "en" }];
}

export default async function LocalizedLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "fr" && locale !== "en") notFound();
  return <RootDocument locale={locale as Locale}>{children}</RootDocument>;
}
