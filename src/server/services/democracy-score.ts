import { desc, eq, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { daos, proposals, votes, scoreHistory, alerts, delegates, delegateDaoActivity } from '../db/schema';
import { SCORE_WEIGHTS, SCORE_DROP_ALERT } from '@/lib/constants';
import { publishAlert } from './notifier';

export interface ScoreBreakdown {
  participation: number;
  powerDistribution: number;
  proposalDiversity: number;
  delegateAccountability: number;
  manipulationResistance: number;
}

export function calculateGini(values: number[]): number {
  if (values.length === 0) return 0;
  const arr = values.map((v) => Math.max(v, 0)).sort((a, b) => a - b);
  const n = arr.length;
  const sum = arr.reduce((s, v) => s + v, 0);
  if (sum === 0) return 0;
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * arr[i];
  return (2 * cum) / (n * sum) - (n + 1) / n;
}

export function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  totalProposals: number;
  totalVoters: number;
  avgParticipationRate: number; // 0–1
}

export async function computeScoreForDao(daoId: string): Promise<ScoreResult | null> {
  const [dao] = await db.select().from(daos).where(eq(daos.id, daoId)).limit(1);
  if (!dao) return null;

  const recentProps = await db
    .select()
    .from(proposals)
    .where(eq(proposals.daoId, daoId))
    .orderBy(desc(proposals.createdAt))
    .limit(20);

  // Real rollup counters across ALL proposals/votes for this DAO (these back
  // the "X proposals" and "voters" figures shown on /daos and the landing).
  const [propCountRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(proposals)
    .where(eq(proposals.daoId, daoId));
  const totalProposals = propCountRow?.n ?? 0;

  const [voterCountRow] = await db
    .select({ n: sql<number>`count(distinct ${votes.voterAddress})::int` })
    .from(votes)
    .where(eq(votes.daoId, daoId));
  // Distinct voters ever seen across the DAO — our best proxy for the active
  // electorate (we don't have on-chain holder counts without an RPC key).
  const electorate = voterCountRow?.n ?? 0;

  // 1. Participation: real turnout ratio — voters on each recent proposal vs
  // the DAO's known electorate. No artificial multiplier; a proposal can't
  // have more voters than the all-time distinct count, so the ratio is ≤ 1.
  const turnoutRates =
    electorate > 0
      ? recentProps.map((p) => Math.min((p.votesCount ?? 0) / electorate, 1))
      : [];
  const avgParticipationRate = round2(avg(turnoutRates)); // 0–1
  const participationScore = round(avgParticipationRate * 100);

  // 2. Power distribution: Gini across votes in recent proposals
  let powerScore = 50; // fallback if no votes data
  if (recentProps.length) {
    const propIds = recentProps.map((p) => p.id);
    const vps = await db
      .select({ vp: votes.votingPower })
      .from(votes)
      .where(inArray(votes.proposalId, propIds));
    if (vps.length) {
      const gini = calculateGini(vps.map((v) => Number(v.vp)));
      powerScore = Math.max(0, Math.min(100, (1 - gini) * 100));
    }
  }

  // 3. Proposal diversity: unique authors / 10 × 100
  const uniqueAuthors = new Set(recentProps.map((p) => p.author)).size;
  const proposalDiversityScore = Math.min((uniqueAuthors / 10) * 100, 100);

  // 4. Delegate accountability: top 20 delegates in this DAO — % with participation > 50%
  const topDelegates = await db
    .select()
    .from(delegateDaoActivity)
    .where(eq(delegateDaoActivity.daoId, daoId))
    .orderBy(desc(delegateDaoActivity.votingPower))
    .limit(20);
  const delegateScore =
    topDelegates.length === 0
      ? 50
      : (topDelegates.filter((d) => Number(d.participationRate ?? 0) > 0.5).length /
          topDelegates.length) *
        100;

  // 5. Manipulation resistance: % of recent proposals without swing or whale
  const total = recentProps.length || 1;
  const clean = recentProps.filter((p) => !p.hasLastMinuteSwing && !p.hasWhaleVote).length;
  const manipulationScore = (clean / total) * 100;

  const breakdown: ScoreBreakdown = {
    participation: round(participationScore),
    powerDistribution: round(powerScore),
    proposalDiversity: round(proposalDiversityScore),
    delegateAccountability: round(delegateScore),
    manipulationResistance: round(manipulationScore),
  };

  const score = round(
    breakdown.participation * SCORE_WEIGHTS.participation +
      breakdown.powerDistribution * SCORE_WEIGHTS.powerDistribution +
      breakdown.proposalDiversity * SCORE_WEIGHTS.proposalDiversity +
      breakdown.delegateAccountability * SCORE_WEIGHTS.delegateAccountability +
      breakdown.manipulationResistance * SCORE_WEIGHTS.manipulationResistance,
  );

  return { score, breakdown, totalProposals, totalVoters: electorate, avgParticipationRate };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// 4-dp rounding for the 0–1 participation fraction (numeric(5,4) column).
function round2(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export async function recomputeAllDaoScores(): Promise<{ updated: number; alerts: number }> {
  const all = await db.select().from(daos);
  let updated = 0;
  let alertCount = 0;
  for (const dao of all) {
    const result = await computeScoreForDao(dao.id);
    if (!result) continue;
    const prevScore = Number(dao.democracyScore ?? 0);

    await db
      .update(daos)
      .set({
        democracyScore: String(result.score),
        scoreBreakdown: result.breakdown as unknown as Record<string, number>,
        totalProposals: result.totalProposals,
        totalVoters: result.totalVoters,
        avgParticipationRate: String(result.avgParticipationRate),
        scoreUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(daos.id, dao.id));

    await db.insert(scoreHistory).values({
      daoId: dao.id,
      score: String(result.score),
      breakdown: result.breakdown as unknown as Record<string, number>,
    });

    if (prevScore > 0 && prevScore - result.score >= SCORE_DROP_ALERT) {
      const [a] = await db
        .insert(alerts)
        .values({
          daoId: dao.id,
          type: 'score_drop',
          severity: 'warning',
          title: `📉 ${dao.name} Democracy Score dropped ${(prevScore - result.score).toFixed(1)} points`,
          description: `Score went from ${prevScore.toFixed(1)} to ${result.score.toFixed(1)}.`,
          data: { prev: prevScore, current: result.score, breakdown: result.breakdown },
        })
        .returning();
      alertCount++;
      if (a) await publishAlert(a.id).catch(() => undefined);
    }

    updated++;
  }
  return { updated, alerts: alertCount };
}
