# DAO Sentinel

> The public governance watchdog for DAOs. Every proposal explained in plain English. Every whale vote exposed. Every manipulation detected.

A **free public good** — no paywalls, no paid tiers, no data resale. MIT-licensed, forkable, self-hostable. Live at [daosentinel.xyz](https://www.daosentinel.xyz).

## Quick start

```bash
# 1. install
npm install --legacy-peer-deps

# 2. boot Postgres
docker compose up -d

# 3. configure secrets
cp .env.example .env
# fill in OPENROUTER_API_KEY, RESEND_API_KEY, NEXTAUTH_SECRET (any random string), CRON_SECRET…

# 4. apply schema + seed DAOs
npm run db:push
npm run db:seed

# 5. first sync (no cron needed for dev)
tsx src/server/jobs/sync-proposals.ts
tsx src/server/jobs/sync-votes.ts
tsx src/server/jobs/generate-summaries.ts
tsx src/server/jobs/compute-scores.ts

# 6. run
npm run dev   # http://localhost:3000
```

## Architecture

- **Frontend & API**: Next.js 15 App Router, tRPC v11, Tailwind, shadcn-style UI primitives.
- **DB**: PostgreSQL via Drizzle ORM. Schema in [src/server/db/schema.ts](src/server/db/schema.ts).
- **Data pipeline**: Snapshot GraphQL (off-chain) + Tally GraphQL (on-chain Governors) → upsert into proposals/votes → whale & swing detection → alerts. Treasury from DeFiLlama, token prices from CoinGecko.
- **AI**: OpenRouter with `google/gemini-2.5-flash` (configurable via `OPENROUTER_MODEL`) for proposal summaries and the weekly digest, plus `text-embedding-3-small` embeddings for similar-proposal search. OpenAI-compatible API — swap models without code changes.
- **Cron**: GitHub Actions ([.github/workflows/cron.yml](.github/workflows/cron.yml)) hits `/api/cron/*` on 5/15-minute, 6-hourly, daily, and weekly schedules, with paginated walkers for the long jobs.
- **Auth**: NextAuth v5 magic-link via Resend.
- **Notifications**: Email (Resend) and per-user Discord webhooks for whale/swing/quorum alerts; real-time SSE feed via Postgres LISTEN/NOTIFY. A Telegram account-linking flow is built but disabled until a bot token is provisioned.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:push` | Push schema to DB (dev) |
| `npm run db:seed` | Seed the tracked DAO list |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests |

## Cron endpoints

| Path | Schedule |
|---|---|
| `/api/cron/sync-proposals` | `*/5 * * * *` |
| `/api/cron/sync-votes` | `*/5 * * * *` (paginated) |
| `/api/cron/sync-tally` | `*/5 * * * *` (paginated; no-op without `TALLY_API_KEY`) |
| `/api/cron/generate-summaries` | `*/15 * * * *` |
| `/api/cron/compute-scores` | `0 2 * * *` (daily 02:00 UTC) |
| `/api/cron/sync-treasuries` | `0 3 * * *` (daily 03:00 UTC) |
| `/api/cron/rebuild-delegates` | `0 4 * * *` (daily 04:00 UTC, paginated) |
| `/api/cron/sync-prices` | `0 */6 * * *` |
| `/api/cron/send-digest` | `0 8 * * 1` (Monday 08:00 UTC) |

Every endpoint requires `Authorization: Bearer $CRON_SECRET` and fails closed (503) if the secret is not configured.

## Key constants

See [src/lib/constants.ts](src/lib/constants.ts):

- `WHALE_VP_PCT_THRESHOLD = 5` — vote share that flags a whale.
- `LAST_MINUTE_WINDOW_PCT = 0.1` — final 10% of voting window.
- `SCORE_WEIGHTS` — participation 25% · power distribution 25% · proposal diversity 15% · delegate accountability 15% · manipulation resistance 20%.

## License

MIT.
