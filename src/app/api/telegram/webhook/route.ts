import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { verifyLinkToken, sendTelegramMessage } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TgUpdate {
  message?: { text?: string; chat?: { id?: number | string } };
}

export async function POST(req: Request) {
  // Graceful no-op until the bot is configured.
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: true, skipped: 'bot not configured' });
  }
  // Fail closed: once the bot is live, the shared webhook secret is mandatory —
  // otherwise anyone who finds this URL can forge /start and /stop updates.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'webhook secret not configured' }, { status: 503 });
  }
  if (req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const text = update.message?.text ?? '';
  const chatId = update.message?.chat?.id;
  if (!chatId) return NextResponse.json({ ok: true });
  const chat = String(chatId);

  if (text.startsWith('/start')) {
    const param = text.split(/\s+/)[1];
    const userId = param ? verifyLinkToken(param) : null;
    if (!userId) {
      await sendTelegramMessage(
        chat,
        'Welcome to *DAO Sentinel*. Open Settings on the site and tap "Connect Telegram" to link your account and start receiving governance alerts.',
      );
      return NextResponse.json({ ok: true });
    }
    await db
      .update(users)
      .set({ telegramChatId: chat, alertTelegram: true })
      .where(eq(users.id, userId));
    await sendTelegramMessage(
      chat,
      "✅ *Linked!* You'll now get whale, swing and quorum alerts for the DAOs on your watchlist. Send /stop any time to pause.",
    );
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith('/stop')) {
    await db.update(users).set({ alertTelegram: false }).where(eq(users.telegramChatId, chat));
    await sendTelegramMessage(chat, 'Alerts paused. Re-enable any time from Settings on the site.');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
