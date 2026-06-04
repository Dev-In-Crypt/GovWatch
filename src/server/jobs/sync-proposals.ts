import { syncProposals } from '../services/snapshot-sync';

export async function runProposalSyncJob() {
  const started = Date.now();
  const result = await syncProposals();
  console.log(`[sync-proposals] done in ${Date.now() - started}ms`, result);
  return result;
}

if (require.main === module) {
  runProposalSyncJob()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
