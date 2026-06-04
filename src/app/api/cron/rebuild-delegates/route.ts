import { NextResponse } from 'next/server';
import { runRebuildDelegatesJob } from '@/server/jobs/rebuild-delegates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel limit; chunked so each call fits.

const DEFAULT_CHUNK = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(
    1000,
    Math.max(50, Number(url.searchParams.get('limit') ?? DEFAULT_CHUNK) || DEFAULT_CHUNK),
  );

  const result = await runRebuildDelegatesJob({ offset, limit });

  return NextResponse.json({
    ok: true,
    result,
    next: result.done ? null : { offset: offset + limit, limit },
  });
}
