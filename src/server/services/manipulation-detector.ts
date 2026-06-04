import { eq, and, sql, gt } from 'drizzle-orm';
import { db } from '../db';
import { alerts, votes, proposals, daos } from '../db/schema';
import { COORDINATED_VOTING_MIN } from '@/lib/constants';
import { publishAlert } from './notifier';

/**
 * Detect coordinated voting: ≥ N voters with the *same* choice and a similar
 * voting-power footprint that joined a proposal within a tight time window.
 *
 * This is a heuristic: shared-funder lookups require RPC/indexer data that
 * isn't available in MVP. The pattern below catches the most common variant —
 * a burst of identical-choice votes inside a short window with comparable VP.
 */
export async function detectCoordinatedVoting(): Promise<number> {
  const since = new Date(Date.now() - 48 * 3600 * 1000);
  const candidates = await db.execute(sql`
    SELECT
      v.proposal_id,
      v.choice,
      date_trunc('hour', v.created_at) AS bucket,
      count(*)::int AS voters,
      array_agg(v.voter_address) AS voters_list
    FROM votes v
    WHERE v.created_at >= ${since.toISOString()}
    GROUP BY 1, 2, 3
    HAVING count(*) >= ${COORDINATED_VOTING_MIN}
       AND stddev(v.voting_power::numeric) / NULLIF(avg(v.voting_power::numeric), 0) < 0.25
    LIMIT 100;
  `);

  let created = 0;
  for (const row of candidates as unknown as Array<{
    proposal_id: string;
    choice: number;
    voters: number;
    voters_list: string[];
  }>) {
    const [p] = await db
      .select({ proposal: proposals, dao: daos })
      .from(proposals)
      .innerJoin(daos, eq(daos.id, proposals.daoId))
      .where(eq(proposals.id, row.proposal_id))
      .limit(1);
    if (!p) continue;

    const [dup] = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.proposalId, row.proposal_id),
          eq(alerts.type, 'coordinated_voting'),
        ),
      )
      .limit(1);
    if (dup) continue;

    const [a] = await db
      .insert(alerts)
      .values({
        daoId: p.dao.id,
        proposalId: p.proposal.id,
        type: 'coordinated_voting',
        severity: 'warning',
        title: `🤝 Coordinated voting suspected on ${p.dao.name}`,
        description: `${row.voters} addresses voted the same way with very similar voting power on "${p.proposal.title}". Pattern resembles coordinated voting.`,
        data: { voters: row.voters_list, choice: row.choice },
      })
      .returning();
    created++;
    if (a) await publishAlert(a.id).catch(() => undefined);
  }
  return created;
}

export { gt };
