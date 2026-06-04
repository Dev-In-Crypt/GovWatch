import { syncAllActiveVotes, syncRecentlyClosedVotes } from '../services/snapshot-sync';
import { processNewWhaleVotes } from '../services/whale-detector';

export async function runVoteSyncJob() {
  const started = Date.now();
  const active = await syncAllActiveVotes();
  const closed = await syncRecentlyClosedVotes();
  // After votes are persisted, scan for unprocessed whales / swings.
  const alerts = await processNewWhaleVotes();
  console.log(
    `[sync-votes] active=${active.proposals}/${active.votes} closed=${closed.proposals}/${closed.votes} alerts=${alerts} (${Date.now() - started}ms)`,
  );
  return { active, closed, alerts };
}

if (require.main === module) {
  runVoteSyncJob()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
