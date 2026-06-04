import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/server/db';
import { daos } from '@/server/db/schema';
import { authenticateApiKey } from '@/server/api/auth-key';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const r = await authenticateApiKey(req);
  if (!r.ok) return r.response;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 300);

  const rows = await db
    .select({
      slug: daos.slug,
      name: daos.name,
      chain: daos.chain,
      governanceToken: daos.governanceToken,
      democracyScore: daos.democracyScore,
      scoreBreakdown: daos.scoreBreakdown,
      treasuryUsd: daos.treasuryUsd,
      totalProposals: daos.totalProposals,
    })
    .from(daos)
    .orderBy(desc(daos.democracyScore))
    .limit(limit);

  return NextResponse.json({ data: rows }, { headers: r.headers });
}
