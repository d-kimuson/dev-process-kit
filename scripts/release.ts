/**
 * Owns *what* this repository publishes and *where* each build goes: the release
 * channels, the release each one writes into the deployable tree, the origin that
 * release is reachable from, and the cache policy and addressing that follow from
 * that.
 *
 * One module decides all of it so that the build (`vite.config.ts`), the assembly
 * (`scripts/assemble-assets.ts`), the verifier (`scripts/verify-release.ts`) and the
 * deploy cannot disagree about which release is being produced.
 *
 * Two channels publish into the *same* asset root (`public/`), as two releases:
 *
 * - `stable` — `public/dev-process-kit@<package version>/`. Each release keeps its
 *   own version-pinned directory forever and is cached immutably (see
 *   `docs/adr/20260919_workers-static-assets-distribution.md`).
 * - `debug` — `public/dev-process-kit@debug/`, a single release that every publish
 *   overwrites. It exists so the latest build can be exercised from a real browser
 *   before a version is cut, so nothing may pin it and its paths must never be
 *   cached immutably.
 *
 * Sharing the tree is what makes the debug channel a *release* rather than a second
 * deployment: `wrangler deploy` publishes whatever the tree holds, and
 * `scripts/assemble-assets.ts` writes the cache rule of each release from
 * `releaseCachePolicy`, so one tree can hold an immutable version next to a
 * mutable debug release.
 *
 * `dev` is the local tree `wrangler dev` serves. It is not published: it reuses the
 * stable release id (the samples pin it) but gets neither cache rules nor channel
 * addressing.
 *
 * The deployable tree also publishes the repository samples under `/sample/`, next to
 * the releases they load (see `SAMPLES`).
 */
import { execFileSync } from 'node:child_process';

import pkg from '../package.json' with { type: 'json' };

/** The environment variable that selects the channel to build and verify. */
const PUBLISH_CHANNEL_ENV = 'DPK_CHANNEL';

/** A release channel that is published to Cloudflare. */
export type ReleaseChannel = 'stable' | 'debug';

/** The release id of the mutable debug channel. */
export const DEBUG_RELEASE_ID = 'debug';

/**
 * The origin the consumer documentation in `src/**` and `docs/**` names: the public
 * domain of the stable channel. The domain is not attached to the Worker yet, which
 * is why the debug channel addresses `DEBUG_ORIGIN` instead (see `publishTree`).
 */
export const STABLE_ORIGIN = 'https://dev-process-kit.kimuson.dev';

/**
 * Where the Worker that serves the deployable tree is reachable right now: the
 * `dev-process-kit` Worker from `wrangler.jsonc`, on the account's `workers.dev`
 * subdomain. No custom domain is configured yet, so this is the address a copied
 * URL has to use.
 */
export const DEBUG_ORIGIN = 'https://dev-process-kit.biz-km.workers.dev';

/** The directory `pnpm dev` assembles and `wrangler dev` serves. */
const DEV_ASSETS_DIR = 'public-dev';

/**
 * The origin `wrangler dev` serves the development tree from (via portless). The
 * repository samples load the bundle from here, so the sample server stays a separate
 * origin and the cross-origin load is exercised locally too.
 */
export const DEV_ORIGIN = 'https://dev-process-kit.localhost';

/**
 * Published documentation: exactly these paths of `docs/` are copied into a release.
 * `index.md` is the entry point of a release (the asset root's `llms.txt` points at it) and
 * carries the usage guide and the API contract; `components/` and `templates/` are the pages
 * for what a page actually uses. The rest of `docs/` is developer-facing and is never
 * distributed (`scripts/verify-release.ts` fails when any of it leaks in).
 */
export const PUBLISHED_DOCS = ['index.md', 'components', 'templates'] as const;

/**
 * How long a release's paths may be cached.
 *
 * - `immutable` — a published version, which the distribution ADR forbids changing.
 * - `revalidate` — a release that is overwritten in place (`debug`): always
 *   revalidated, so a reload picks up the next publish.
 */
