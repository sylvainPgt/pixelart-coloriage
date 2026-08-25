import { createHash } from "node:crypto";
import { getCache } from "@vercel/functions";
import { APICallError, generateImage, gateway } from "ai";
import { z } from "zod";
import { advanceRateLimit, isRateEntry, type RateEntry, type RateResult } from "@/lib/ip-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL_ID = "spacexai/grok-imagine-image";
const RATE_LIMIT = 3;
const RATE_WINDOW_SECONDS = 24 * 60 * 60;
const requestSchema = z.object({
  prompt: z.string().trim().min(2).max(80),
  style: z.enum(["cute", "retro", "minimal"]),
  detail: z.enum(["simple", "classic", "detailed"]),
  locale: z.enum(["fr", "en"]).default("fr"),
});

const localRateEntries = new Map<string, RateEntry>();

function clientHash(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
  return createHash("sha256")
    .update(`${process.env.VERCEL_PROJECT_ID ?? "mosaipix"}:${address}`)
    .digest("hex");
}

async function consumeRateLimit(identifier: string): Promise<RateResult> {
  const now = Date.now();
  try {
    const cache = getCache({ namespace: "mosaipix-ai-image-rate" });
    const cached = await cache.get(identifier);
    const { entry, result } = advanceRateLimit(isRateEntry(cached) ? cached : undefined, now, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!result.limited) {
      await cache.set(identifier, entry, {
        ttl: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
        tags: ["ai-image-rate"],
        name: "Mosaipix AI image rate limit",
      });
    }
    return result;
  } catch (error) {
    console.warn(JSON.stringify({
      level: "warning",
      msg: "image_rate_cache_fallback",
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    const { entry, result } = advanceRateLimit(localRateEntries.get(identifier), now, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!result.limited) localRateEntries.set(identifier, entry);
    return result;
  }
}

function rateHeaders(rate: RateResult) {
  return {
    "Cache-Control": "no-store",
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
  };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id") ?? "local";
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "La demande est illisible." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  const requestedLocale = typeof body === "object" && body !== null && "locale" in body && body.locale === "en" ? "en" : "fr";
  if (!parsed.success) {
    return Response.json(
      { error: requestedLocale === "fr" ? "Décris ton idée en 2 à 80 caractères." : "Describe your idea in 2 to 80 characters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const identifier = clientHash(request);
  const rate = await consumeRateLimit(identifier);
  const { prompt, style, detail, locale } = parsed.data;
  if (rate.limited) {
    console.warn(JSON.stringify({ level: "warning", msg: "image_generation_rate_limited", requestId }));
    return Response.json(
      { error: locale === "fr" ? "Tu as utilisé les 3 créations IA disponibles pour ces 24 heures. Les images libres restent disponibles." : "You have used the 3 AI creations available for these 24 hours. Open images are still available." },
      { status: 429, headers: rateHeaders(rate) },
    );
  }

  const styleInstruction = {
    cute: "soft rounded shapes, a warm expression, playful colors",
    retro: "bold retro arcade illustration, crisp edges, strong contrast",
    minimal: "very simple iconic silhouette, minimal detail, immediate readability",
  }[style];

  console.log(JSON.stringify({
    level: "info",
    msg: "image_generation_start",
    requestId,
    style,
    detail,
    locale,
    remaining: rate.remaining,
  }));

  try {
    const { image } = await generateImage({
      model: gateway.image(MODEL_ID),
      size: "1024x1024",
      abortSignal: AbortSignal.timeout(50_000),
      prompt: `Create one clean, flat, icon-like illustration of: ${prompt}.
Show a single centered subject, fully visible, on a plain warm off-white background.
The subject must fill about 80 percent of the square canvas, with only a modest clean margin around it.
Every concept in the request must have unmistakable visual traits. For a combined subject, make every part clearly identifiable.
Use ${styleInstruction}. Use 6 to 8 large, coherent color areas, a strong silhouette, and no gradients or tiny texture.
No text, letters, numbers, frame, watermark, scenery, split panels, geometric test pattern, or abstract color blocks.
This image will be reduced to a small coloring grid, so favor recognizable shapes over realism.`,
      providerOptions: {
        gateway: {
          disallowPromptTraining: true,
          user: identifier,
          tags: ["product:mosaipix", "feature:image-generation", `detail:${detail}`],
        },
      },
    });

    console.log(JSON.stringify({
      level: "info",
      msg: "image_generation_done",
      requestId,
      style,
      detail,
      locale,
      remaining: rate.remaining,
      ms: Date.now() - startedAt,
    }));

    const imageBuffer = Uint8Array.from(image.uint8Array).buffer;
    return new Response(new Blob([imageBuffer], { type: image.mediaType }), {
      headers: {
        ...rateHeaders(rate),
        "Content-Type": image.mediaType,
      },
    });
  } catch (error) {
    const providerStatus = APICallError.isInstance(error) ? error.statusCode : undefined;
    console.error(JSON.stringify({
      level: "error",
      msg: "image_generation_failed",
      requestId,
      style,
      detail,
      locale,
      providerStatus,
      errorType: error instanceof Error ? error.name : "UnknownError",
      ms: Date.now() - startedAt,
    }));

    const status = providerStatus === 402 ? 402 : providerStatus === 429 ? 429 : 502;
    const errorMessage = locale === "fr"
      ? status === 402
        ? "Le budget IA est épuisé. Choisis plutôt une image libre."
        : status === 429
          ? "Le service d’image est très sollicité. Réessaie plus tard ou choisis une image libre."
          : "L’image n’a pas pu être créée. Voici des images libres à la place."
      : status === 402
        ? "The AI budget is exhausted. Choose an open image instead."
        : status === 429
          ? "The image service is busy. Try later or choose an open image."
          : "The image could not be created. Here are open images instead.";
    return Response.json({ error: errorMessage }, { status, headers: rateHeaders(rate) });
  }
}
