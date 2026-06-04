import { NextResponse } from 'next/server';
import { desc, eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { proposals, daos } from '@/server/db/schema';
import { authenticateApiKey } from '@/server/api/auth-key';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const r = await authenticateApiKey(req);
  if (!r.ok) return r.response;

  const url = new URL(req.url);
  const state = url.searchParams.get('state') as 'active' | 'closed' | 'pending' | null;
  const daoSlug = url.searchParams.get('dao');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const where = [] as ReturnType<typeof eq>[];
  if (state) where.push(eq(proposals.state, state));
  if (daoSlug) {
    const [dao] = await db.select().from(daos).where(eq(daos.slug, daoSlug)).limit(1);
    if (!dao) {
      return NextResponse.json({ data: [], total: 0 }, { headers: r.headers });
    }
    where.push(eq(proposals.daoId, dao.id));
  }

  const rows = await db
    .select({
      id: proposals.id,
      externalId: proposals.externalId,
      title: proposals.title,
      author: proposals.author,
      state: proposals.state,
      startTimestamp: proposals.startTimestamp,
      endTimestamp: proposals.endTimestamp,
      votesCount: proposals.votesCount,
      aiSummary: proposals.aiSummary,
      aiRiskLevel: proposals.aiRiskLevel,
      hasWhaleVote: proposals.hasWhaleVote,
      hasLastMinuteSwing: proposals.hasLastMinuteSwing,
      daoSlug: daos.slug,
      daoName: daos.name,
    })
    .from(proposals)
    .innerJoin(daos, eq(daos.id, proposals.daoId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(proposals.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ data: rows, limit, offset }, { headers: r.headers });
}
