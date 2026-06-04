/**
 * In-memory token bucket. Survives within a single warm Lambda; per-edge
 * deployment this is best-effort but matches the spec's "1K/10K per month"
 * checked against users.api_calls_this_month — the real ceiling is in the DB.
 */
const WINDOWS = new Map<string, { tokens: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = WINDOWS.get(key);
  if (!bucket || bucket.resetAt < now) {
    const fresh = { tokens: limit - 1, resetAt: now + windowMs };
    WINDOWS.set(key, fresh);
    return { ok: true, remaining: fresh.tokens, resetAt: fresh.resetAt };
  }
  if (bucket.tokens <= 0) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.tokens -= 1;
  return { ok: true, remaining: bucket.tokens, resetAt: bucket.resetAt };
}

export const PLAN_MONTHLY_QUOTA = {
  free: 0,
  delegate_pro: 1_000,
  fund_suite: 10_000,
} as const;

export const BURST_LIMIT = { rps: 5, windowMs: 1_000 } as const;
