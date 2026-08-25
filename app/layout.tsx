import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mosaipix.com"),
  applicationName: "Mosaipix",
  title: "Mosaipix — Pixel Art Studio",
  description: "Turn a photo or an idea into real pixel art, then color and customize it online.",
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
  openGraph: {
    title: "Mosaipix — Pixel Art Studio",
    description: "Transform. Pixelate. Create. Turn any idea or photo into pixel art you can color.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Mosaipix Pixel Art Studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mosaipix — Pixel Art Studio",
    description: "Transform. Pixelate. Create. Turn any idea or photo into pixel art you can color.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#604bd8",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${sans.variable} ${display.variable}`}>
      <body>
        {children}
        <PwaRegister />
        <Analytics />
      </body>
    </html>
  );
}
