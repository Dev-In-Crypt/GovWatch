import { rebuildDelegateProfiles, resolveDelegateEns, resolveDelegateKarma } from '../services/delegate-tracker';

/**
 * Process one chunk of top voters into delegate profiles. The cron workflow
 * pages through with `offset = 0, 300, 600, …` until `done: true`.
 */
export async function runRebuildDelegatesJob(opts: { limit?: number; offset?: number } = {}) {
  const t = Date.now();
  const r = await rebuildDelegateProfiles(opts);

  // Only run ENS + Karma resolution on the final chunk to avoid blowing the
  // function timeout on every page. Both endpoints are best-effort; failures
  // leave the row untouched and we retry next run.
  let ensResolved = 0;
  let karmaResolved = 0;
  if (r.done) {
    ensResolved = await resolveDelegateEns(100);
    karmaResolved = await resolveDelegateKarma(50);
  }

  console.log(
    `[rebuild-delegates] offset=${opts.offset ?? 0} limit=${opts.limit ?? 300} delegates=${r.delegates} activities=${r.activities} done=${r.done} ens=${ensResolved} karma=${karmaResolved} (${Date.now() - t}ms)`,
  );
  return { ...r, ensResolved, karmaResolved };
}

if (require.main === module) {
  const offset = Number(process.argv[2] ?? 0);
  const limit = Number(process.argv[3] ?? 300);
  runRebuildDelegatesJob({ offset, limit })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