export type ReleaseCachePolicy = 'immutable' | 'revalidate';

/** A literal replacement applied to the consumer documentation of a release. */
export type Rewrite = {
  readonly from: string;
  readonly to: string;
};

/**
 * One assembled tree: the asset root to write, the release it holds and where that
 * release is served from.
 */
export type AssetTree = {
  /** `dev` is the local dev tree; it is not a published channel. */
  readonly channel: ReleaseChannel | 'dev';
  /** The `<version>` in `dev-process-kit@<version>`. */
  readonly releaseId: string;
  /** What the bundle reports as `FRAMEWORK_VERSION`. */
  readonly frameworkVersion: string;
  /** Asset root, relative to the repository root. */
  readonly assetsDir: string;
  /** Origin the release of this tree is reachable from. */
  readonly origin: string;
  /**
   * Whether the tree gets cache rules at all. The dev tree does not, because
   * `vite build --watch` rewrites it while a dev session runs.
   */
  readonly cacheRules: boolean;
  /** Whether `vite build` writes `index.js.map` next to the bundle. */
  readonly sourcemap: boolean;
  /**
   * Whether the tree publishes the repository samples under `/sample/`. The dev tree
   * does not: `pnpm dev` serves `sample/` from its own origin instead.
   */
  readonly samples: boolean /**
   * Replacements applied to the published `docs/**` of this release so that the
   * documentation addresses the channel it ships in. A pinned URL copied out of a debug
   * release's `docs/index.md` has to name the release and origin a reader can actually
   * reach, or the artifact it produces loads a version that does not exist.
   */;
  readonly rewrites: readonly Rewrite[];
};

/**
 * The release id that is a version (`0.0.1`, `0.0.2-rc.1`), as opposed to the debug channel's
 * `debug`.
 *
 * The release index only lists versions. The debug release is the maintainer's own channel: every
 * publish replaces it, so it cannot promise to hold the latest of anything.
 */
export const isVersionRelease = (releaseId: string): boolean =>
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(releaseId);

/** A version release id split into what orders it: the numeric core and the prerelease tag. */
const versionParts = (releaseId: string): { readonly numbers: readonly number[]; readonly prerelease: string } => {
  const [core = '', prerelease = ''] = (releaseId.split('+')[0] ?? '').split('-', 2);
  return { numbers: core.split('.').map(Number), prerelease };
};

/** Orders two prerelease tags by identifier, numerically where both identifiers are numbers. */
const comparePrerelease = (left: string, right: string): number => {
  const a = left.split('.');
  const b = right.split('.');
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const one = a[index];
    const other = b[index];
    if (one === undefined) return -1;
    if (other === undefined) return 1;
    if (one === other) continue;
    if (/^\d+$/.test(one) && /^\d+$/.test(other)) return Number(one) - Number(other);
    return one < other ? -1 : 1;
  }
  return 0;
};

/** Orders two version release ids the way semver does, ignoring build metadata. */
export const compareReleases = (left: string, right: string): number => {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a.numbers[index] ?? 0) - (b.numbers[index] ?? 0);
    if (difference !== 0) return difference;
  }
  // A prerelease sorts before the release it leads to (`0.0.1-rc.1` < `0.0.1`).
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === '') return 1;
  if (b.prerelease === '') return -1;
  return comparePrerelease(a.prerelease, b.prerelease);
};

/**
 * The newest version release among `releases`, or `null` when the tree holds none — a debug-only
 * tree, which is the state before the first version is published.
 */
export const latestRelease = (releases: readonly string[]): string | null =>
  releases
    .filter(isVersionRelease)
    .reduce<string | null>(
      (latest, release) => (latest === null || compareReleases(release, latest) > 0 ? release : latest),
      null,
    );

/** The URL path segment that identifies a release, e.g. `dev-process-kit@0.0.1`. */
export const releaseSegment = (releaseId: string): string => `dev-process-kit@${releaseId}`;

