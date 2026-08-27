import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mosaipix — Pixel Art Studio",
    short_name: "Mosaipix",
    description: "Transforme une idée ou une photo en pixel art à colorier.",
    id: "/",
    start_url: "/fr/studio",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fffaf0",
    theme_color: "#604bd8",
    categories: ["entertainment", "games", "graphics-design"],
    lang: "fr",
    icons: [
      {
        src: "/icons/mosaipix-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/mosaipix-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/mosaipix-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/mosaipix-desktop.jpg",
        sizes: "1280x720",
        type: "image/jpeg",
        form_factor: "wide",
        label: "Le studio Mosaipix sur ordinateur",
      },
      {
        src: "/screenshots/mosaipix-mobile.jpg",
        sizes: "390x844",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "Le studio Mosaipix sur mobile",
      },
    ],
  };
}
