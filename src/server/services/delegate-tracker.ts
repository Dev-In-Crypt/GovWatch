import { eq, sql, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { delegates, delegateDaoActivity, votes, proposals, daos } from '../db/schema';

/**
 * Materialise delegate profiles from the votes table.
 * For every distinct voter we ensure a delegates row, then rebuild the
 * per-DAO activity rollup.
 *
 * Paginated to stay within Vercel's 300 s function timeout: pass `offset`
 * and `limit` to process a chunk; the cron workflow walks chunks daily.
 *
 * Returns `done: true` when the requested chunk yielded fewer rows than the
 * limit (meaning we've reached the tail of the top-voters list).
 */
export async function rebuildDelegateProfiles(opts: {
  limit?: number;
  offset?: number;
} = {}): Promise<{
  delegates: number;
  activities: number;
  done: boolean;
}> {
  const limit = opts.limit ?? 300;
  const offset = opts.offset ?? 0;

  // Discover top voters by total votes cast — paginated by (offset, limit)
  const topVoters = await db
    .select({
      address: votes.voterAddress,
      voteCount: sql<number>`count(*)::int`,
    })
    .from(votes)
    .groupBy(votes.voterAddress)
    .orderBy(sql`count(*) desc`)
    .limit(limit)
    .offset(offset);

  let delegateCount = 0;
  let activityCount = 0;

  for (const v of topVoters) {
    // Upsert delegate row
    await db
      .insert(delegates)
      .values({ address: v.address })
      .onConflictDoNothing({ target: delegates.address });

    const [delegate] = await db
      .select()
      .from(delegates)
      .where(eq(delegates.address, v.address))
      .limit(1);
    if (!delegate) continue;

    // Aggregate cross-DAO totals (avg response time in hours from proposal start to vote)
    const totalsRows = await db.execute(sql`
      SELECT
        avg(extract(epoch from v.created_at - p.start_timestamp) / 3600) AS avg_response_hours
      FROM votes v
      JOIN proposals p ON p.id = v.proposal_id
      WHERE v.voter_address = ${v.address}
    `);
    const t = (totalsRows as unknown as Array<{ avg_response_hours: number | null }>)[0];

    // Aggregate per-DAO activity
    const perDao = await db
      .select({
        daoId: votes.daoId,
        votesCast: sql<number>`count(distinct ${votes.proposalId})::int`,
        votingPower: sql<number>`max(${votes.votingPower}::numeric)`,
      })
      .from(votes)
      .where(eq(votes.voterAddress, v.address))
      .groupBy(votes.daoId);

    let activeDaos = 0;
    for (const d of perDao) {
      const [totalProps] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(proposals)
        .where(eq(proposals.daoId, d.daoId));
      const available = totalProps?.c ?? 0;
      const participation = available > 0 ? d.votesCast / available : 0;

      await db
        .insert(delegateDaoActivity)
        .values({
          delegateId: delegate.id,
          daoId: d.daoId,
          votingPower: String(d.votingPower ?? 0),
          votesCast: d.votesCast,
          proposalsAvailable: available,
          participationRate: participation.toFixed(4),
        })
        .onConflictDoUpdate({
          target: [delegateDaoActivity.delegateId, delegateDaoActivity.daoId],
          set: {
            votingPower: String(d.votingPower ?? 0),
            votesCast: d.votesCast,
            proposalsAvailable: available,
            participationRate: participation.toFixed(4),
            updatedAt: new Date(),
          },
        });
      activityCount++;
      activeDaos++;
    }

    // Compute overall participation as weighted average
    const overall = await db
      .select({ avg: sql<number>`avg(participation_rate::numeric)` })
      .from(delegateDaoActivity)
      .where(eq(delegateDaoActivity.delegateId, delegate.id));

    await db
      .update(delegates)
      .set({
        totalDaosActive: activeDaos,
        totalVotesCast: v.voteCount,
        participationRate: overall[0]?.avg ? String(overall[0].avg) : '0',
        avgResponseTimeHours: t?.avg_response_hours
          ? String(Math.max(0, Number(t.avg_response_hours)))
          : null,
        updatedAt: new Date(),
      })
      .where(eq(delegates.id, delegate.id));
    delegateCount++;
  }

  // `done` signals to the workflow runner that we've reached the tail of the
  // top-voters list (this chunk returned fewer rows than requested).
  return {
    delegates: delegateCount,
    activities: activityCount,
    done: topVoters.length < limit,
  };
}

/**
 * Resolve ENS for delegates that don't have one yet.
 * Uses a public ENS subgraph-like endpoint to avoid RPC cost.
 */
export async function resolveDelegateEns(limit = 100): Promise<number> {
  const needs = await db
    .select()
    .from(delegates)
    .where(sql`${delegates.ensName} IS NULL`)
    .limit(limit);

  let resolved = 0;
  for (const d of needs) {
    try {
      const r = await fetch(`https://api.ensideas.com/ens/resolve/${d.address}`, {
        headers: { 'user-agent': 'daosentinel/0.1' },
      });
      if (!r.ok) continue;
      const data = (await r.json()) as { name?: string; avatar?: string };
      if (!data?.name) continue;
      await db
        .update(delegates)
        .set({ ensName: data.name, name: data.name, avatarUrl: data.avatar ?? null })
        .where(eq(delegates.id, d.id));
      resolved++;
    } catch {
      // ignore single-address failures
    }
  }
  return resolved;
}

/**
 * Pull Karma reputation scores (karmahq.xyz) for delegates that don't have
 * one yet. Sequential fetches with graceful skip — same pattern as ENS.
 *
 * Karma endpoint shape (subject to change):
 *   GET https://api.karmahq.xyz/api/forum-user/{daoSlug}/delegate/{address}
 *   → { score, rank, profileUrl, ... } (only `score` is required)
 *
 * Because Karma scopes scores per DAO, we pick the delegate's most-active DAO
 * as the lookup context.
 */
export async function resolveDelegateKarma(limit = 50): Promise<number> {
  // Pick delegates that have no karma yet AND have at least one DAO activity
  const candidates = await db.execute(sql`
    SELECT d.id, d.address, da.dao_id, daos.slug AS dao_slug
    FROM delegates d
    JOIN delegate_dao_activity da ON da.delegate_id = d.id
    JOIN daos ON daos.id = da.dao_id
    WHERE d.karma_score IS NULL
    ORDER BY da.voting_power::numeric DESC NULLS LAST
    LIMIT ${limit}
  `);

  const rows = candidates as unknown as Array<{
    id: string;
    address: string;
    dao_slug: string;
  }>;

  let resolved = 0;
  for (const row of rows) {
    try {
      const url = `https://api.karmahq.xyz/api/forum-user/${row.dao_slug}/delegate/${row.address.toLowerCase()}`;
      const r = await fetch(url, {
        headers: { 'user-agent': 'daosentinel/0.1', accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) continue;
      const data = (await r.json()) as {
        score?: number;
        rank?: number;
        profileUrl?: string;
      };
      if (typeof data?.score !== 'number') continue;
      await db
        .update(delegates)
        .set({
          karmaScore: data.score.toFixed(2),
          karmaRank: typeof data.rank === 'number' ? data.rank : null,
          karmaUrl: data.profileUrl ?? `https://karmahq.xyz/dao/${row.dao_slug}/delegators/${row.address.toLowerCase()}`,
          karmaUpdatedAt: new Date(),
        })
        .where(eq(delegates.id, row.id));
      resolved++;
    } catch {
      // single-delegate failure shouldn't abort the batch
    }
  }
  return resolved;
}

export { and, desc };
