import type { ReactNode } from "react";
import RootDocument from "@/components/RootDocument";
import { baseMetadata, siteViewport } from "@/lib/site-metadata";
import "../globals.css";

export const metadata = baseMetadata;
export const viewport = siteViewport;

export default function RedirectLayout({ children }: { children: ReactNode }) {
  return <RootDocument locale="fr">{children}</RootDocument>;
}
