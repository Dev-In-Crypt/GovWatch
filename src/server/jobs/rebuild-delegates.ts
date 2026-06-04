import { rebuildDelegateProfiles, resolveDelegateEns } from '../services/delegate-tracker';

/**
 * Process one chunk of top voters into delegate profiles. The cron workflow
 * pages through with `offset = 0, 300, 600, …` until `done: true`.
 */
export async function runRebuildDelegatesJob(opts: { limit?: number; offset?: number } = {}) {
  const t = Date.now();
  const r = await rebuildDelegateProfiles(opts);

  // Only run ENS resolution on the final chunk to avoid blowing the function
  // timeout on every page. The endpoint is best-effort; if it fails we just
  // keep the address as-is.
  let resolved = 0;
  if (r.done) {
    resolved = await resolveDelegateEns(100);
  }

  console.log(
    `[rebuild-delegates] offset=${opts.offset ?? 0} limit=${opts.limit ?? 300} delegates=${r.delegates} activities=${r.activities} done=${r.done} ens=${resolved} (${Date.now() - t}ms)`,
  );
  return { ...r, ensResolved: resolved };
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
