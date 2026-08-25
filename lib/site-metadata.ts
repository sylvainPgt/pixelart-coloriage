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
