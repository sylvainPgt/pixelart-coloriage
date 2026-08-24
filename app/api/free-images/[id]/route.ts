import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 20;

const idSchema = z.string().uuid();
const ALLOWED_LICENSES = new Set(["cc0", "pdm", "by", "by-sa"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return new Response("Not found", { status: 404 });

  try {
    const detailsResponse = await fetch(`https://api.openverse.org/v1/images/${id}/`, {
      headers: { "User-Agent": "Mosaipix/1.0 (https://mosaipix.com)" },
      next: { revalidate: 86_400 },
    });
    if (!detailsResponse.ok) throw new Error("Image not found");
    const details = await detailsResponse.json() as { license?: unknown; thumbnail?: unknown };
    if (typeof details.license !== "string" || !ALLOWED_LICENSES.has(details.license)) {
      return new Response("Unsupported license", { status: 403 });
    }
    if (typeof details.thumbnail !== "string") throw new Error("Missing thumbnail");
    const thumbnailUrl = new URL(details.thumbnail);
    if (thumbnailUrl.protocol !== "https:" || thumbnailUrl.hostname !== "api.openverse.org") {
      throw new Error("Unsupported image host");
    }

    const imageResponse = await fetch(thumbnailUrl, {
      headers: { "User-Agent": "Mosaipix/1.0 (https://mosaipix.com)" },
      next: { revalidate: 86_400 },
    });
    const contentType = imageResponse.headers.get("content-type")?.split(";")[0] ?? "";
    if (!imageResponse.ok || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      throw new Error("Unsupported image response");
    }
    const bytes = await imageResponse.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) return new Response("Image too large", { status: 413 });

    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Image unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
