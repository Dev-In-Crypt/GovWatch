import postgres from 'postgres';
import { ALERT_CHANNEL } from '@/server/db/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE endpoint backed by Postgres LISTEN.
 *
 * Each client opens its own dedicated connection (postgres-js opens one per
 * client because LISTEN requires a session-level connection that won't be
 * pooled). Cleanup happens on AbortSignal abort.
 *
 * Cost: one open connection per active /alerts viewer. For a free-tier MVP
 * with a few hundred users this is fine; behind a load balancer in prod we'd
 * front this with a single listener that fan-outs via Redis.
 */
export async function GET(req: Request) {
  const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/govwatch';
  const sql = postgres(url, { max: 1, idle_timeout: 0, connect_timeout: 5 });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string, event?: string) => {
        let chunk = '';
        if (event) chunk += `event: ${event}\n`;
        chunk += `data: ${data}\n\n`;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controller closed
        }
      };

      send('connected', 'hello');

      // Heartbeat every 25 s keeps proxies from timing out the stream.
      const heartbeat = setInterval(() => send('ping'), 25_000);

      try {
        await sql.listen(
          ALERT_CHANNEL,
          (payload) => send(payload, 'alert'),
          () => send('listening', 'status'),
        );
      } catch (err) {
        console.error('listen failed', err);
        send(JSON.stringify({ error: 'listen_failed' }), 'error');
      }

      const abort = () => {
        clearInterval(heartbeat);
        sql.end({ timeout: 1 }).catch(() => undefined);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener('abort', abort);
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
