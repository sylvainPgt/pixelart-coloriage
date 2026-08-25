import type { Locale } from "@/lib/templates";

export type GuideKey = "photo" | "coloring" | "numbers";

export type GuideSection = {
  title: string;
  paragraphs: string[];
  tips?: string[];
};

export type GuideDefinition = {
  key: GuideKey;
  locale: Locale;
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  intro: string;
  readingTime: string;
  sections: GuideSection[];
  ctaTitle: string;
  ctaText: string;
  ctaLabel: string;
};

export const guides: GuideDefinition[] = [
  {
    key: "photo",
    locale: "fr",
    slug: "transformer-photo-en-pixel-art",
    title: "Transformer une photo en pixel art : les réglages qui font la différence",
    metaTitle: "Transformer une photo en pixel art gratuitement | Mosaipix",
    description: "Choisis le bon cadrage, la taille de grille et le nombre de couleurs pour convertir gratuitement une photo en pixel art net et reconnaissable.",
    eyebrow: "GUIDE PHOTO → PIXEL ART",
    intro: "Une bonne conversion ne dépend pas seulement de la résolution. Le sujet, le cadrage et la palette déterminent surtout si le résultat reste lisible une fois réduit en petits carrés.",
    readingTime: "Guide pratique · 4 min",
    sections: [
      {
        title: "1. Partir d’une photo simple et lisible",
        paragraphs: [
          "Choisis une image avec un sujet principal bien détaché du fond. Un visage, un animal ou un objet photographié de près résiste mieux à la réduction qu’une scène remplie de petits détails.",
          "La taille du fichier d’origine est rarement le problème : Mosaipix doit volontairement réduire l’image. Un bon contraste entre le sujet et l’arrière-plan est plus utile qu’une photo très haute définition.",
        ],
        tips: ["Un seul sujet principal", "Un fond peu chargé", "Une lumière régulière", "Des contours faciles à reconnaître"],
      },
      {
        title: "2. Choisir la grille avant d’ajouter des couleurs",
        paragraphs: [
          "Commence avec 16 × 16 cases pour obtenir une silhouette franche. Passe à 24 × 24 ou 32 × 32 si des éléments importants disparaissent. Les grilles plus grandes donnent plus de précision, mais demandent davantage de temps à colorier.",
          "Utilise le cadrage « Remplir et recadrer » pour un portrait ou un objet central. Choisis « Afficher en entier » lorsque toute la silhouette doit rester visible.",
        ],
      },
      {
        title: "3. Limiter la palette pour retrouver l’esprit pixel art",
        paragraphs: [
          "Une palette de 6 à 10 couleurs suffit dans la plupart des cas. Trop de nuances proches rendent les numéros difficiles à distinguer et donnent un résultat plus proche d’une photo compressée que d’un pixel art.",
          "Augmente légèrement le contraste si le sujet manque de relief. Active la texture pixelisée seulement si tu veux des transitions plus riches : elle ajoute volontairement des variations entre cases voisines.",
        ],
        tips: ["6 couleurs pour un motif très simple", "8 couleurs pour un bon équilibre", "10 à 14 couleurs pour conserver davantage de nuances"],
      },
    ],
    ctaTitle: "Teste ces réglages avec ta photo",
    ctaText: "La conversion se fait localement dans ton navigateur : ta photo n’est pas envoyée à Mosaipix.",
    ctaLabel: "Transformer ma photo",
  },
  {
    key: "coloring",
    locale: "fr",
    slug: "pixel-art-a-colorier",
    title: "Pixel art à colorier : 24 modèles gratuits pour commencer",
    metaTitle: "Pixel art à colorier et à imprimer gratuitement | Mosaipix",
    description: "Découvre 24 modèles de pixel art à colorier en ligne ou sur papier : animaux, espace, nature, gourmandises, objets et lieux.",
    eyebrow: "BIBLIOTHÈQUE GRATUITE",
    intro: "Mosaipix propose des motifs conçus case par case pour rester immédiatement reconnaissables. Ils fonctionnent sans compte et restent disponibles hors connexion après la première visite.",
    readingTime: "24 modèles · 5 catégories",
    sections: [
      {
        title: "Des modèles conçus comme du vrai pixel art",
        paragraphs: [
          "Chaque motif utilise une grille 16 × 16 et une palette courte. Les contours, les contrastes et les espaces vides sont placés manuellement : le résultat ne vient pas d’une simple image rendue floue puis agrandie.",
          "La bibliothèque comprend des animaux, des scènes spatiales, des éléments de nature, des gourmandises, des objets et des lieux. Le bouton « Surprends-moi » permet de choisir au hasard.",
        ],
      },
      {
        title: "Colorier en ligne ou imprimer sur papier",
        paragraphs: [
          "Dans le studio, chaque case indique le numéro de sa couleur cible. La palette reprend les mêmes numéros, et la progression signale les cases correctement remplies.",
          "Pour une activité papier, télécharge la grille vierge : elle contient les cases numérotées et la légende des couleurs. Tu peux aussi lancer directement l’impression depuis le navigateur.",
        ],
        tips: ["Crayon, gomme, remplissage et pipette", "Annulation et rétablissement", "Grille imprimable avec légende", "Projet conservé sur l’appareil"],
      },
      {
        title: "Créer ensuite un modèle personnel",
        paragraphs: [
          "Une fois le principe compris avec un modèle, importe une photo pour obtenir une grille personnalisée. Tu peux régler les dimensions de 8 à 64 cases par côté et choisir une palette de 2 à 20 couleurs.",
        ],
      },
    ],
    ctaTitle: "Choisis ton premier modèle",
    ctaText: "La fusée, le chat, le cactus et 21 autres motifs sont prêts à colorier.",
    ctaLabel: "Voir les modèles gratuits",
  },
  {
    key: "numbers",
    locale: "fr",
    slug: "pixel-art-par-numero",
    title: "Créer et imprimer un pixel art par numéro",
    metaTitle: "Créer un pixel art par numéro en ligne | Mosaipix",
    description: "Crée une grille de pixel art par numéro, colorie-la en ligne ou imprime les cases numérotées avec leur légende de couleurs.",
    eyebrow: "COLORIAGE PAR NUMÉRO",
    intro: "Le pixel art par numéro associe chaque couleur de la palette à un chiffre. La grille reste ainsi lisible à l’écran comme sur une feuille imprimée.",
    readingTime: "Mode d’emploi · 3 min",
    sections: [
      {
        title: "Comment fonctionne la grille numérotée ?",
        paragraphs: [
          "Chaque case contient le numéro de la couleur attendue. Le même numéro apparaît sur la pastille correspondante dans la palette. Dans le mode en ligne, une case correcte révèle progressivement le motif de référence.",
          "Les numéros et les traits de grille peuvent être masqués à l’écran sans modifier le projet. Ils restent disponibles lorsque tu veux reprendre le guidage.",
        ],
      },
      {
        title: "Préparer une version facile à imprimer",
        paragraphs: [
          "Choisis une grille qui reste lisible au format de papier utilisé. Une grille 16 × 16 laisse des cases confortables sur une feuille standard ; une grille plus détaillée réduit mécaniquement leur taille.",
          "La commande « Télécharger la grille » crée une version vierge avec les numéros et la légende. La commande « Imprimer » ouvre une mise en page dédiée, sans les commandes du studio.",
        ],
        tips: ["Vérifier l’aperçu avant impression", "Imprimer à l’échelle 100 %", "Garder la légende sur la même page", "Utiliser une palette courte pour une activité plus rapide"],
      },
      {
        title: "Personnaliser la difficulté",
        paragraphs: [
          "La difficulté dépend de deux réglages indépendants : le nombre de cases et le nombre de couleurs. Une grande grille avec peu de couleurs demande de la patience mais reste simple à lire. Une petite grille avec beaucoup de nuances demande davantage d’attention à la palette.",
        ],
      },
    ],
    ctaTitle: "Crée ta grille par numéro",
    ctaText: "Pars d’un modèle, d’une photo ou d’une idée, puis télécharge la version papier.",
    ctaLabel: "Ouvrir le studio",
  },
  {
    key: "photo",
    locale: "en",
    slug: "photo-to-pixel-art",
    title: "Turn a photo into pixel art: settings that make it recognizable",
    metaTitle: "Turn a photo into pixel art for free | Mosaipix",
    description: "Choose the right crop, grid size and color count to convert a photo into crisp, recognizable pixel art for free.",
    eyebrow: "PHOTO → PIXEL ART GUIDE",
    intro: "A good conversion is not only about resolution. The subject, crop and palette determine whether the result remains readable after the image is reduced to small squares.",
    readingTime: "Practical guide · 4 min",
    sections: [
      {
        title: "1. Start with a simple, readable photo",
        paragraphs: [
          "Choose an image with one main subject that stands apart from the background. A close-up face, animal or object survives reduction better than a scene filled with tiny details.",
          "The original file size is rarely the problem: Mosaipix deliberately reduces the image. Clear contrast between subject and background matters more than very high resolution.",
        ],
        tips: ["One main subject", "An uncluttered background", "Even lighting", "Easy-to-recognize outlines"],
      },
      {
        title: "2. Choose the grid before adding more colors",
        paragraphs: [
          "Start at 16 × 16 cells for a strong silhouette. Move to 24 × 24 or 32 × 32 if important features disappear. Larger grids keep more detail but take longer to color.",
          "Use “Fill and crop” for a portrait or centered object. Choose “Show full image” when the entire silhouette needs to remain visible.",
        ],
      },
      {
        title: "3. Limit the palette to keep a pixel-art look",
        paragraphs: [
          "A palette of 6 to 10 colors works in most cases. Too many similar shades make the numbers hard to distinguish and look more like a compressed photo than intentional pixel art.",
          "Increase contrast slightly if the subject lacks definition. Enable pixel texture only when you want richer transitions: it deliberately adds variation between neighboring cells.",
        ],
        tips: ["6 colors for a very simple pattern", "8 colors for a balanced result", "10 to 14 colors to preserve more shades"],
      },
    ],
    ctaTitle: "Try these settings with your photo",
    ctaText: "Conversion happens locally in your browser: your photo is not uploaded to Mosaipix.",
    ctaLabel: "Convert my photo",
  },
  {
    key: "coloring",
    locale: "en",
    slug: "pixel-art-coloring-pages",
    title: "Pixel art coloring pages: 24 free patterns to get started",
    metaTitle: "Free printable pixel art coloring pages | Mosaipix",
    description: "Explore 24 pixel-art patterns to color online or on paper: animals, space, nature, treats, objects and places.",
    eyebrow: "FREE PATTERN LIBRARY",
    intro: "Mosaipix patterns are designed cell by cell to remain instantly recognizable. They need no account and remain available offline after your first visit.",
    readingTime: "24 patterns · 5 categories",
    sections: [
      {
        title: "Patterns designed as real pixel art",
        paragraphs: [
          "Every pattern uses a 16 × 16 grid and a short palette. Outlines, contrast and empty space are placed intentionally: the result is not just a blurred image enlarged into squares.",
          "The library includes animals, space scenes, nature, treats, objects and places. The “Surprise me” button picks one at random.",
        ],
      },
      {
        title: "Color online or print on paper",
        paragraphs: [
          "In the studio, every cell displays its target color number. The palette uses the same numbers, and the progress indicator counts correctly filled cells.",
          "For a paper activity, download the blank grid with numbered cells and a color key. You can also print it directly from the browser.",
        ],
        tips: ["Pencil, eraser, fill and color picker", "Undo and redo", "Printable grid with color key", "Project saved on the device"],
      },
      {
        title: "Create a personal pattern next",
        paragraphs: [
          "Once you know how the grid works, import a photo to make a custom pattern. You can set each side from 8 to 64 cells and choose a palette of 2 to 20 colors.",
        ],
      },
    ],
    ctaTitle: "Choose your first pattern",
    ctaText: "The rocket, cat, cactus and 21 other patterns are ready to color.",
    ctaLabel: "See the free patterns",
  },
  {
    key: "numbers",
    locale: "en",
    slug: "pixel-art-by-number",
    title: "Create and print pixel art by number",
    metaTitle: "Create pixel art by number online | Mosaipix",
    description: "Create a pixel art by number grid, color it online, or print numbered cells with their matching color key.",
    eyebrow: "COLOR BY NUMBER",
    intro: "Pixel art by number assigns a digit to every palette color. This keeps the grid easy to follow both on screen and on a printed sheet.",
    readingTime: "How-to · 3 min",
    sections: [
      {
        title: "How does the numbered grid work?",
        paragraphs: [
          "Every cell contains the number of its target color. The same number appears on the matching palette swatch. Online, each correct cell gradually reveals the reference pattern.",
          "Numbers and grid lines can be hidden on screen without changing the project. Turn them back on whenever you need guidance.",
        ],
      },
      {
        title: "Prepare an easy-to-print version",
        paragraphs: [
          "Choose a grid that remains readable on your paper size. A 16 × 16 grid leaves comfortable cells on a standard sheet; a more detailed grid necessarily makes each cell smaller.",
          "“Download grid” creates a blank version with numbers and a color key. “Print” opens a dedicated layout without the studio controls.",
        ],
        tips: ["Check the print preview", "Print at 100% scale", "Keep the color key on the same page", "Use a short palette for a quicker activity"],
      },
      {
        title: "Adjust the difficulty",
        paragraphs: [
          "Difficulty depends on two separate settings: the number of cells and the number of colors. A large grid with few colors takes patience but remains easy to read. A small grid with many shades demands more attention to the palette.",
        ],
      },
    ],
    ctaTitle: "Create your numbered grid",
    ctaText: "Start with a pattern, photo or idea, then download the paper version.",
    ctaLabel: "Open the studio",
  },
];

export function getGuide(locale: Locale, slug: string) {
  return guides.find((guide) => guide.locale === locale && guide.slug === slug);
}

export function getGuideByKey(locale: Locale, key: GuideKey) {
  return guides.find((guide) => guide.locale === locale && guide.key === key);
}

export function getLocalizedGuides(locale: Locale) {
  return guides.filter((guide) => guide.locale === locale);
}
