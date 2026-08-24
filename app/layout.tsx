import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
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
  metadataBase: new URL("https://pixelia-alpha.vercel.app"),
  title: "Mosaipix — Pixel Art Studio",
  description: "Turn a photo or an idea into real pixel art, then color and customize it online.",
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
