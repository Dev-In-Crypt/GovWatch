import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/server/api/cron-auth';
import { runDigestJob } from '@/server/jobs/send-digest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  const result = await runDigestJob();
  return NextResponse.json({ ok: true, result });
}
