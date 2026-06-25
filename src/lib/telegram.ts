import crypto from 'crypto';

/**
 * Telegram helper. Everything here is a graceful no-op until the bot is
 * configured (TELEGRAM_BOT_TOKEN + TELEGRAM_BOT_USERNAME), so the connect
 * flow and alert delivery can ship before the token exists.
 *
 * Account linking is stateless: we hand the user a deep link
 *   https://t.me/<bot>?start=<token>
 * where <token> = base64url(userId).hmac(userId). When Telegram delivers the
 * "/start <token>" message to our webhook we verify the HMAC and bind the
 * chat to that user — no extra DB column or short-lived code store needed.
 */

export const TELEGRAM_API = 'https://api.telegram.org';

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export function botUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME || null;
}

function linkSecret(): string {
  return process.env.NEXTAUTH_SECRET || 'dao-sentinel-dev-secret';
}

export function makeLinkToken(userId: string): string {
  const payload = Buffer.from(userId).toString('base64url');
  const sig = crypto
    .createHmac('sha256', linkSecret())
    .update(payload)
    .digest('base64url')
    .slice(0, 20);
  return `${payload}.${sig}`;
}

export function verifyLinkToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac('sha256', linkSecret())
    .update(payload)
    .digest('base64url')
    .slice(0, 20);
  // Constant-time compare to avoid leaking via timing.
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

/** Deep link the user taps to connect their Telegram. Null until bot is set. */
export function connectLink(userId: string): string | null {
  const user = botUsername();
  if (!user) return null;
  return `https://t.me/${user}?start=${makeLinkToken(userId)}`;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (e) {
    console.warn('[telegram] send failed', (e as Error).message);
    return false;
  }
}

/**
 * Register the webhook with Telegram. Run once after the token is set, e.g.:
 *   curl "https://www.daosentinel.xyz/api/telegram/setup" -H "Authorization: Bearer $CRON_SECRET"
 */
export async function setWebhook(appUrl: string): Promise<{ ok: boolean; detail: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, detail: 'TELEGRAM_BOT_TOKEN not set' };
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
  const url = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;
  const res = await fetch(`${TELEGRAM_API}/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url,
      ...(secret ? { secret_token: secret } : {}),
      allowed_updates: ['message'],
    }),
  });
  const body = await res.text();
  return { ok: res.ok, detail: body };
}
