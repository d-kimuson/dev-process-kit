/**
 * Publishes the deployable tree as the debug channel.
 *
 * `wrangler deploy` replaces the whole asset set of the Worker with the tree it is
 * given, so a deploy is only safe when the tree holds exactly what should be live
 * afterwards. This command therefore refuses a tree that also holds a versioned
 * release: publishing a version is a separate flow (the open half of the
 * distribution ADR), and the debug channel must neither publish one by accident nor
 * drop one that is already published.
 *
 * `pnpm deploy:debug` builds the debug release, verifies it and then runs this: the whole
 * publish of the debug channel is one command, so what it does is visible in `package.json`.
 */
import { execFileSync } from 'node:child_process';

import { completeReleasesIn } from './assemble-assets.ts';
import { buildRevision, publishTree, releaseSegment } from './release.ts';

const root = `${import.meta.dirname}/..`;
const tree = publishTree('debug');
const releases = await completeReleasesIn(`${root}/${tree.assetsDir}`);
const versions = releases.filter((release) => release !== tree.releaseId);

if (versions.length > 0) {
  console.error(`✗ ${tree.assetsDir}/ also holds ${versions.map(releaseSegment).join(', ')}`);
  console.error('  This command publishes the debug release only, so it will not deploy the tree as it is.');
  console.error('  Build the tree you mean to publish (`rm -rf public` first for a debug-only tree), or run');
  console.error('  `wrangler deploy` yourself if publishing those versions together is intended.');
  process.exit(1);
}

if (!releases.includes(tree.releaseId)) {
  console.error(`✗ ${tree.assetsDir}/${releaseSegment(tree.releaseId)}/ is not a complete release`);
  console.error('  Build it first: DPK_CHANNEL=debug pnpm build');
  process.exit(1);
}

// The Worker (`wrangler.jsonc`: account and custom domain) and the release
// (`scripts/release.ts`: origin and release id) are the two halves of "where this is
// published". The build's own verification proves the tree; the deployed pages are checked
// with `pnpm qa:browser <origin>/sample`.
//
// The built files themselves carry no build identity (they are committed, and a reproducible
// build is what makes that check meaningful), so the commit goes where a deployment records
// it: the version message and tag of this Worker.
const revision = buildRevision() ?? 'unknown';
execFileSync('wrangler', ['deploy', '--tag', 'debug', '--message', `debug build at ${revision}`], {
  stdio: 'inherit',
  cwd: root,
});
