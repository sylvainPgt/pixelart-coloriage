import type { PixelProject } from "@/lib/pixel-art";

export type Locale = "fr" | "en";
export type TemplateCategory = "animals" | "nature" | "space" | "treats" | "objects";

export type TemplateDefinition = {
  id: string;
  category: TemplateCategory;
  featured?: boolean;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  project: PixelProject;
};

const COLORS = {
  cream: "#fffaf0",
  white: "#fffdf8",
  ink: "#18172d",
  pink: "#d83c6b",
  coral: "#ff875c",
  red: "#e3485f",
  gold: "#ffd25c",
  green: "#61d889",
  darkGreen: "#278357",
  blue: "#55c7f3",
  sky: "#dff5ff",
  purple: "#7868e6",
  brown: "#9b6248",
};

function makeProject(name: string, width: number, height: number, colorAt: (x: number, y: number) => string): PixelProject {
  const colors = Array.from({ length: width * height }, (_, index) => colorAt(index % width, Math.floor(index / width)));
  const palette = [...new Set(colors)];
  const paletteMap = new Map(palette.map((color, index) => [color, index]));
  return {
    version: 2,
    name,
    width,
    height,
    palette,
    targets: colors.map((color) => paletteMap.get(color) ?? 0),
  };
}

function ellipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

function template(
  id: string,
  category: TemplateCategory,
  nameFr: string,
  nameEn: string,
  descriptionFr: string,
  descriptionEn: string,
  colorAt: (x: number, y: number) => string,
  options: { width?: number; height?: number; featured?: boolean } = {},
): TemplateDefinition {
  const width = options.width ?? 16;
  const height = options.height ?? 16;
  return {
    id,
    category,
    featured: options.featured,
    name: { fr: nameFr, en: nameEn },
    description: { fr: descriptionFr, en: descriptionEn },
    project: makeProject(nameFr, width, height, colorAt),
  };
}

const rocket = template("cosmic-rocket", "space", "Fusée cosmique", "Cosmic rocket", "Une fusée prête à décoller", "A rocket ready for lift-off", (x, y) => {
  const center = Math.abs(x - 7.5);
  if (y <= 2 && center < y / 2 + 0.6) return COLORS.gold;
  if (y > 2 && y < 11 && center < 3.1) {
    if (y < 5) return COLORS.coral;
    if (y === 6 && center < 1.2) return COLORS.blue;
    return center > 2.1 ? COLORS.pink : COLORS.cream;
  }
  if (y >= 8 && y < 12 && center >= 3 && center < 5 - (y - 8) * 0.45) return COLORS.purple;
  if (y >= 11 && y < 15 && center < Math.max(0.7, 2.4 - (y - 11) * 0.45)) return y < 13 ? COLORS.gold : COLORS.coral;
  if ((x + y * 3) % 19 === 0) return COLORS.blue;
  return COLORS.ink;
}, { featured: true });

