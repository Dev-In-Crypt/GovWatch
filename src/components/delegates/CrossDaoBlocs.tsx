'use client';
import Link from 'next/link';
import { trpc } from '@/lib/trpc-client';
import { Badge } from '@/components/ui/badge';
import { shortenAddress } from '@/lib/utils';

/**
 * Lists addresses that voted with the target address on the same proposal +
 * same choice. The denominator (target's total votes) gives the % overlap.
 */
export function CrossDaoBlocs({ address }: { address: string }) {
  const { data, isLoading } = trpc.delegates.blocFor.useQuery({ address, limit: 12 });

  if (isLoading) {
    return (
      <div className="glass-card py-6 text-center text-sm text-[hsl(var(--text-dim))]">
        Computing voting overlap…
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="glass-card py-6 text-center text-sm text-[hsl(var(--text-dim))]">
        No significant co-voters yet — bloc detection needs more votes.
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-[hsl(var(--line))] p-0">
      {data.map((row) => {
        const pct = row.target_total > 0 ? (row.co_votes / row.target_total) * 100 : 0;
        const tone =
          pct >= 75
            ? 'hsl(var(--rose))'
            : pct >= 50
              ? 'hsl(var(--amber))'
              : 'hsl(var(--indigo-bright))';
        return (
          <Link
            key={row.address}
            href={`/delegates/${row.address}`}
            className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-[hsl(var(--accent)/0.4)]"
          >
            <div>
              <div className="mono font-medium">
                {row.ens_name ?? shortenAddress(row.address)}
              </div>
              <div className="text-xs mono text-[hsl(var(--text-dim))]">
                {row.co_votes} of {row.target_total} matching votes
              </div>
            </div>
            <div className="flex items-center gap-3">
              {row.karma_score && (
                <Badge variant="secondary">K · {Number(row.karma_score).toFixed(0)}</Badge>
              )}
              <span className="mono text-sm font-semibold" style={{ color: tone }}>
                {pct.toFixed(0)}%
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
