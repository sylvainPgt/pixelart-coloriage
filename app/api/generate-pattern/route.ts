import { generateText, gateway, Output } from "ai";
import { z } from "zod";
import { normalizeGeneratedPattern, type PatternQualityReason } from "@/lib/generated-pattern";
import type { PixelProject } from "@/lib/pixel-art";

export const runtime = "nodejs";
export const maxDuration = 30;

// Gemini Flash Lite is inexpensive and reliable for constrained structured output.
const MODEL_ID = "google/gemini-2.5-flash-lite";
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 5;
const MAX_GENERATION_ATTEMPTS = 3;
const DETAIL_SIZES = {
  simple: 12,
  classic: 16,
  detailed: 24,
} as const;

const requestSchema = z.object({
  prompt: z.string().trim().min(2).max(80),
  style: z.enum(["cute", "retro", "minimal"]),
  detail: z.enum(["simple", "classic", "detailed"]),
  locale: z.enum(["fr", "en"]).default("fr"),
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
  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id") ?? "local";
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.warn(JSON.stringify({ level: "warning", msg: "generation_rejected", reason: "invalid_json", requestId }));
    return Response.json({ error: "La demande est illisible." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  const requestedLocale = typeof body === "object" && body !== null && "locale" in body && body.locale === "en" ? "en" : "fr";
  if (!parsed.success) {
    console.warn(JSON.stringify({ level: "warning", msg: "generation_rejected", reason: "invalid_request", requestId }));
    return Response.json(
      { error: requestedLocale === "fr" ? "Décris ton idée en 2 à 80 caractères." : "Describe your idea in 2 to 80 characters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (isRateLimited(clientIdentifier(request))) {
    console.warn(JSON.stringify({ level: "warning", msg: "generation_rate_limited", requestId }));
    return Response.json(
      { error: parsed.data.locale === "fr" ? "Tu as atteint les 5 créations autorisées cette heure-ci. Réessaie un peu plus tard." : "You have reached the limit of 5 creations per hour. Please try again later." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { prompt, style, detail, locale } = parsed.data;
  const size = DETAIL_SIZES[detail];
  console.log(JSON.stringify({ level: "info", msg: "generation_start", requestId, style, detail, locale, size }));
  const patternSchema = z.object({
    name: z.string().trim().min(1).max(48),
    palette: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).length(6),
    // Width and height are normalized after generation. Small models often make
    // an otherwise harmless one-cell counting mistake in a recognizable motif.
    rows: z.array(z.string().min(1).max(64)).min(1).max(48),
  });

  const styleInstruction = {
    cute: "formes rondes, expression chaleureuse, couleurs joyeuses",
    retro: "silhouette arcade 8-bit, contraste franc, aucun dégradé",
    minimal: "silhouette épurée, très peu de détails, lecture immédiate",
  }[style];

  let attemptsUsed = 0;
  const failureReasons: string[] = [];
  try {
    const minimumForegroundCells = Math.ceil(size * size * 0.25);
    let output: { name: string; palette: string[]; targets: number[] } | undefined;
    let retryFeedback = "";

    const qualityFeedback: Record<PatternQualityReason, string> = {
      too_empty: "Le sujet était trop petit ou presque vide.",
      too_full: "Le fond avait presque disparu.",
      too_few_colors: "Le dessin n’utilisait pas assez de couleurs.",
      too_small: "La silhouette était trop étroite pour être lisible.",
      flat_blocks: "Le résultat ressemblait à des bandes ou à des rectangles uniformes.",
    };

    // Extra attempts only run after an unusable result. Successful requests still
    // use a single inexpensive generation, while intermittent failures recover.
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS && !output; attempt += 1) {
      attemptsUsed = attempt + 1;
      try {
        const result = await generateText({
          model: gateway(MODEL_ID),
          // Mosaipix only needs a short, constrained grid, so disabling reasoning
          // keeps latency and cost low.
          reasoning: "none",
          temperature: attempt === 0 ? 0.65 : attempt === 1 ? 0.85 : 0.75,
          maxOutputTokens: 1400,
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
Tu dois dessiner un vrai sujet : il faut au moins ${minimumForegroundCells} cases non nulles. Ne renvoie jamais une grille vide.
Utilise de grands aplats cohérents, des contours nets et évite le bruit pixel par pixel.
Ne dessine aucun texte, lettre, chiffre, cadre ou signature.
Pour les objets connus, respecte leur silhouette caractéristique et leurs couleurs habituelles.
Donne au motif un nom court en ${locale === "fr" ? "français" : "anglais"}.
Style demandé : ${styleInstruction}.${attempt > 0 ? ` La proposition précédente a été refusée : ${retryFeedback} Repars de zéro avec une silhouette différente, asymétrique si nécessaire, et immédiatement identifiable.` : ""}`,
          prompt: `Dessine en pixel art : ${prompt}. Construis directement le motif dans les lignes indexées, pas une description.`,
        });

        const normalized = normalizeGeneratedPattern(result.output.rows, size, result.output.palette.length);
        if (normalized.quality.ok) {
          output = {
            name: result.output.name,
            palette: result.output.palette,
            targets: normalized.targets,
          };
        } else {
          retryFeedback = qualityFeedback[normalized.quality.reason];
          failureReasons.push(normalized.quality.reason);
          console.warn(JSON.stringify({
            level: "warning",
            msg: "generation_attempt_rejected",
            requestId,
            attempt: attemptsUsed,
            reason: normalized.quality.reason,
          }));
        }
      } catch (error) {
        retryFeedback = "La grille ne respectait pas le format demandé.";
        failureReasons.push("invalid_format");
        console.warn(JSON.stringify({
          level: "warning",
          msg: "generation_attempt_rejected",
          requestId,
          attempt: attemptsUsed,
          reason: "invalid_format",
          errorType: error instanceof Error ? error.name : "UnknownError",
        }));
      }
    }

    if (!output) throw new Error("The model did not return a usable pixel-art grid.");

    const project: PixelProject = {
      version: 2,
      name: output.name,
      width: size,
      height: size,
      palette: output.palette.map((color) => color.toLowerCase()),
      targets: output.targets,
    };

    console.log(JSON.stringify({
      level: "info",
      msg: "generation_done",
      requestId,
      style,
      detail,
      locale,
      size,
      attempts: attemptsUsed,
      ms: Date.now() - startedAt,
    }));

    return Response.json(
      { project },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      msg: "generation_failed",
      requestId,
      style,
      detail,
      locale,
      size,
      errorType: error instanceof Error ? error.name : "UnknownError",
      attempts: attemptsUsed,
      failureReasons,
      ms: Date.now() - startedAt,
    }));
    return Response.json(
      { error: locale === "fr" ? "Le motif n’a pas pu être créé. Réessaie avec une description plus simple." : "The pattern could not be created. Try a simpler description." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
