import { syncAllActiveVotes, syncRecentlyClosedVotes } from '../services/snapshot-sync';
import { processNewWhaleVotes } from '../services/whale-detector';

/**
 * Process one chunk of active-proposal vote sync. The cron workflow walks
 * pages of `limit` proposals (default 5) until `done: true`.
 *
 * - `syncRecentlyClosedVotes()` runs only on the *first* page (offset=0),
 *   since the closed-proposal set is global (not per-chunk) and small.
 * - Whale detector also runs only on page 0 for the same reason — it scans
 *   the last 24h of votes globally.
 */
export async function runVoteSyncJob(opts: { offset?: number; limit?: number } = {}) {
  const started = Date.now();
  const offset = opts.offset ?? 0;
  const active = await syncAllActiveVotes(opts);

  let closedProposals = 0;
  let closedVotes = 0;
  let alerts = 0;

  if (offset === 0) {
    const closed = await syncRecentlyClosedVotes();
    closedProposals = closed.proposals;
    closedVotes = closed.votes;
    alerts = await processNewWhaleVotes();
  }

  console.log(
    `[sync-votes] offset=${offset} limit=${active.limit} active=${active.proposals}/${active.votes} closed=${closedProposals}/${closedVotes} alerts=${alerts} done=${active.done} (${Date.now() - started}ms)`,
  );
  return {
    active,
    closed: { proposals: closedProposals, votes: closedVotes },
    alerts,
    done: active.done,
  };
}

if (require.main === module) {
  const offset = Number(process.argv[2] ?? 0);
  const limit = Number(process.argv[3] ?? 5);
  runVoteSyncJob({ offset, limit })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
