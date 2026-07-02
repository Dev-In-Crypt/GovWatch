import { z } from 'zod';
import { desc, eq, and, isNotNull, sql } from 'drizzle-orm';
import { router, publicProcedure } from '../trpc';
import { proposals, daos, votes } from '../../db/schema';
import { cosineSimilarity } from '../../ai/openrouter';

export const proposalsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          state: z.enum(['active', 'closed', 'pending']).optional(),
          daoSlug: z.string().optional(),
          riskLevel: z.enum(['low', 'medium', 'high']).optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const whereParts = [] as ReturnType<typeof eq>[];
      if (input.state) whereParts.push(eq(proposals.state, input.state));
      if (input.riskLevel) whereParts.push(eq(proposals.aiRiskLevel, input.riskLevel));
      if (input.daoSlug) {
        const [dao] = await ctx.db.select().from(daos).where(eq(daos.slug, input.daoSlug)).limit(1);
        if (!dao) return [];
        whereParts.push(eq(proposals.daoId, dao.id));
      }

      const rows = await ctx.db
        .select({
          proposal: proposals,
          dao: daos,
        })
        .from(proposals)
        .innerJoin(daos, eq(daos.id, proposals.daoId))
        .where(whereParts.length ? and(...whereParts) : undefined)
        .orderBy(desc(proposals.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  byId: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select({ proposal: proposals, dao: daos })
      .from(proposals)
      .innerJoin(daos, eq(daos.id, proposals.daoId))
      .where(eq(proposals.id, input.id))
      .limit(1);

    if (!row) return null;

    const proposalVotes = await ctx.db
      .select()
      .from(votes)
      .where(eq(votes.proposalId, row.proposal.id))
      .orderBy(desc(votes.votingPower))
      .limit(200);

    const whaleVotes = proposalVotes.filter((v) => v.isWhale);

    return { ...row, votes: proposalVotes, whaleVotes };
  }),

  trending: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }).optional().default({}))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({ proposal: proposals, dao: daos })
        .from(proposals)
        .innerJoin(daos, eq(daos.id, proposals.daoId))
        .where(eq(proposals.state, 'active'))
        .orderBy(desc(proposals.votesCount))
        .limit(input.limit);
    }),

  similar: publicProcedure
    .input(z.object({ id: z.string().uuid(), limit: z.number().min(1).max(10).default(3) }))
    .query(async ({ ctx, input }) => {
      // Load the target proposal's embedding
      const [target] = await ctx.db
        .select({ id: proposals.id, embedding: proposals.embedding })
        .from(proposals)
        .where(eq(proposals.id, input.id))
        .limit(1);
      if (!target?.embedding || target.embedding.length === 0) return [];

      const candidates = await loadSimilarityCandidates(ctx.db);

      const scored = candidates
        .filter((c) => c.id !== input.id)
        .map((c) => ({
          id: c.id,
          title: c.title,
          state: c.state,
          quorumReached: c.quorumReached,
          votesCount: c.votesCount,
          endTimestamp: c.endTimestamp,
          daoSlug: c.daoSlug,
          daoName: c.daoName,
          similarity: cosineSimilarity(target.embedding, c.embedding),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, input.limit);

      return scored;
    }),

  recentlyClosed: publicProcedure
    .input(z.object({ days: z.number().min(1).max(30).default(7) }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 86400_000);
      return ctx.db
        .select({ proposal: proposals, dao: daos })
        .from(proposals)
        .innerJoin(daos, eq(daos.id, proposals.daoId))
        .where(
          and(eq(proposals.state, 'closed'), sql`${proposals.endTimestamp} >= ${since.toISOString()}`),
        )
        .orderBy(desc(proposals.endTimestamp))
        .limit(50);
    }),
});

// ---------------------------------------------------------------------------
// Similarity candidates cache.
//
// The candidate set (≤500 rows × 1536-float embeddings ≈ 3 MB) was re-fetched
// from Postgres on EVERY proposal-page view. It only changes when the
// summaries cron embeds new proposals (*/15), so a short module-level TTL
// cache removes the heavy query from the hot path. Per-warm-instance, which
// is fine — staleness just means a brand-new proposal takes up to 10 minutes
// to appear in "similar" lists. Not unstable_cache: the payload exceeds
// Vercel Data Cache's 2 MB item limit.
// ---------------------------------------------------------------------------
interface SimilarityCandidate {
  id: string;
  title: string;
  state: string;
  quorumReached: boolean | null;
  votesCount: number | null;
  endTimestamp: Date;
  embedding: number[] | null;
  daoSlug: string;
  daoName: string;
}

const CANDIDATE_TTL_MS = 10 * 60 * 1000;
let candidateCache: { at: number; rows: SimilarityCandidate[] } | null = null;

async function loadSimilarityCandidates(
  db: typeof import('../../db').db,
): Promise<SimilarityCandidate[]> {
  if (candidateCache && Date.now() - candidateCache.at < CANDIDATE_TTL_MS) {
    return candidateCache.rows;
  }
  const rows = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      state: proposals.state,
      quorumReached: proposals.quorumReached,
      votesCount: proposals.votesCount,
      endTimestamp: proposals.endTimestamp,
      embedding: proposals.embedding,
      daoSlug: daos.slug,
      daoName: daos.name,
    })
    .from(proposals)
    .innerJoin(daos, eq(daos.id, proposals.daoId))
    .where(isNotNull(proposals.embedding))
    .limit(500);
  candidateCache = { at: Date.now(), rows };
  return rows;
}
