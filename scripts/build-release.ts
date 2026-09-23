/**
 * Builds one release into the deployable tree `public/`: the entry files from `src/**`
 * (minified by `scripts/minify-release.ts`), then the published documentation, the licence,
 * the asset-root index and the response headers, with the cache policy of the release that
 * was written.
 *
 * `DPK_CHANNEL` selects the release (`scripts/release.ts`): `stable` writes
 * `public/dev-process-kit@<package version>/`, `debug` writes `public/dev-process-kit@debug/`.
 * Both channels share the tree, so it can hold a release of each, and `wrangler deploy`
 * publishes whatever it holds.
 *
 * The release is resolved from the channel and *not* from `DPK_ASSETS_DIR`: that variable
 * exists so `pnpm dev` can build into `public-dev/`, and a published build must not be able
 * to change what a running dev session serves (`vite.config.ts` resolves its tree the same
 * way, so setting the variable would send this build into the dev tree and the assembly of
 * `public/` would fail loudly rather than silently produce the wrong tree).
 *
 * `scripts/verify-committed.ts` runs this command for every channel the committed tree holds,
 * to prove that the tracked artifacts are what the sources produce.
 *
 * Only user-facing documentation ships. Developer documentation (guidelines, ADRs, scratch)
 * lives under `docs/guidelines`, `docs/adr` and `docs/tmp` and is deliberately excluded —
 * `scripts/verify-release.ts` fails when any of it leaks into the published tree.
 */
import { rm } from 'node:fs/promises';

import { assembleAssets } from './assemble-assets.ts';
import { minifyRelease } from './minify-release.ts';
import { cacheControl, channelFromEnv, publishTree, releaseCachePolicy, releaseSegment } from './release.ts';
import { verifyRelease } from './verify-release.ts';

const tree = publishTree(channelFromEnv());
const releaseRoot = `${import.meta.dirname}/../${tree.assetsDir}/${releaseSegment(tree.releaseId)}`;
const minified = await minifyRelease(releaseRoot);
await assembleAssets(tree);

// The build owns the release contract, so it verifies what it wrote: nothing that fails
// `verify-release.ts` reaches a deploy. `VERSION` is what marks a release complete (and gets
// it a cache rule), so a tree that failed is left unmarked rather than marked and wrong.
const failures = await verifyRelease(tree);
if (failures.length > 0) {
  await rm(`${releaseRoot}/VERSION`, { force: true });
  console.error(`✗ ${tree.assetsDir}/${releaseSegment(tree.releaseId)}/ failed verification (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const policy = cacheControl(releaseCachePolicy(tree.releaseId));
console.log(
  `✔ ${tree.assetsDir}/${releaseSegment(tree.releaseId)}/ ← entries + docs + VERSION ` +
    `(${policy}; ${minified.length} minified files)`,
);
