import Link from 'next/link';
import { db } from '@/server/db';
import { sql } from 'drizzle-orm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { shortenAddress } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Cross-DAO voting blocs — DAO Sentinel',
  description: 'Addresses that vote in multiple monitored DAOs.',
};

export default async function VotingBlocsPage({
  searchParams,
}: {
  searchParams: Promise<{ min?: string }>;
}) {
  const sp = await searchParams;
  const min = Math.min(10, Math.max(2, Number(sp.min ?? 3) || 3));

  const rows = (await db.execute(sql`
    WITH voter_summary AS (
      SELECT
        v.voter_address,
        count(DISTINCT v.dao_id)::int AS dao_count,
        count(*)::int AS total_votes,
        array_agg(DISTINCT d.slug ORDER BY d.slug) AS dao_slugs
      FROM votes v
      JOIN daos d ON d.id = v.dao_id
      GROUP BY v.voter_address
      HAVING count(DISTINCT v.dao_id) >= ${min}
    )
    SELECT
      vs.voter_address AS address,
      vs.dao_count,
      vs.total_votes,
      vs.dao_slugs,
      del.ens_name,
      del.karma_score::numeric AS karma_score
    FROM voter_summary vs
    LEFT JOIN delegates del ON del.address = vs.voter_address
    ORDER BY vs.dao_count DESC, vs.total_votes DESC
    LIMIT 200
  `)) as unknown as Array<{
    address: string;
    dao_count: number;
    total_votes: number;
    dao_slugs: string[];
    ens_name: string | null;
    karma_score: string | null;
  }>;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="The cross-DAO map"
        title="Voting"
        highlight="Blocs"
        description={
          <>
            <span className="mono text-[hsl(var(--cyan))]">{rows.length}</span> addresses voted in{' '}
            <span className="mono">≥ {min}</span> DAOs. Sorted by DAO reach.
          </>
        }
        right={
          <form className="flex gap-2 text-sm">
            <select
              name="min"
              defaultValue={String(min)}
              className="h-10 rounded-md bg-[hsl(var(--text-dim)/0.05)] px-3 shadow-[inset_0_0_0_1px_hsl(var(--line))] mono"
            >
              <option value="2">≥ 2 DAOs</option>
              <option value="3">≥ 3 DAOs</option>
              <option value="5">≥ 5 DAOs</option>
              <option value="10">≥ 10 DAOs</option>
            </select>
          </form>
        }
      />

      <div className="glass-card divide-y divide-[hsl(var(--line))] p-0">
        {rows.length === 0 && (
          <div className="p-10 text-center text-sm text-[hsl(var(--text-dim))]">
            No addresses meet the current filter.
          </div>
        )}
        {rows.map((r, i) => (
          <Link
            key={r.address}
            href={`/delegates/${r.address}`}
            className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-[hsl(var(--accent)/0.4)]"
          >
            <div className="flex items-center gap-4">
              <span
                className="w-10 text-base font-bold text-[hsl(var(--text-faint))]"
                style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="mono font-medium">
                  {r.ens_name ?? shortenAddress(r.address)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                  {r.dao_slugs.slice(0, 6).map((slug) => (
                    <Badge key={slug} variant="outline">
                      {slug}
                    </Badge>
                  ))}
                  {r.dao_slugs.length > 6 && (
                    <span className="text-[hsl(var(--text-faint))] mono">
                      +{r.dao_slugs.length - 6}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl mono font-bold text-[hsl(var(--cyan))]">
                {r.dao_count}
                <span style={{ fontSize: 12, color: 'hsl(var(--text-dim))' }}> DAOs</span>
              </div>
              <div className="text-xs mono text-[hsl(var(--text-dim))]">
                {r.total_votes} votes
                {r.karma_score && (
                  <span style={{ color: 'hsl(var(--indigo-bright))' }}>
                    {' '}· K {Number(r.karma_score).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
