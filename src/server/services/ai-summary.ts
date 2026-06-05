import { eq, isNull, and, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { proposals, daos } from '../db/schema';
import { SUMMARY_BODY_TRUNCATE } from '@/lib/constants';
import { chat, embed } from '../ai/openrouter';

export const SUMMARY_SYSTEM_PROMPT = `You are DAO Sentinel AI, a governance analyst that explains DAO proposals to regular people.

Given a DAO proposal, return STRICT JSON with exactly these keys:
{
  "summary": "3-5 sentence plain-English summary of what this proposal does",
  "impact": "1-2 sentence statement on what changes if it passes, who benefits, who loses",
  "risk_level": "low" | "medium" | "high"
}

Risk levels:
- low: routine parameter changes, small grants, operational decisions
- medium: significant treasury allocations (>$100K), protocol upgrades, strategy changes
- high: changes affecting token economics, large treasury movements (>$1M), constitutional amendments, emergency proposals

Rules:
- Never use DAO-specific jargon without explaining it.
- Always mention specific dollar amounts if the treasury is involved.
- If the proposal pays someone, name the amount and purpose.
- If impact cannot be determined, say so honestly inside "impact".
- Keep the combined summary+impact under 200 words.
- Output ONLY valid JSON, no prose, no markdown.`;

export interface SummaryOutput {
  summary: string;
  impact: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export async function generateSummaryForProposal(
  proposalId: string,
): Promise<SummaryOutput | null> {
  const [row] = await db
    .select({ proposal: proposals, dao: daos })
    .from(proposals)
    .innerJoin(daos, eq(daos.id, proposals.daoId))
    .where(eq(proposals.id, proposalId))
    .limit(1);

  if (!row) return null;
  if (row.proposal.aiSummary) return null; // already done

  const truncatedBody = (row.proposal.body ?? '').slice(0, SUMMARY_BODY_TRUNCATE);

  // Generate summary and embedding in parallel — they hit independent endpoints.
  const embedInput = `${row.proposal.title}\n\n${truncatedBody}`;
  const [response, embedding] = await Promise.all([
    chat({
      maxTokens: 600,
      responseFormat: 'json',
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `DAO: ${row.dao.name}
Title: ${row.proposal.title}
Choices: ${JSON.stringify(row.proposal.choices)}
Current votes: ${row.proposal.votesCount ?? 0}

Proposal body:
${truncatedBody}`,
        },
      ],
    }),
    embed(embedInput),
  ]);
  if (!response) return null;

  const out = parseSummaryJson(response.text);
  if (!out) return null;

  await db
    .update(proposals)
    .set({
      aiSummary: out.summary,
      aiImpact: out.impact,
      aiRiskLevel: out.riskLevel,
      summaryGeneratedAt: new Date(),
      ...(embedding ? { embedding } : {}),
    })
    .where(eq(proposals.id, proposalId));

  return out;
}

/**
 * Backfill embeddings for proposals that already have a summary but no
 * embedding (these were summarised before the embedding feature shipped).
 * Returns the number of proposals successfully embedded.
 */
export async function backfillEmbeddings(limit = 50): Promise<number> {
  const targets = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      body: proposals.body,
    })
    .from(proposals)
    .where(and(isNull(proposals.embedding)))
    .limit(limit);

  let done = 0;
  for (const p of targets) {
    const text = `${p.title}\n\n${(p.body ?? '').slice(0, SUMMARY_BODY_TRUNCATE)}`;
    const vec = await embed(text);
    if (!vec) continue;
    await db
      .update(proposals)
      .set({ embedding: vec })
      .where(eq(proposals.id, p.id));
    done++;
  }
  return done;
}

export function parseSummaryJson(text: string): SummaryOutput | null {
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  const p = parsed as Partial<SummaryOutput & { risk_level?: string }>;
  const risk = (p.riskLevel ?? p.risk_level ?? 'medium').toString().toLowerCase();
  const riskLevel = (['low', 'medium', 'high'].includes(risk) ? risk : 'medium') as
    | 'low'
    | 'medium'
    | 'high';
  if (!p.summary || !p.impact) return null;
  return { summary: String(p.summary), impact: String(p.impact), riskLevel };
}

export async function generatePendingSummaries(limit = 50): Promise<{
  summarised: number;
  backfilledEmbeddings: number;
}> {
  const pending = await db
    .select({ id: proposals.id })
    .from(proposals)
    .where(and(isNull(proposals.aiSummary)))
    .limit(limit);
  let summarised = 0;
  for (const p of pending) {
    const r = await generateSummaryForProposal(p.id);
    if (r) summarised++;
  }
  // After fresh summaries, backfill embeddings for any proposal that still
  // lacks one (these are typically older rows summarised before embeddings
  // were wired up). Caps at the same limit to keep job time bounded.
  const backfilledEmbeddings = await backfillEmbeddings(limit);
  return { summarised, backfilledEmbeddings };
}