/** The `Cache-Control` value a policy writes into `_headers`. */
export const cacheControl = (policy: ReleaseCachePolicy): string =>
  policy === 'immutable' ? 'public, max-age=31536000, immutable' : 'no-cache';

/**
 * The cache policy of one release. It is a property of the release rather than of
 * the tree, because one tree can hold both: the debug release is overwritten by the
 * next publish, a versioned release never changes.
 */
export const releaseCachePolicy = (releaseId: string): ReleaseCachePolicy =>
  releaseId === DEBUG_RELEASE_ID ? 'revalidate' : 'immutable';

/**
 * The entry points a release ships, as `<output name> -> <source>`.
 *
 * One release holds several entries because the framework is not one size: a page that
 * uses one template should download that template, not every template and every diagram.
 * `index.js` stays as the union of all of them, which is what the docs and the samples
 * pin when they do not care. The names are the published URLs
 * (`dev-process-kit@<version>/<name>.js`).
 */
export const RELEASE_ENTRIES = {
  index: 'src/index.ts',
  components: 'src/entries/components.ts',
  'templates/prototype': 'src/entries/prototype.ts',
  'templates/usm': 'src/entries/usm.ts',
  'templates/event-storming': 'src/entries/event-storming.ts',
  'templates/example-mapping': 'src/entries/example-mapping.ts',
  'templates/grill': 'src/entries/grill.ts',
  'templates/plain': 'src/entries/plain.ts',
} as const satisfies Record<string, string>;

/** The files every entry of a release has to be present as, relative to the release. */
export const ENTRY_FILES: readonly string[] = Object.keys(RELEASE_ENTRIES).map((name) => `${name}.js`);

/**
 * Applies the channel rewrites of a tree to one document.
 *
 * `rewrites` is empty for every tree but the debug channel, where the strings are
 * exact by contract: `scripts/release.test.ts` and the debug-release verification in
 * `scripts/verify-release.ts` fail when a published document pins something the
 * rewrite does not know about.
 */
export const applyRewrites = (text: string, rewrites: readonly Rewrite[]): string =>
  rewrites.reduce((result, { from, to }) => result.replaceAll(from, to), text);

/** Parses a channel name; an unknown value is a configuration error, not a fallback. */
export const channelFromEnv = (env: NodeJS.ProcessEnv = process.env): ReleaseChannel => {
  const value = env[PUBLISH_CHANNEL_ENV] ?? 'stable';
  if (value === 'stable' || value === 'debug') return value;
  throw new Error(`unknown ${PUBLISH_CHANNEL_ENV}: ${JSON.stringify(value)} (expected 'stable' or 'debug')`);
};

/**
 * The release a published build writes into the deployable tree `public/`.
 *
 * Neither channel ships a source map: a release is distributed, the map would carry the
 * full source of a private repository, and a browser only needs it to debug the bundle
 * in place. The development tree keeps its own map, which is never deployed.
 */
export const publishTree = (channel: ReleaseChannel): AssetTree =>
  channel === 'debug'
    ? {
        channel,
        releaseId: DEBUG_RELEASE_ID,
        frameworkVersion: `${pkg.version}-debug`,
        assetsDir: 'public',
        origin: DEBUG_ORIGIN,
        cacheRules: true,
        sourcemap: false,
        samples: true,
        rewrites: [
          { from: STABLE_ORIGIN, to: DEBUG_ORIGIN },
          { from: releaseSegment(pkg.version), to: releaseSegment(DEBUG_RELEASE_ID) },
        ],
      }
    : {
        channel,
        releaseId: pkg.version,
        frameworkVersion: pkg.version,
        assetsDir: 'public',
        origin: STABLE_ORIGIN,
        cacheRules: true,
        sourcemap: false,
        samples: true,
        rewrites: [],
      };

/**
 * The tree `wrangler dev` serves. It carries the stable release id, because the
 * samples pin that id, but it is never deployed: `pnpm dev` sets `DPK_ASSETS_DIR`
 * (see `package.json`) and `scripts/dev-assets.ts` assembles it without cache rules.
 */
