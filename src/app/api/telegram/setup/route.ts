import { NextResponse } from 'next/server';
import { setWebhook } from '@/lib/telegram';
import { requireCronAuth } from '@/server/api/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-off webhook registration, protected by CRON_SECRET. Call once after
 * TELEGRAM_BOT_TOKEN is added to the environment:
 *   curl https://www.daosentinel.xyz/api/telegram/setup -H "Authorization: Bearer $CRON_SECRET"
 */
export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  const appUrl = process.env.NEXTAUTH_URL || 'https://www.daosentinel.xyz';
  const result = await setWebhook(appUrl);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
