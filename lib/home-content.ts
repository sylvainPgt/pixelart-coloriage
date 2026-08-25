import type { Locale } from "@/lib/templates";

export type FaqItem = { question: string; answer: string };

export const homeFacts: Record<Locale, Array<{ value: string; label: string }>> = {
  fr: [
    { value: "24", label: "modèles jouables hors connexion" },
    { value: "8 à 64", label: "cases par côté pour une photo" },
    { value: "2 à 20", label: "couleurs dans la palette" },
    { value: "0 compte", label: "pour créer, colorier ou imprimer" },
  ],
  en: [
    { value: "24", label: "patterns available offline" },
    { value: "8 to 64", label: "cells per side for a photo" },
    { value: "2 to 20", label: "colors in the palette" },
    { value: "0 accounts", label: "to create, color or print" },
  ],
};

export const homeFaqs: Record<Locale, FaqItem[]> = {
  fr: [
    { question: "Mosaipix est-il gratuit ?", answer: "Oui. Les 24 modèles, la transformation de photos, le coloriage en ligne et l’impression sont gratuits. La création d’images par IA est limitée à 3 essais par adresse réseau et par période de 24 heures." },
    { question: "Mes photos sont-elles envoyées sur un serveur ?", answer: "Non. La transformation d’une photo en grille pixel art s’effectue directement dans le navigateur. La photo et le projet restent sur l’appareil utilisé." },
    { question: "Peut-on imprimer une grille de pixel art par numéro ?", answer: "Oui. Mosaipix génère une grille vierge avec un numéro dans chaque case et une légende des couleurs. Elle peut être téléchargée ou imprimée sur papier." },
    { question: "Quelle taille de grille choisir ?", answer: "Une grille de 16 × 16 est rapide et lisible. Une grille de 24 × 24 offre davantage de détails. Pour une photo, les réglages avancés permettent de choisir de 8 à 64 cases par côté." },
    { question: "Mosaipix fonctionne-t-il sans connexion ?", answer: "Oui, après une première visite. Les modèles, le coloriage et les projets enregistrés restent disponibles hors connexion. La recherche d’images et la création par IA nécessitent Internet." },
  ],
  en: [
    { question: "Is Mosaipix free?", answer: "Yes. The 24 patterns, photo conversion, online coloring and printing are free. AI image creation is limited to 3 attempts per network address in each 24-hour period." },
    { question: "Are my photos uploaded to a server?", answer: "No. A photo is converted into a pixel-art grid directly in the browser. The photo and project stay on the device you are using." },
    { question: "Can I print a pixel art by number grid?", answer: "Yes. Mosaipix creates a blank grid with a number in every cell and a color key. You can download it or print it on paper." },
    { question: "Which grid size should I choose?", answer: "A 16 × 16 grid is quick and easy to read. A 24 × 24 grid keeps more detail. For photos, advanced settings let you choose from 8 to 64 cells per side." },
    { question: "Does Mosaipix work offline?", answer: "Yes, after the first visit. Patterns, coloring and saved projects remain available offline. Image search and AI creation require an internet connection." },
  ],
};

export const guideCards: Record<Locale, Array<{ key: string; slug: string; title: string; description: string }>> = {
  fr: [
    { key: "photo", slug: "transformer-photo-en-pixel-art", title: "Transformer une photo en pixel art : les réglages qui font la différence", description: "Choisis le bon cadrage, la taille de grille et le nombre de couleurs pour convertir une photo en pixel art net et reconnaissable." },
    { key: "coloring", slug: "pixel-art-a-colorier", title: "Pixel art à colorier : 24 modèles gratuits pour commencer", description: "Découvre des modèles à colorier en ligne ou sur papier : animaux, espace, nature, gourmandises, objets et lieux." },
    { key: "numbers", slug: "pixel-art-par-numero", title: "Créer et imprimer un pixel art par numéro", description: "Crée une grille par numéro, colorie-la en ligne ou imprime les cases numérotées avec leur légende de couleurs." },
  ],
  en: [
    { key: "photo", slug: "photo-to-pixel-art", title: "Turn a photo into pixel art: settings that make it recognizable", description: "Choose the right crop, grid size and color count to convert a photo into crisp, recognizable pixel art." },
    { key: "coloring", slug: "pixel-art-coloring-pages", title: "Pixel art coloring pages: 24 free patterns to get started", description: "Explore patterns to color online or on paper: animals, space, nature, treats, objects and places." },
    { key: "numbers", slug: "pixel-art-by-number", title: "Create and print pixel art by number", description: "Create a pixel art by number grid, color it online, or print numbered cells with their matching color key." },
  ],
};