export const devTree = (assetsDir: string = DEV_ASSETS_DIR): AssetTree => ({
  channel: 'dev',
  releaseId: pkg.version,
  frameworkVersion: pkg.version,
  assetsDir,
  origin: DEV_ORIGIN,
  cacheRules: false,
  sourcemap: true,
  samples: false,
  rewrites: [],
});

/**
 * The repository samples (`sample/<name>`): the living example of a pinned artifact.
 * They are written against the sources of this checkout, load the bundle from
 * `DEV_ORIGIN` while developing, and are published under `/sample/` of the deployable
 * tree. `scripts/release.test.ts` fails when `sample/` holds a page this list misses.
 */
export const SAMPLES = [
  'index.html',
  'ddd-primer.html',
  'event-storming.html',
  'usm.html',
  'example-mapping.html',
  'grill.html',
  'prototype.html',
  'design-doc.html',
  'architecture.html',
  'diagrams.html',
] as const;

/** Where the samples are published, relative to the asset root. */
export const SAMPLE_DIR = 'sample';

/**
 * The samples are overwritten by every build, whichever release they load, so they are
 * revalidated like the debug release and never cached immutably.
 */
export const SAMPLE_CACHE_POLICY: ReleaseCachePolicy = 'revalidate';

/**
 * The release the published samples load, given the complete releases of the tree.
 *
 * The samples are written for the sources of this checkout, so they load the release that
 * was built from them: the package version when the tree holds it, otherwise the debug
 * release (the state before the first version is cut). An older version was built from
 * older sources, and a sample that uses something newer would break on it, so it is never
 * chosen; `null` means the tree holds nothing the samples can load.
 *
 * The choice depends on the tree rather than on the channel being built, so the committed
 * tree is the same whichever channel `scripts/verify-committed.ts` rebuilds last.
 */
export const sampleRelease = (releases: readonly string[]): string | null => {
  if (releases.includes(pkg.version)) return pkg.version;
  return releases.includes(DEBUG_RELEASE_ID) ? DEBUG_RELEASE_ID : null;
};

/**
 * Turns a repository sample into the page published next to `release`: the bundle URL
 * becomes a path on the same origin (the published page is served by the tree that holds
 * the release), and a sample that loads the debug release addresses it everywhere else too,
 * the way that release's documentation does.
 */
export const sampleRewrites = (release: string): readonly Rewrite[] => [
  { from: `${DEV_ORIGIN}/${releaseSegment(pkg.version)}/`, to: `/${releaseSegment(release)}/` },
  ...(release === DEBUG_RELEASE_ID ? publishTree('debug').rewrites : []),
];

/**
 * The tree the current process builds: the development tree when `DPK_ASSETS_DIR`
 * is set (`pnpm dev`), otherwise the channel's deployable tree.
 *
 * Only `vite.config.ts` and `scripts/dev-assets.ts` use this. A *published* build
 * resolves its tree with `publishTree(channelFromEnv())` instead: the deployable
 * tree must not be selectable by the variable that exists for the dev server, or a
 * routine build could change what a running dev session serves.
 */
export const currentTree = (env: NodeJS.ProcessEnv = process.env): AssetTree => {
  const assetsDir = env['DPK_ASSETS_DIR'];
  return assetsDir === undefined ? publishTree(channelFromEnv(env)) : devTree(assetsDir);
};

/**
 * The commit this build came from, as `<short-sha>` plus `-dirty` when the working
 * tree has uncommitted changes, or `null` outside a Git checkout.
 *
 * The debug release is overwritten in place, so "which build is live?" cannot be
 * answered from its URL and has to be answered from the release itself: the
 * revision is part of `VERSION`.
 */
export const buildRevision = (): string | null => {
  const git = (...args: readonly string[]): string =>
    execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    const commit = git('rev-parse', '--short', 'HEAD');
    return git('status', '--porcelain') === '' ? commit : `${commit}-dirty`;
  } catch {
    return null;
  }
};
