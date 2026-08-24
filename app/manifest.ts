import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mosaipix — Pixel Art Studio",
    short_name: "Mosaipix",
    description: "Transforme une idée ou une photo en pixel art à colorier.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fffaf0",
    theme_color: "#604bd8",
    categories: ["entertainment", "games", "graphics-design"],
    lang: "fr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
