import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

export const runtime = "nodejs";

const reportSchema = z.object({
  reason: z.enum(["unsafe", "sexual", "hateful", "other"]),
  details: z.string().trim().max(500).default(""),
  prompt: z.string().trim().min(2).max(80),
  locale: z.enum(["fr", "en"]).default("fr"),
});

function clientHash(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
  return createHash("sha256")
    .update(`${process.env.VERCEL_PROJECT_ID ?? "mosaipix"}:${address}`)
    .digest("hex")
    .slice(0, 16);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_report" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const reportId = randomUUID();
  console.warn(JSON.stringify({
    level: "warning",
    msg: "ai_content_report",
    reportId,
    client: clientHash(request),
    ...parsed.data,
  }));

  return Response.json({ reportId }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
