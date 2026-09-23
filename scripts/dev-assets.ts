/**
 * Assembles the development Workers Static Assets tree in `public-dev/`, which is
 * what `wrangler dev` serves.
 *
 * The same assembly produces the deployable trees (`scripts/build-release.ts`); the
 * difference is the tree `scripts/release.ts` resolves: the dev tree keeps the stable
 * release id (the samples pin it) but gets neither cache rules nor channel addressing.
 * Two directories are needed because `vite build --watch` rewrites the versioned URL
 * while a dev session runs, so the deployable tree must be a different directory.
 */
import { assembleAssets } from './assemble-assets.ts';
import { devTree } from './release.ts';

const tree = devTree();
await assembleAssets(tree);

console.log(`✔ ${tree.assetsDir}/ ← entries + published docs + CORS headers (no cache rules)`);
