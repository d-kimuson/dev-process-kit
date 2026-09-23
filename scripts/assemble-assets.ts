/**
 * Owns the layout of a Workers Static Assets tree: how one is assembled from the
 * repository sources, and what counts as a complete release.
 *
 * `src/**` (plus the published part of `docs/**`) is the source of truth; every
 * tree this module writes is build output. Three callers use it:
 *
 * - `scripts/build-release.ts` writes one release into the deployable tree
 *   `public/`, which `wrangler deploy` publishes. Both channels share that tree —
 *   `public/dev-process-kit@<version>/` for `stable`, `public/dev-process-kit@debug/`
 *   for `debug` — so one deploy publishes whatever releases it holds, each with its
 *   own cache policy.
 * - `scripts/dev-assets.ts` writes `public-dev/`, the tree `wrangler dev` serves.
 * - `scripts/verify-release.ts` verifies the deployable tree against the predicates
 *   defined here, so generation and verification cannot drift apart.
 *
 * A deployable tree also carries the repository samples under `sample/`, rewritten to
 * load the release of the same tree (`sampleRelease` in `release.ts` picks it).
 *
 * The development tree is a separate directory on purpose: it serves the same
 * versioned URL, and `vite build --watch` rewrites that URL while a dev session
 * runs, so a deploy build must not be able to leave its cache policy behind in the
 * tree the dev server is serving.
 */
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';

import pkg from '../package.json' with { type: 'json' };
import {
  applyRewrites,
  cacheControl,
  ENTRY_FILES,
  latestRelease,
  PUBLISHED_DOCS,
  releaseCachePolicy,
  releaseSegment,
  SAMPLE_CACHE_POLICY,
  SAMPLE_DIR,
  sampleRelease,
  sampleRewrites,
  SAMPLES,
  type AssetTree,
} from './release.ts';

/** Repository root, resolved from this file's own location (`scripts/`). */
const root = `${import.meta.dirname}/../`;

/**
 * Everything a release carries. `VERSION` is written once the release content is
 * complete and acts as the marker that `isCompleteRelease` looks for, so that the
 * leftover of an interrupted build is never advertised as an immutable release
 * (see `cacheRulePatterns`).
 *
 * Two of these are produced by other steps of the same build and only their
 * absence is handled here: `index.js` and `THIRD_PARTY_LICENSES.md` come from
 * `vite build`. A release that is missing either of them is not complete, so the
 * deployable tree must not be finished in that state (`assembleAssets` refuses to
 * end one that way) and the development tree, which has no cache rules to get
 * wrong, is left alone.
 */
const RELEASE_FILES: readonly string[] = [
  ...ENTRY_FILES,
  'VERSION',
  'LICENSE',
  'THIRD_PARTY_LICENSES.md',
  ...PUBLISHED_DOCS.map((entry) => `docs/${entry}`),
];

/** A release directory name: `dev-process-kit@` followed by a non-empty id. */
export const RELEASE_DIR = /^dev-process-kit@(.+)$/;

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * `_headers` patterns that cover one release's paths, as written in the file: the
 * literal segment a client asks for, and the percent-encoded segment that the
 * asset worker treats as canonical (`307 -> /dev-process-kit%40<version>/…`).
 *
 * Three details make these rules safe, and each of them is load-bearing:
 *
 * - Both forms are needed, because `_headers` matches the raw request path and the
 *   asset worker redirects the literal form to the encoded one.
 * - The whole segment is encoded with `encodeURIComponent`, because that is what
 *   the worker does when it canonicalizes the path; hand-encoding `@` alone would
 *   miss a version such as `0.0.1+build.1` (`%2B`).
 * - The pattern ends with `/` before the glob, so it cannot match a *different*
 *   version: `/dev-process-kit@0.0.1*` would also match unpublished `0.0.10` and
 *   `0.0.1-rc.1`, and Workers applies `_headers` rules to 404 responses too, which
 *   would cache those 404s.
 */
export const cacheRulePatterns = (release: string): readonly string[] => {
  const segment = releaseSegment(release);
  return [`/${segment}/*`, `/${encodeURIComponent(segment)}/*`];
};

/** The `_headers` pattern that covers the published samples (`*` also matches `/sample/`). */
export const SAMPLE_RULE_PATTERN = `/${SAMPLE_DIR}/*`;

/**
 * The cache rules of a tree, one block per complete release that is in it, plus one for
 * the samples when the tree publishes them. The policy comes from the release, not from
 * the tree: one tree holds immutable versioned releases next to the mutable debug release.
 */
