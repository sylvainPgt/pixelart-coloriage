export type RateEntry = { count: number; resetAt: number };
export type RateResult = { limited: boolean; remaining: number; resetAt: number };

export function isRateEntry(value: unknown): value is RateEntry {
  return Boolean(
    value
    && typeof value === "object"
    && "count" in value
    && "resetAt" in value
    && typeof value.count === "number"
    && typeof value.resetAt === "number",
  );
}

export function advanceRateLimit(
  current: RateEntry | undefined,
  now: number,
  limit: number,
  windowSeconds: number,
): { entry: RateEntry; result: RateResult } {
  const active = current && current.resetAt > now ? current : undefined;
  const resetAt = active?.resetAt ?? now + windowSeconds * 1000;
  if (active && active.count >= limit) {
    return { entry: active, result: { limited: true, remaining: 0, resetAt } };
  }
  const entry = { count: (active?.count ?? 0) + 1, resetAt };
  return {
    entry,
    result: { limited: false, remaining: Math.max(0, limit - entry.count), resetAt },
  };
}
