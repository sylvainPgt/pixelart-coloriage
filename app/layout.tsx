import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pixelia — Crée et colorie ton pixel art",
  description: "Transforme une photo ou une idée en pixel art et colorie-la directement en ligne.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