const cacheRules = (releases: readonly string[], samples: boolean): string =>
  [
    ...releases.flatMap((release) =>
      cacheRulePatterns(release).map(
        (rule) => `${rule}\n  Cache-Control: ${cacheControl(releaseCachePolicy(release))}\n`,
      ),
    ),
    ...(samples ? [`${SAMPLE_RULE_PATTERN}\n  Cache-Control: ${cacheControl(SAMPLE_CACHE_POLICY)}\n`] : []),
  ].join('\n');

/** Whether `assetsRoot/dev-process-kit@<release>` is a complete release. */
export const isCompleteRelease = async (assetsRoot: string, release: string): Promise<boolean> => {
  const releaseRoot = `${assetsRoot}/${releaseSegment(release)}`;
  const present = await Promise.all(RELEASE_FILES.map((file) => exists(`${releaseRoot}/${file}`)));
  return present.every(Boolean);
};

/**
 * Releases already present in the asset tree, in directory order.
 *
 * Only complete releases qualify: a rule is only generated for a release that is
 * whole, and caching a half-built directory would cache the 404s of its missing
 * files instead. `scripts/deploy-debug.ts` reads the same list to know what a deploy
 * would publish.
 */
export const completeReleasesIn = async (assetsRoot: string): Promise<string[]> => {
  if (!(await exists(assetsRoot))) return [];
  const releases: string[] = [];
  for (const entry of await readdir(assetsRoot, { withFileTypes: true })) {
    const match = entry.isDirectory() ? RELEASE_DIR.exec(entry.name) : null;
    if (match?.[1] !== undefined && (await isCompleteRelease(assetsRoot, match[1]))) {
      releases.push(match[1]);
    }
  }
  return releases;
};

/**
 * The `VERSION` marker: the release this directory holds and the channel it was built
 * for. `verify-release.ts` fails when it disagrees with the tree.
 *
 * It deliberately carries no build time and no commit: the artifacts are committed, and
 * the check that the committed tree is what a build produces (`scripts/verify-committed.ts`)
 * only means something when a build is reproducible from its sources. Which commit a
 * *deployment* came from is recorded where it belongs — in the deploy message
 * (`scripts/deploy-debug.ts`) and in the history of the tracked tree.
 */
const versionMarker = (tree: AssetTree): string =>
  [releaseSegment(tree.releaseId), `channel ${tree.channel}`, `version ${pkg.version}`].join('\n') + '\n';

/**
 * The asset root's `llms.txt`: what this origin serves and which version to start from.
 *
 * A client that lands on the origin knows no version yet, so this file says which release is the
 * latest and what a release directory carries; how to use one lives in that release's
 * `docs/index.md`. Only versions are listed. The debug release is the maintainer's own channel and
 * every publish replaces it, so it is not promised to hold anything.
 */
export const releaseIndex = (releases: readonly string[]): string => {
  const latest = latestRelease(releases);
  return [
    '# dev-process-kit',
    '',
    'Single HTML Artifact Framework — build-free single-file HTML artifacts with a structured draft/feedback loop back to an agent.',
    '',
    '## Latest version',
    '',
    ...(latest === null
      ? ['No version is published from this origin yet.']
      : [`The latest release is \`${releaseSegment(latest)}\`.`]),
    '',
    '## What a release carries',
    '',
    '| Path | What it is |',
    '| --- | --- |',
    '| `dev-process-kit@<version>/docs/index.md` | How to use that version — read this first |',
    '| `dev-process-kit@<version>/LICENSE`, `THIRD_PARTY_LICENSES.md` | The licence, and the attribution for what the bundle contains |',
    '',
    '`docs/index.md` is the entry point of a release and points at the rest of what it ships.',
    '',
    'Build the URLs from the origin you fetched this file from, and pin the version: an artifact has to keep working when a new version is published.',
    '',
  ].join('\n');
};

/**
 * Writes the repository samples into `<assets root>/sample/`, addressed to the release they
 * load. The directory is rewritten as a whole, so a sample that
 * was removed from the repository is removed from the tree too.
 */
const publishSamples = async (assetsRoot: string, releases: readonly string[]): Promise<void> => {
  const release = sampleRelease(releases);
  if (release === null) throw new Error(`the tree holds no release the samples can load (${releases.join(', ')})`);
  const target = `${assetsRoot}/${SAMPLE_DIR}`;
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const sample of SAMPLES) {
    const source = await readFile(`${root}sample/${sample}`, 'utf8');
    await writeFile(`${target}/${sample}`, applyRewrites(source, sampleRewrites(release)));
  }
};

