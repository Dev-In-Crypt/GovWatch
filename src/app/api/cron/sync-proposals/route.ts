import { NextResponse } from 'next/server';
import { runProposalSyncJob } from '@/server/jobs/sync-proposals';
import { requireCronAuth } from '@/server/api/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  try {
    const result = await runProposalSyncJob();
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
