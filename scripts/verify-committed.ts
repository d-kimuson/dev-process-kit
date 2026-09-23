#!/usr/bin/env node
/**
 * Verifies that the committed deployable tree is what a build produces.
 *
 * `public/` is tracked, because the committed tree is what gets deployed: a published
 * release has to be reviewable, and "these files are not stale and nobody edited them
 * by hand" is only checkable against the sources. This command rebuilds every channel whose
 * release is already committed and fails when the build changes, adds or removes anything
 * under the tree — which is what a hand-edited file, a build from older sources, or a
 * publish that was never committed looks like.
 *
 * The build has to be reproducible for this to mean anything, which is why a built file
 * carries no build time and no commit (`scripts/assemble-assets.ts`); where a *deployment*
 * came from is recorded in the deploy message (`scripts/deploy-debug.ts`).
 *
 * Usage:
 *   node scripts/verify-committed.ts
 */
import { execFileSync } from 'node:child_process';

import pkg from '../package.json' with { type: 'json' };
import { DEBUG_RELEASE_ID, publishTree, releaseSegment, type ReleaseChannel } from './release.ts';

/** Repository root, resolved from this file's own location (`scripts/`). */
const root = `${import.meta.dirname}/..`;
const assetsDir = publishTree('stable').assetsDir;

/** Runs git and returns its non-empty output lines. */
const git = (...args: readonly string[]): string[] =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((line) => line !== '');

/**
 * The channels the *committed* tree holds, from the index rather than the working tree: a
 * release that is only on disk is exactly what this check is meant to report.
 */
const committed = new Set(git('ls-files', '--', assetsDir));
const channels: ReleaseChannel[] = [];
if (committed.has(`${assetsDir}/${releaseSegment(pkg.version)}/VERSION`)) channels.push('stable');
if (committed.has(`${assetsDir}/${releaseSegment(DEBUG_RELEASE_ID)}/VERSION`)) channels.push('debug');

if (channels.length === 0) {
  console.error(`✗ ${assetsDir}/ holds no committed release`);
  console.error('  Build one (`DPK_CHANNEL=debug pnpm build`) and commit it before this check means anything.');
  process.exit(1);
}

for (const channel of channels) {
  execFileSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DPK_CHANNEL: channel, DPK_ASSETS_DIR: undefined },
  });
}

const dirty = git('status', '--porcelain', '--', assetsDir);
if (dirty.length > 0) {
  console.error(`✗ ${assetsDir}/ is not what a build produces (${dirty.length} path(s) differ):`);
  for (const line of dirty.slice(0, 20)) console.error(`  ${line}`);
  if (dirty.length > 20) console.error(`  … and ${dirty.length - 20} more`);
  console.error('  Commit the build output, or revert the edit: a published release is never changed in place.');
  process.exit(1);
}

console.log(`✔ ${assetsDir}/ matches the build (${channels.join(', ')}; no added, changed or removed path)`);