/**
 * Rewrites the consumer documentation of a release in place (`docs/**`) so that it
 * addresses the channel the release is served as. The third-party notice is exempt: it
 * is generated from the bundle and has no address to correct.
 */
const rewriteConsumerDocs = async (tree: AssetTree, docsDir: string): Promise<void> => {
  if (tree.rewrites.length === 0) return;
  const rewrite = async (path: string): Promise<void> => {
    const text = await readFile(path, 'utf8');
    const rewritten = applyRewrites(text, tree.rewrites);
    if (rewritten !== text) await writeFile(path, rewritten);
  };
  for (const file of await readdir(docsDir, { recursive: true })) {
    if (file.endsWith('.md')) await rewrite(`${docsDir}/${file}`);
  }
};

/** Writes one release into the tree and returns the absolute path of the tree. */
export const assembleAssets = async (tree: AssetTree): Promise<string> => {
  const assetsRoot = `${root}${tree.assetsDir}`;
  const releaseRoot = `${assetsRoot}/${releaseSegment(tree.releaseId)}`;
  const docsDir = `${releaseRoot}/docs`;
  // A release counts as complete while its VERSION marker exists, so drop the
  // marker before touching the tree: an interrupted rebuild must not leave
  // something that looks like a finished release (the cache rules are generated
  // from that predicate). It is written again once the release content is in place.
  await rm(`${releaseRoot}/VERSION`, { force: true });
  await rm(docsDir, { recursive: true, force: true });
  await mkdir(docsDir, { recursive: true });

  for (const entry of PUBLISHED_DOCS) {
    const source = `${root}docs/${entry}`;
    if (await exists(source)) await cp(source, `${docsDir}/${entry}`, { recursive: true });
  }

  // The framework's own license: the repository copy is the source of truth and
  // ships twice. At the asset root it is reachable at a stable URL for anyone who
  // looks for it; inside the release it keeps the release self-contained, so
  // mirroring one versioned directory carries everything that directory needs.
  const license = `${root}LICENSE`;
  if (!(await exists(license))) throw new Error('missing LICENSE');
  await cp(license, `${assetsRoot}/LICENSE`);
  await cp(license, `${releaseRoot}/LICENSE`);

  // From here on the release content is in place, so its documents can be
  // addressed to the channel it is published as.
  await rewriteConsumerDocs(tree, docsDir);

  // A deployable tree is only finished when it holds a complete release, and
  // `VERSION` is what claims completeness — so the claim is checked *before* the
  // marker is written, and a build that is missing a file (typically because it
  // skipped `vite build`) leaves the release unmarked instead of marked and wrong.
  //
  // The dev tree is exempt: `pnpm dev` assembles it before `vite build --watch` has
  // written the bundle, and it never gets the cache rules that read this predicate.
  if (tree.cacheRules) {
    const required = RELEASE_FILES.filter((file) => file !== 'VERSION');
    const present = await Promise.all(
      required.map(async (file) =>
        (await exists(`${releaseRoot}/${file}`)) ? null : `${releaseSegment(tree.releaseId)}/${file}`,
      ),
    );
    const missing = present.filter((entry) => entry !== null);
    if (missing.length > 0) {
      throw new Error(`incomplete release: ${missing.join(', ')} (did \`vite build\` run?)`);
    }
  }

  // The release content is in place: mark it as complete before generating the
  // rules, because a rule is only generated for a complete release. An
  // interruption before this point leaves the release unmarked, and one right
  // after it leaves the tree without the current release's rules — both are
  // reported by the build's verification (`scripts/verify-release.ts`).
  await writeFile(`${releaseRoot}/VERSION`, versionMarker(tree));

  // The asset root's index, written from the releases that are actually complete in
  // the tree: it is the one file whose content depends on what the tree holds, and a
  // root index that lists a release which is not there is worse than no index.
  const releases = await completeReleasesIn(assetsRoot);
  if (releases.length > 0) await writeFile(`${assetsRoot}/llms.txt`, releaseIndex(releases));

  // The samples load a release of this tree, so they are written once the releases are known.
  if (tree.samples) await publishSamples(assetsRoot, releases);

  const shared = `${root}src/static/_headers`;
  if (!(await exists(shared))) throw new Error('missing src/static/_headers');
  const sharedHeaders = await readFile(shared, 'utf8');
  const cache = tree.cacheRules ? cacheRules(releases, tree.samples) : '';
  const headers = cache === '' ? sharedHeaders : `${sharedHeaders.trimEnd()}\n\n${cache}`;
  await writeFile(`${assetsRoot}/_headers`, headers);

  return assetsRoot;
};
