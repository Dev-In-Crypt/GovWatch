import { recomputeAllDaoScores } from '../services/democracy-score';

export async function runScoreJob() {
  const t = Date.now();
  const r = await recomputeAllDaoScores();
  console.log(`[compute-scores] updated=${r.updated} alerts=${r.alerts} (${Date.now() - t}ms)`);
  return r;
}

if (require.main === module) {
  runScoreJob()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
