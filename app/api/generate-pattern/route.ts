import { generateText, gateway, Output } from "ai";
import { z } from "zod";
import type { PixelProject } from "@/lib/pixel-art";

export const runtime = "nodejs";
export const maxDuration = 30;

// Qwen provides structured output in non-thinking mode at a very low cost.
const MODEL_ID = "alibaba/qwen3.7-flash";
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 5;
const DETAIL_SIZES = {
  simple: 12,
  classic: 16,
  detailed: 24,
} as const;

const requestSchema = z.object({
  prompt: z.string().trim().min(2).max(80),
  style: z.enum(["cute", "retro", "minimal"]),
  detail: z.enum(["simple", "classic", "detailed"]),
});

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
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
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
    return Response.json(
      { error: "Décris ton idée en 2 à 80 caractères." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (isRateLimited(clientIdentifier(request))) {
    return Response.json(
      { error: "Tu as atteint les 5 créations autorisées cette heure-ci. Réessaie un peu plus tard." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { prompt, style, detail } = parsed.data;
  const size = DETAIL_SIZES[detail];
  const rowPattern = new RegExp(`^[0-5]{${size}}$`);
  const patternSchema = z.object({
    name: z.string().trim().min(1).max(48),
    palette: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).length(6),
    rows: z.array(z.string().regex(rowPattern)).length(size),
  });

  const styleInstruction = {
    cute: "formes rondes, expression chaleureuse, couleurs joyeuses",
    retro: "silhouette arcade 8-bit, contraste franc, aucun dégradé",
    minimal: "silhouette épurée, très peu de détails, lecture immédiate",
  }[style];

  try {
    const result = await generateText({
      model: gateway(MODEL_ID),
      // Qwen exposes structured output in non-thinking mode. Pixelia only
      // needs a short, constrained grid, so this also keeps latency and cost low.
      reasoning: "none",
      maxOutputTokens: 1200,
      output: Output.object({
        name: "pixel_art_pattern",
        description: "Un motif pixel-art reconnaissable avec une palette et des lignes indexées.",
        schema: patternSchema,
      }),
      system: `Tu es un pixel artist spécialisé dans les petits modèles à colorier.
Crée une silhouette immédiatement reconnaissable à taille miniature.
La palette contient exactement 6 couleurs hexadécimales. L'index 0 est le fond.
Chaque ligne contient exactement ${size} chiffres de 0 à 5, sans espace.
Le sujet doit être centré, occuper entre 25 % et 65 % de la grille et rester entouré de fond.
Tu dois dessiner un vrai sujet : il faut au moins ${Math.ceil(size * size * 0.25)} cases non nulles. Ne renvoie jamais une grille vide.
Utilise de grands aplats cohérents, des contours nets et évite le bruit pixel par pixel.
Ne dessine aucun texte, lettre, chiffre, cadre ou signature.
Pour les objets connus, respecte leur silhouette caractéristique et leurs couleurs habituelles.
Style demandé : ${styleInstruction}.`,
      prompt: `Dessine en pixel art : ${prompt}. Construis directement le motif dans les lignes indexées, pas une description.`,
    });

    const foregroundCells = result.output.rows
      .join("")
      .split("")
      .filter((cell) => cell !== "0").length;
    if (foregroundCells < Math.ceil(size * size * 0.25)) {
      throw new Error("The model returned an empty pixel-art grid.");
    }

    const targets = result.output.rows.flatMap((row) =>
      [...row].map((character) => Number(character)),
    );
    const project: PixelProject = {
      version: 2,
      name: result.output.name,
      width: size,
      height: size,
      palette: result.output.palette.map((color) => color.toLowerCase()),
      targets,
    };

    return Response.json(
      { project },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Pixel-art generation failed", error);
    return Response.json(
      { error: "Le motif n’a pas pu être créé. Réessaie avec une description plus simple." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
