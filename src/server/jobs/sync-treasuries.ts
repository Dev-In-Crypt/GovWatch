import { syncTreasuries } from '../services/treasury-sync';

export async function runTreasurySyncJob() {
  const t = Date.now();
  const r = await syncTreasuries();
  console.log(`[sync-treasuries] ${JSON.stringify(r)} (${Date.now() - t}ms)`);
  return r;
}

if (require.main === module) {
  runTreasurySyncJob()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
