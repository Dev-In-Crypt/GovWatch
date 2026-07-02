import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/server/api/cron-auth';
import { runScoreJob } from '@/server/jobs/compute-scores';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  const result = await runScoreJob();
  return NextResponse.json({ ok: true, result });
}
