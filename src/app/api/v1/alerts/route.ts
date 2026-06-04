import { NextResponse } from 'next/server';
import { desc, eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { alerts, daos } from '@/server/db/schema';
import { authenticateApiKey } from '@/server/api/auth-key';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const r = await authenticateApiKey(req);
  if (!r.ok) return r.response;

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const severity = url.searchParams.get('severity');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);

  const where = [] as ReturnType<typeof eq>[];
  if (type) where.push(eq(alerts.type, type));
  if (severity) where.push(eq(alerts.severity, severity));

  const rows = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      severity: alerts.severity,
      title: alerts.title,
      description: alerts.description,
      data: alerts.data,
      createdAt: alerts.createdAt,
      daoSlug: daos.slug,
      daoName: daos.name,
    })
    .from(alerts)
    .innerJoin(daos, eq(daos.id, alerts.daoId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(alerts.createdAt))
    .limit(limit);

  return NextResponse.json({ data: rows }, { headers: r.headers });
}
