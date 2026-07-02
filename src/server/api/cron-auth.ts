import { NextResponse } from 'next/server';

/**
 * Fail-closed auth for cron/admin endpoints.
 *
 * The old inline pattern (`if (secret && auth !== ...)`) silently turned every
 * cron endpoint public whenever CRON_SECRET went missing from the environment.
 * This helper refuses to serve at all without a configured secret.
 *
 * Returns null when the request is authorized, otherwise a ready Response.
 */
export function requireCronAuth(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron auth not configured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}
