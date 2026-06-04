import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { checkRateLimit, BURST_LIMIT, PLAN_MONTHLY_QUOTA } from './rate-limit';

export interface ApiAuthResult {
  user: typeof users.$inferSelect;
  remainingMonth: number;
  monthlyQuota: number;
}

export async function authenticateApiKey(req: Request): Promise<
  | { ok: true; auth: ApiAuthResult; headers: Record<string, string> }
  | { ok: false; response: Response }
> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'missing_api_key', hint: 'Send Authorization: Bearer <key>' },
        { status: 401 },
      ),
    };
  }

  const [user] = await db.select().from(users).where(eq(users.apiKey, token)).limit(1);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'invalid_api_key' }, { status: 401 }),
    };
  }

  const plan = (user.plan as keyof typeof PLAN_MONTHLY_QUOTA) ?? 'free';
  const quota = PLAN_MONTHLY_QUOTA[plan] ?? 0;
  if (quota === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'plan_required', plan, hint: 'Upgrade to delegate_pro or fund_suite' },
        { status: 402 },
      ),
    };
  }

  const used = user.apiCallsThisMonth ?? 0;
  if (used >= quota) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'monthly_quota_exceeded', quota, used },
        { status: 429 },
      ),
    };
  }

  // 5 req/sec burst protection
  const burst = checkRateLimit(`api:${user.id}`, BURST_LIMIT.rps, BURST_LIMIT.windowMs);
  if (!burst.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'rate_limited', retryAfterMs: burst.resetAt - Date.now() },
        { status: 429, headers: { 'retry-after': '1' } },
      ),
    };
  }

  // Increment monthly counter (fire-and-forget, race is acceptable)
  void db
    .update(users)
    .set({ apiCallsThisMonth: sql`coalesce(${users.apiCallsThisMonth}, 0) + 1` })
    .where(eq(users.id, user.id));

  return {
    ok: true,
    auth: { user, remainingMonth: quota - used - 1, monthlyQuota: quota },
    headers: {
      'x-ratelimit-limit-month': String(quota),
      'x-ratelimit-remaining-month': String(quota - used - 1),
      'x-ratelimit-remaining-burst': String(burst.remaining),
    },
  };
}

export function generateApiKey(): string {
  // 32 random bytes → base64url, prefixed with gw_
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const b64 = btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `gw_${b64}`;
}
