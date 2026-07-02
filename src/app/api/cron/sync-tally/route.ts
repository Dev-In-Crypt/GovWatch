import { NextResponse } from 'next/server';
import { runTallySyncJob } from '@/server/jobs/sync-tally';
import { requireCronAuth } from '@/server/api/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const offset = Number(searchParams.get('offset') ?? '0') || 0;
  const limit = Number(searchParams.get('limit') ?? '10') || 10;

  try {
    const result = await runTallySyncJob({ offset, limit });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
