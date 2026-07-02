import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/server/api/cron-auth';
import { runVoteSyncJob } from '@/server/jobs/sync-votes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_CHUNK = 5;

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(
    20,
    Math.max(1, Number(url.searchParams.get('limit') ?? DEFAULT_CHUNK) || DEFAULT_CHUNK),
  );

  try {
    const result = await runVoteSyncJob({ offset, limit });
    return NextResponse.json({
      ok: true,
      result,
      next: result.done ? null : { offset: offset + limit, limit },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
