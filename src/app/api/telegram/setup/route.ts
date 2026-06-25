import { NextResponse } from 'next/server';
import { setWebhook } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-off webhook registration, protected by CRON_SECRET. Call once after
 * TELEGRAM_BOT_TOKEN is added to the environment:
 *   curl https://www.daosentinel.xyz/api/telegram/setup -H "Authorization: Bearer $CRON_SECRET"
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const appUrl = process.env.NEXTAUTH_URL || 'https://www.daosentinel.xyz';
  const result = await setWebhook(appUrl);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
