import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/server/api/cron-auth';
import { runPriceSyncJob } from '@/server/jobs/sync-prices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  const result = await runPriceSyncJob();
  return NextResponse.json({ ok: true, result });
}