export const templateCatalog: TemplateDefinition[] = [
  rocket,
  template("ringed-planet", "space", "Planète à anneaux", "Ringed planet", "Un monde lointain entouré d’étoiles", "A distant world surrounded by stars", (x, y) => {
    const planet = ellipse(x, y, 8, 8, 4.1, 4.1);
    const ring = Math.abs((y - 8) - (x - 8) * 0.32) < 1.05 && x > 1 && x < 15;
    if (planet && x < 7) return COLORS.purple;
    if (planet) return COLORS.pink;
    if (ring) return COLORS.gold;
    if ((x * 5 + y * 3) % 23 === 0) return COLORS.blue;
    return COLORS.ink;
  }, { featured: true }),
  template("little-astronaut", "space", "Petit astronaute", "Little astronaut", "Une combinaison spatiale toute ronde", "A cheerful round spacesuit", (x, y) => {
    if (ellipse(x, y, 7.5, 5, 4, 4)) {
      if (ellipse(x, y, 7.5, 5, 2.8, 2.1)) return y < 5 ? COLORS.blue : COLORS.ink;
      return COLORS.white;
    }
    if (y >= 8 && y <= 13 && x >= 4 && x <= 11) return x === 4 || x === 11 ? COLORS.purple : COLORS.white;
    if (y >= 10 && y <= 12 && (x === 2 || x === 3 || x === 12 || x === 13)) return COLORS.white;
    if (y >= 13 && (x === 5 || x === 6 || x === 9 || x === 10)) return COLORS.coral;
    if ((x + y * 7) % 31 === 0) return COLORS.gold;
    return COLORS.ink;
  }),
  template("crescent-moon", "space", "Lune souriante", "Smiling moon", "Un croissant de lune dans la nuit", "A crescent moon in the night", (x, y) => {
    const outer = ellipse(x, y, 7, 7.5, 5, 6);
    const cutout = ellipse(x, y, 9.5, 5.5, 4.4, 5.4);
    if (outer && !cutout) {
      if ((x === 4 && y === 7) || (x === 5 && y === 10) || (x === 6 && y === 11)) return COLORS.ink;
      return COLORS.gold;
    }
    if ((x * 3 + y * 7) % 29 === 0) return COLORS.blue;
    return COLORS.ink;
  }),

  template("mischievous-cat", "animals", "Chat malicieux", "Mischievous cat", "Un chat aux oreilles pointues", "A cat with pointy ears", (x, y) => {
    const head = ellipse(x, y, 7.5, 6.5, 4.7, 4.2);
    const ears = y >= 2 && y <= 5 && ((x >= 3 && x <= 5 - (y - 2) * 0.3) || (x >= 10 + (y - 2) * 0.3 && x <= 12));
    if (head || ears) {
      if (y === 6 && (x === 6 || x === 9)) return COLORS.ink;
      if (y === 8 && x >= 7 && x <= 8) return COLORS.pink;
      return COLORS.coral;
    }
    if (ellipse(x, y, 7.5, 12.5, 3.8, 3.7)) return x < 6 ? COLORS.gold : COLORS.coral;
    if (y >= 11 && x >= 11 && x <= 14 && Math.abs(y - 12) <= 1) return COLORS.coral;
    return COLORS.cream;
  }, { featured: true }),
  template("happy-dog", "animals", "Chien joyeux", "Happy dog", "Un compagnon aux oreilles tombantes", "A floppy-eared friend", (x, y) => {
    const head = ellipse(x, y, 7.5, 6.5, 4.5, 4.2);
    if (ellipse(x, y, 3, 6.5, 2.1, 4) || ellipse(x, y, 12, 6.5, 2.1, 4)) return COLORS.brown;
    if (head) {
      if (y === 6 && (x === 6 || x === 9)) return COLORS.ink;
      if (ellipse(x, y, 7.5, 8, 2.2, 1.6)) return x >= 7 && x <= 8 && y === 7 ? COLORS.ink : COLORS.cream;
      return COLORS.gold;
    }
    if (ellipse(x, y, 7.5, 13, 4, 3)) return COLORS.gold;
    return COLORS.sky;
  }),
  template("forest-fox", "animals", "Renard des bois", "Woodland fox", "Un petit renard à la queue touffue", "A little fox with a bushy tail", (x, y) => {
    const face = y >= 3 && y <= 10 && Math.abs(x - 7.5) <= 5 - Math.abs(y - 7) * 0.45;
    const ears = y <= 4 && ((x >= 2 && x <= 5) || (x >= 10 && x <= 13));
    if (face || ears) {
      if (y >= 8 && Math.abs(x - 7.5) < 2.5) return COLORS.cream;
      if (y === 7 && (x === 5 || x === 10)) return COLORS.ink;
      if (y === 9 && x >= 7 && x <= 8) return COLORS.ink;
      return COLORS.coral;
    }
    if (ellipse(x, y, 7, 13, 3.5, 2.7)) return COLORS.coral;
    if (ellipse(x, y, 12.5, 12, 3.2, 2.2)) return x > 13 ? COLORS.cream : COLORS.coral;
    return COLORS.sky;
  }),
  template("blue-whale", "animals", "Baleine bleue", "Blue whale", "Une baleine qui souffle de l’eau", "A whale spraying water", (x, y) => {
    if (ellipse(x, y, 8.5, 9, 5.8, 3.5)) {
      if (x === 11 && y === 8) return COLORS.ink;
      if (y >= 10) return COLORS.purple;
      return COLORS.blue;
    }
    if (x <= 4 && y >= 7 && y <= 11 && Math.abs(y - 9) >= Math.abs(x - 3)) return COLORS.blue;
    if ((x === 9 && y <= 4) || (y === 3 && (x === 8 || x === 10)) || (y === 2 && (x === 7 || x === 11))) return COLORS.blue;
    return COLORS.sky;
  }),
  template("butterfly", "animals", "Papillon coloré", "Colorful butterfly", "Des ailes symétriques pleines de couleurs", "Symmetrical wings full of color", (x, y) => {
    if (x === 7 || x === 8) return y >= 3 && y <= 13 ? COLORS.ink : COLORS.cream;
    const dx = Math.abs(x - 7.5);
    if (ellipse(dx, y, 3.8, 6.2, 3.2, 3.8)) return y < 6 ? COLORS.pink : COLORS.purple;
    if (ellipse(dx, y, 3.6, 10.8, 2.6, 2.8)) return dx > 4 ? COLORS.gold : COLORS.coral;
    if (y <= 3 && ((x === 5 - y) || (x === 10 + y))) return COLORS.ink;
    return COLORS.cream;
  }, { featured: true }),
  template("little-fish", "animals", "Poisson tropical", "Tropical fish", "Un poisson rayé dans l’océan", "A striped fish in the ocean", (x, y) => {
    if (ellipse(x, y, 8.5, 8, 5, 3.5)) {
      if (x === 11 && y === 7) return COLORS.ink;
      if (x === 6 || x === 7) return COLORS.gold;
      if (x === 9 || x === 10) return COLORS.pink;
      return COLORS.coral;
    }
    if (x <= 4 && y >= 5 && y <= 11 && Math.abs(y - 8) >= x - 1) return COLORS.purple;
    if ((x + y * 4) % 27 === 0) return COLORS.blue;
    return COLORS.sky;
  }),

  template("sunny-flower", "nature", "Fleur solaire", "Sunny flower", "Une grande fleur lumineuse", "A large bright flower", (x, y) => {
    const dx = x - 7.5;
    const dy = y - 6.5;
    const distance = Math.hypot(dx, dy);
    if (distance < 2.1) return COLORS.gold;
    if (distance < 4.6 && Math.cos(Math.atan2(dy, dx) * 6) > -0.15) return COLORS.pink;
    if (y > 9 && Math.abs(x - 7.5) < 1.2) return COLORS.darkGreen;
    if (y > 11 && ((x > 4 && x < 7) || (x > 8 && x < 11))) return COLORS.green;
    return COLORS.cream;
  }, { featured: true }),
  template("desert-cactus", "nature", "Cactus du désert", "Desert cactus", "Un cactus sous le soleil", "A cactus under the sun", (x, y) => {
    if (ellipse(x, y, 12, 3, 2.2, 2.2)) return COLORS.gold;
    if (x >= 6 && x <= 9 && y >= 4 && y <= 13) return x === 6 || x === 9 ? COLORS.darkGreen : COLORS.green;
    if (x >= 3 && x <= 6 && y >= 7 && y <= 10) return COLORS.green;
    if (x >= 9 && x <= 12 && y >= 6 && y <= 9) return COLORS.green;
    if (y >= 13 && x >= 3 && x <= 12) return COLORS.brown;
    return COLORS.sky;
  }),
  template("soft-rainbow", "nature", "Arc-en-ciel doux", "Soft rainbow", "Un arc-en-ciel au-dessus des nuages", "A rainbow above the clouds", (x, y) => {
    const radius = Math.hypot(x - 7.5, y - 13);
    if (y <= 13 && radius >= 5 && radius < 8) {
      if (radius >= 7) return COLORS.pink;
      if (radius >= 6) return COLORS.gold;
      return COLORS.blue;
    }
    if ((ellipse(x, y, 3, 13, 2.8, 1.6) || ellipse(x, y, 12, 13, 2.8, 1.6))) return COLORS.white;
    return COLORS.sky;
  }, { featured: true }),
  template("twilight-lake", "nature", "Lac au crépuscule", "Twilight lake", "Des montagnes reflétées dans l’eau", "Mountains reflected in water", (x, y) => {
    if (y < 4) return y < 2 ? COLORS.purple : COLORS.pink;
    if (y === 4 && x > 11 && x < 15) return COLORS.gold;
    if (y < 8) return Math.abs(x - 8) < y - 2 ? COLORS.ink : COLORS.coral;
    if (y < 13) return (x + y) % 3 === 0 ? COLORS.blue : COLORS.purple;
    return COLORS.ink;
  }),
  template("happy-tree", "nature", "Arbre joyeux", "Happy tree", "Un arbre rond rempli de feuilles", "A round tree full of leaves", (x, y) => {
    if (ellipse(x, y, 7.5, 6, 5.5, 4.8)) return (x + y) % 4 === 0 ? COLORS.gold : x < 8 ? COLORS.green : COLORS.darkGreen;
    if (x >= 6 && x <= 9 && y >= 8 && y <= 14) return COLORS.brown;
    if (y >= 14) return COLORS.green;
    return COLORS.sky;
  }),
  template("magic-mushroom", "nature", "Champignon magique", "Magic mushroom", "Un champignon à pois dans la mousse", "A spotted mushroom in the moss", (x, y) => {
    if (ellipse(x, y, 7.5, 6, 5.5, 3.8)) {
      if ((x + y) % 4 === 0) return COLORS.white;
      return COLORS.red;
    }
    if (x >= 5 && x <= 10 && y >= 7 && y <= 13) return x === 5 || x === 10 ? COLORS.gold : COLORS.cream;
    if (y >= 13) return COLORS.green;
    return COLORS.sky;
  }),

  template("crisp-apple", "treats", "Pomme croquante", "Crisp apple", "Une pomme rouge avec sa feuille", "A red apple with a leaf", (x, y) => {
    if (ellipse(x, y, 7.5, 9, 5, 4.8)) return x < 8 ? COLORS.red : COLORS.pink;
    if (x >= 7 && x <= 8 && y >= 2 && y <= 5) return COLORS.brown;
    if (ellipse(x, y, 10, 3.5, 2.5, 1.5)) return COLORS.green;
    return COLORS.cream;
  }),
  template("ice-cream", "treats", "Glace à la fraise", "Strawberry ice cream", "Une glace gourmande à deux boules", "A sweet double-scoop ice cream", (x, y) => {
    if (ellipse(x, y, 7.5, 4.5, 3.5, 3.2)) return COLORS.pink;
    if (ellipse(x, y, 7.5, 7.5, 4, 2.7)) return x < 8 ? COLORS.gold : COLORS.coral;
    if (y >= 9 && y <= 14 && Math.abs(x - 7.5) <= (14 - y) * 0.65 + 0.6) return (x + y) % 2 === 0 ? COLORS.gold : COLORS.brown;
    return COLORS.sky;
  }),
  template("birthday-cake", "treats", "Gâteau d’anniversaire", "Birthday cake", "Un gâteau avec trois bougies", "A cake with three candles", (x, y) => {
    if (y >= 7 && y <= 13 && x >= 3 && x <= 12) {
      if (y === 7 || y === 10) return COLORS.cream;
      return y < 10 ? COLORS.pink : COLORS.coral;
    }
    if (y >= 3 && y <= 6 && (x === 5 || x === 8 || x === 11)) return COLORS.purple;
    if (y === 2 && (x === 5 || x === 8 || x === 11)) return COLORS.gold;
    if (y === 14 && x >= 2 && x <= 13) return COLORS.ink;
    return COLORS.sky;
  }),

  template("flower-house", "objects", "Maison fleurie", "Flower house", "Une petite maison avec un jardin", "A tiny house with a garden", (x, y) => {
    if (y >= 6 && y <= 13 && x >= 3 && x <= 12) {
      if (x >= 7 && x <= 9 && y >= 9) return COLORS.brown;
      if (y >= 8 && y <= 10 && (x === 5 || x === 11)) return COLORS.blue;
      return COLORS.cream;
    }
    if (y >= 2 && y <= 7 && Math.abs(x - 7.5) <= (y - 1) * 1.05) return COLORS.coral;
    if (y >= 13) return (x + y) % 3 === 0 ? COLORS.pink : COLORS.green;
    return COLORS.sky;
  }, { featured: true }),
  template("friendly-robot", "objects", "Robot amical", "Friendly robot", "Un robot carré qui fait coucou", "A square robot waving hello", (x, y) => {
    if (x >= 4 && x <= 11 && y >= 3 && y <= 9) {
      if (y === 5 && (x === 6 || x === 9)) return COLORS.blue;
      if (y === 8 && x >= 6 && x <= 9) return COLORS.ink;
      return COLORS.cream;
    }
    if (x === 7 || x === 8) {
      if (y <= 3) return y === 1 ? COLORS.gold : COLORS.ink;
    }
    if (x >= 5 && x <= 10 && y >= 10 && y <= 13) return COLORS.purple;
    if (y >= 10 && y <= 12 && (x >= 2 && x <= 4 || x >= 11 && x <= 13)) return COLORS.coral;
    if (y >= 13 && (x === 5 || x === 6 || x === 9 || x === 10)) return COLORS.ink;
    return COLORS.sky;
  }, { featured: true }),
  template("little-car", "objects", "Petite voiture", "Little car", "Une voiture vive sur la route", "A bright car on the road", (x, y) => {
    if (y >= 7 && y <= 11 && x >= 2 && x <= 13) return y === 7 && (x < 5 || x > 10) ? COLORS.sky : COLORS.coral;
    if (y >= 5 && y <= 7 && x >= 5 && x <= 10) return x === 6 || x === 9 ? COLORS.blue : COLORS.pink;
    if (ellipse(x, y, 5, 12, 1.8, 1.8) || ellipse(x, y, 11, 12, 1.8, 1.8)) return COLORS.ink;
    if (y >= 13) return COLORS.ink;
    return COLORS.sky;
  }),
  template("sailboat", "objects", "Voilier au vent", "Sailboat", "Un petit bateau poussé par le vent", "A small boat carried by the wind", (x, y) => {
    if (x === 8 && y >= 2 && y <= 11) return COLORS.brown;
    if (y >= 3 && y <= 9 && x >= 3 && x < 8 && x >= y - 1) return COLORS.cream;
    if (y >= 4 && y <= 10 && x > 8 && x <= 12 && x <= 16 - y / 2) return COLORS.pink;
    if (y >= 10 && y <= 12 && x >= 3 && x <= 13 && Math.abs(x - 8) <= 7 - (y - 10) * 1.4) return COLORS.coral;
    if (y >= 13) return (x + y) % 2 === 0 ? COLORS.blue : COLORS.purple;
    return COLORS.sky;
  }),
  template("tiny-castle", "objects", "Petit château", "Tiny castle", "Un château avec ses trois tours", "A castle with three towers", (x, y) => {
    if (y >= 5 && y <= 13 && ((x >= 2 && x <= 5) || (x >= 6 && x <= 10) || (x >= 11 && x <= 14))) {
      if (y >= 9 && x >= 7 && x <= 9) return COLORS.ink;
      if (y === 7 && (x === 4 || x === 12)) return COLORS.blue;
      return COLORS.cream;
    }
    if ((y === 3 || y === 4) && (x >= 2 && x <= 5 || x >= 11 && x <= 14)) return (x + y) % 2 === 0 ? COLORS.purple : COLORS.cream;
    if (y >= 2 && y <= 4 && x >= 6 && x <= 10) return (x + y) % 2 === 0 ? COLORS.pink : COLORS.cream;
    if (y >= 14) return COLORS.green;
    return COLORS.sky;
  }),
];

export const heroTemplate = rocket;

export const templateCategoryLabels: Record<"featured" | TemplateCategory, Record<Locale, string>> = {
  featured: { fr: "Favoris", en: "Featured" },
  animals: { fr: "Animaux", en: "Animals" },
  nature: { fr: "Nature", en: "Nature" },
  space: { fr: "Espace", en: "Space" },
  treats: { fr: "Gourmandises", en: "Treats" },
  objects: { fr: "Objets & lieux", en: "Objects & places" },
};

export function getLocalizedProjectName(projectName: string, locale: Locale) {
  return templateCatalog.find((item) => item.project.name === projectName)?.name[locale] ?? projectName;
}
