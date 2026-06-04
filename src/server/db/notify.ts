import { sql } from 'drizzle-orm';
import { db } from './index';

export const ALERT_CHANNEL = 'govwatch_alert';

/**
 * Fire-and-forget Postgres NOTIFY. Called from the alert engine after insert.
 * The payload is a JSON-serialised alert row.
 */
export async function notifyAlert(payload: Record<string, unknown>): Promise<void> {
  const text = JSON.stringify(payload);
  // Postgres NOTIFY payload limit is 8000 bytes; truncate description if needed.
  const safe = text.length > 7000 ? text.slice(0, 7000) : text;
  try {
    await db.execute(sql.raw(`NOTIFY ${ALERT_CHANNEL}, ${quoteLiteral(safe)}`));
  } catch (err) {
    console.error('NOTIFY failed', err);
  }
}

function quoteLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}
