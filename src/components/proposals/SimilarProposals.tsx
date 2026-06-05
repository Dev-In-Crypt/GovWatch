'use client';
import Link from 'next/link';
import { trpc } from '@/lib/trpc-client';
import { Badge } from '@/components/ui/badge';
import { timeAgo, formatNumber } from '@/lib/utils';

/**
 * Renders the top-K most-similar past proposals (by embedding cosine
 * similarity) with their outcomes — answers "what happened last time
 * a DAO voted on this?"
 */
export function SimilarProposals({ proposalId }: { proposalId: string }) {
  const { data, isLoading } = trpc.proposals.similar.useQuery({ id: proposalId, limit: 3 });

  if (isLoading) {
    return (
      <div className="glass-card py-6 text-center text-sm text-[hsl(var(--text-dim))]">
        Finding similar proposals…
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="glass-card py-6 text-center text-sm text-[hsl(var(--text-dim))]">
        No similar past proposals yet — embeddings populate over time.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {data.map((p) => {
        const outcome =
          p.state === 'active'
            ? { label: 'live', variant: 'secondary' as const }
            : p.quorumReached
              ? { label: '✓ passed', variant: 'success' as const }
              : { label: '✕ failed', variant: 'destructive' as const };

        const simPct = Math.round(p.similarity * 100);
        return (
          <Link key={p.id} href={`/proposals/${p.id}`} className="group">
            <div className="glass-card h-full space-y-3 py-4">
              <div className="flex items-center justify-between text-xs mono text-[hsl(var(--text-dim))]">
                <span>{p.daoName}</span>
                <span style={{ color: 'hsl(var(--indigo-bright))' }}>{simPct}% match</span>
              </div>
              <div
                className="line-clamp-3 text-sm font-semibold leading-snug"
                style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
              >
                {p.title}
              </div>
              <div className="flex items-center justify-between text-xs mono text-[hsl(var(--text-faint))]">
                <Badge variant={outcome.variant}>{outcome.label}</Badge>
                <span>
                  {formatNumber(p.votesCount ?? 0)} votes · {timeAgo(p.endTimestamp)}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
