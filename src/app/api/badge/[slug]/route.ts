import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { daos } from '@/server/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 min — badge is hotlinked

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e'; // green
  if (score >= 40) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function badgeSvg(label: string, value: string, color: string): string {
  // Shields.io-style flat-square badge, no external deps.
  const labelW = Math.max(80, label.length * 7 + 14);
  const valueW = Math.max(70, value.length * 9 + 14);
  const total = labelW + valueW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="28" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}">
  <title>${escapeXml(label)}: ${escapeXml(value)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="28" rx="4" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="28" fill="#1f2937"/>
    <rect x="${labelW}" width="${valueW}" height="28" fill="${color}"/>
    <rect width="${total}" height="28" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="12" font-weight="600">
    <text x="${labelW / 2}" y="19">${escapeXml(label)}</text>
    <text x="${labelW + valueW / 2}" y="19">${escapeXml(value)}</text>
  </g>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const [dao] = await db
    .select({ name: daos.name, score: daos.democracyScore })
    .from(daos)
    .where(eq(daos.slug, slug))
    .limit(1);

  const score = dao ? Number(dao.score ?? 0) : 0;
  const svg = dao
    ? badgeSvg('Democracy Score', `${score.toFixed(0)}/100`, scoreColor(score))
    : badgeSvg('Democracy Score', 'unknown', '#6b7280');

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
      'access-control-allow-origin': '*',
    },
  });
}
