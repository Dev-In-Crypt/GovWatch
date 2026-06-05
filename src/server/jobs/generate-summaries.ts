import { generatePendingSummaries } from '../services/ai-summary';

export async function runSummaryJob() {
  const t = Date.now();
  const r = await generatePendingSummaries(50);
  console.log(
    `[generate-summaries] summarised=${r.summarised} backfilledEmbeddings=${r.backfilledEmbeddings} (${Date.now() - t}ms)`,
  );
  return r;
}

if (require.main === module) {
  runSummaryJob()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
