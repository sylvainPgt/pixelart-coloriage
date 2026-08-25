import { createHash } from "node:crypto";
import { generateText, gateway } from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 20;

const MODEL_ID = "google/gemini-2.5-flash-lite";
const OPENVERSE_IMAGES_URL = "https://api.openverse.org/v1/images/";
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 10;
const FRENCH_SEARCH_TERMS: Record<string, string> = {
  astronaute: "astronaut",
  banane: "banana",
  bateau: "boat",
  chat: "cat",
  chateau: "castle",
  chien: "dog",
  coeur: "heart",
  dinosaure: "dinosaur",
  espace: "space",
  etoile: "star",
  fleur: "flower",
  fleurie: "flower",
  fusee: "rocket",
  hibou: "owl",
  lapin: "rabbit",
  licorne: "unicorn",
  lune: "moon",
  maison: "house",
  mer: "sea",
  mignon: "cute",
  mignonne: "cute",
  montagne: "mountain",
  panda: "panda",
  pirate: "pirate",
  petite: "small",
  petit: "small",
  princesse: "princess",
  renard: "fox",
  robot: "robot",
  souriant: "smiling",
  souriante: "smiling",
  soleil: "sun",
  voiture: "car",
};
const FRENCH_STOP_WORDS = new Set(["un", "une", "le", "la", "les", "de", "des", "du", "d", "avec", "dans", "sur", "et"]);
const SEARCH_SYNONYMS: Record<string, string[]> = {
  astronaut: ["astronaut", "space", "cosmic", "moon"],
  cat: ["cat", "kitten", "feline"],
  dog: ["dog", "puppy", "canine"],
  flower: ["flower", "floral", "blossom"],
  house: ["house", "home", "cottage"],
};

const requestSchema = z.object({
  prompt: z.string().trim().min(2).max(80),
  locale: z.enum(["fr", "en"]).default("fr"),
});

type OpenverseImage = {
  id?: unknown;
  title?: unknown;
  creator?: unknown;
  attribution?: unknown;
  license?: unknown;
  license_url?: unknown;
  foreign_landing_url?: unknown;
  thumbnail?: unknown;
};

type RateEntry = { count: number; resetAt: number };
const rateEntries = new Map<string, RateEntry>();

function isRateLimited(identifier: string) {
  const now = Date.now();
  const current = rateEntries.get(identifier);
  if (!current || current.resetAt <= now) {
    rateEntries.set(identifier, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

function clientIdentifier(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
  return createHash("sha256")
    .update(`${process.env.VERCEL_PROJECT_ID ?? "mosaipix"}:${address}`)
    .digest("hex");
}

function safeText(value: unknown, fallback: string, maxLength = 120) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

function safeHttpsUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function relevanceScore(image: OpenverseImage, query: string) {
  const title = safeText(image.title, "").toLowerCase();
  const terms = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return terms.reduce((score, term) => {
    const alternatives = SEARCH_SYNONYMS[term] ?? [term];
    return score + (alternatives.some((alternative) => title.includes(alternative)) ? 1 : 0);
  }, 0);
}

function localFrenchQuery(prompt: string) {
  let translatedTerms = 0;
  const words = prompt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
  const translated = words.flatMap((word) => {
    if (FRENCH_STOP_WORDS.has(word)) return [];
    if (FRENCH_SEARCH_TERMS[word]) translatedTerms += 1;
    return [FRENCH_SEARCH_TERMS[word] ?? word];
  });
  return translatedTerms > 0 ? translated.join(" ").slice(0, 80) : null;
}

async function searchQuery(prompt: string, locale: "fr" | "en") {
  if (locale === "en") return prompt;
  const localTranslation = localFrenchQuery(prompt);
  if (localTranslation) return localTranslation;
  try {
    const result = await generateText({
      model: gateway(MODEL_ID),
      reasoning: "none",
      temperature: 0,
      maxOutputTokens: 40,
      system: "Translate the request into 2 to 6 concise English image-search keywords. Return only the keywords, without quotes or explanation.",
      prompt,
      providerOptions: {
        gateway: {
          disallowPromptTraining: true,
          tags: ["product:mosaipix", "feature:image-search-translation"],
        },
      },
    });
    const translated = result.text.replace(/[^a-zA-Z0-9 -]/g, " ").replace(/\s+/g, " ").trim();
    return translated.slice(0, 80) || prompt;
  } catch {
    return prompt;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "La demande est illisible." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Décris d’abord l’image recherchée." }, { status: 400 });
  }

  if (isRateLimited(clientIdentifier(request))) {
    return Response.json(
      { error: parsed.data.locale === "fr" ? "Tu as atteint la limite de recherches pour cette heure." : "You have reached the image-search limit for this hour." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const query = await searchQuery(parsed.data.prompt, parsed.data.locale);
  const url = new URL(OPENVERSE_IMAGES_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("license_type", "commercial,modification");
  url.searchParams.set("mature", "false");
  url.searchParams.set("page_size", "8");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mosaipix/1.0 (https://mosaipix.com)" },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) throw new Error("Openverse request failed");
    const data = await response.json() as { results?: OpenverseImage[] };
    const images = (data.results ?? [])
      .filter((image) => typeof image.id === "string" && safeHttpsUrl(image.thumbnail))
      .sort((left, right) => relevanceScore(right, query) - relevanceScore(left, query))
      .slice(0, 3)
      .map((image) => ({
        id: image.id as string,
        title: safeText(image.title, parsed.data.locale === "fr" ? "Image libre" : "Open image"),
        creator: safeText(image.creator, parsed.data.locale === "fr" ? "Créateur inconnu" : "Unknown creator", 80),
        attribution: safeText(image.attribution, "Openverse", 220),
        license: safeText(image.license, "CC", 20).toUpperCase(),
        licenseUrl: safeHttpsUrl(image.license_url),
        sourceUrl: safeHttpsUrl(image.foreign_landing_url),
        previewUrl: `/api/free-images/${image.id}`,
      }));

    return Response.json(
      { images },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch {
    return Response.json(
      { error: parsed.data.locale === "fr" ? "La recherche d’images est momentanément indisponible." : "Image search is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
