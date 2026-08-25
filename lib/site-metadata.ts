import type { Metadata, Viewport } from "next";

export const SITE_URL = "https://mosaipix.com";

export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Mosaipix",
  title: {
    default: "Mosaipix — Pixel Art Studio",
    template: "%s | Mosaipix",
  },
  description: "Transforme une photo ou une idée en véritable pixel art à colorier et à imprimer.",
  authors: [{ name: "Mosaipix", url: SITE_URL }],
  creator: "Mosaipix",
  publisher: "Mosaipix",
  category: "Pixel art",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/mosaipix-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Mosaipix",
    statusBarStyle: "default",
  },
};

export const siteViewport: Viewport = {
  themeColor: "#604bd8",
  colorScheme: "light",
  viewportFit: "cover",
};
