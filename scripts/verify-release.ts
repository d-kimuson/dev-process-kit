/**
 * Verifies one assembled tree and returns what is wrong with it (an empty list means the
 * release is shippable).
 *
 * `scripts/build-release.ts` calls this right after assembling, so a build cannot leave a
 * tree that fails its own contract behind; `scripts/verify-committed.ts` uses the same build,
 * which is why a committed tree is verified too.
 *
 * The tree is the actual deliverable: one release (its entry files, the documentation that
 * ships with that exact release, the licence and the third-party notice), the asset-root index
 * and response headers, the samples the tree publishes under `/sample/`, and — for `stable` —
 * the repository-local samples that pin that same version. The checks fail when any of them is incomplete, when a release drifted from
 * `package.json`, when the documentation still addresses another channel, or when
 * developer-only documentation leaked into the bundle.
 *
 * The predicates that define a release come from `assemble-assets.ts`, and the channel's
 * addressing and cache policy from `release.ts`, so generation and verification cannot drift
 * apart.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { relative } from 'node:path';

import pkg from '../package.json' with { type: 'json' };
import {
  cacheRulePatterns,
  completeReleasesIn,
  isCompleteRelease,
  RELEASE_DIR,
  SAMPLE_RULE_PATTERN,
} from './assemble-assets.ts';
import {
  applyRewrites,
  cacheControl,
  DEBUG_RELEASE_ID,
  DEV_ORIGIN,
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
  STABLE_ORIGIN,
  type AssetTree,
} from './release.ts';

/** Repository root, resolved from this file's own location (`scripts/`). */
const root = `${import.meta.dirname}/../`;

/** Verifies one tree; the returned failures are what `pnpm build` refuses to ship. */
export const verifyRelease = async (tree: AssetTree): Promise<string[]> => {
  const release = tree.releaseId;
  const assetsRoot = `${root}${tree.assetsDir}`;
  const versionDir = `${assetsRoot}/${releaseSegment(release)}`;
  const docsDir = `${versionDir}/docs`;

  /**
   * The policy the generated rules of a release have to carry: `immutable` for a
   * published version, `no-cache` for the debug release, which is overwritten in
   * place.
   */
  const expectedCache = (releaseId: string): string => cacheControl(releaseCachePolicy(releaseId));

  /** URL-bearing attributes: what a browser actually resolves and requests. */
  const URL_ATTRIBUTES = /(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  /** A bundle path segment, literal or percent-encoded, and the version it pins. */
  const VERSION_SEGMENT = /(?:\/|^)dev-process-kit(?:@|%40)([^/]*)/;

  /** A release rule as Wrangler records it: an optional origin, then the release path. */
  const RELEASE_RULE = /^(?:https:\/\/[^/]+)?\/dev-process-kit(?:@|%40)([^/]*)\/\*$/;

  /**
   * Bundle references written outside a URL attribute — prose, headings, footers. The
   * version *written* there has to stay current; whether a reference actually requests
   * the pinned version is decided from the parsed URL instead.
   */
  const VERSION_REFS = /dev-process-kit(?:@|%40)([^\s"'<>()]*)/g;

  /**
   * The framework is distributed under MIT, and every bundled dependency has to be
   * permissive as well: a copyleft license in the bundle would change the terms of the
   * whole release. This script enforces it on the generated notice, so a dependency
   * that changes its license fails the build instead of the lawyers.
   */
  const ALLOWED_LICENSES = new Set(['MIT', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense', 'Apache-2.0']);

  /**
   * Licenses that require reproducing a `NOTICE` file when the work ships one
   * (Apache-2.0 section 4d). MIT and BSD-3-Clause have no such condition: the `NOTICE`
   * that `es-toolkit` ships, for the parts of `es-toolkit/compat` derived from Lodash,
   * carries no obligation for the code this bundle uses, and the generator would not
   * reproduce it anyway.
   */
  const NOTICE_BEARING_LICENSES = new Set(['Apache-2.0']);

  /** One notice entry as Vite writes it: `## <name> - <version> (<SPDX identifier>)`. */
  const NOTICE_ENTRY = /^## (\S+) - (\S+) \(([^)]+)\)$/;

  /** Lines every MIT license text contains; `LICENSE` has to carry all of them. */
  const MIT_MARKERS = [
    'MIT License',
    'Permission is hereby granted, free of charge',
    'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND',
  ] as const;

  type NoticeEntry = {
    readonly name: string;
    readonly version: string;
    readonly identifier: string;
    readonly text: string;
  };

  /**
   * The entries of a generated third-party notice, each with the license text that
   * follows its heading. The text is what makes an entry sufficient: a package whose
   * `LICENSE` file could not be found is emitted with a heading and no body, which
   * satisfies nobody.
   */
  const noticeEntries = (markdown: string): NoticeEntry[] => {
    const entries: NoticeEntry[] = [];
    let heading: Omit<NoticeEntry, 'text'> | null = null;
    let body: string[] = [];
    const flush = (): void => {
      if (heading !== null) entries.push({ ...heading, text: body.join('\n').trim() });
      body = [];
    };
    for (const line of markdown.split('\n')) {
      const match = NOTICE_ENTRY.exec(line);
      if (match === null) {
        if (heading !== null) body.push(line);
        continue;
      }
      flush();
      heading = { name: match[1] ?? '', version: match[2] ?? '', identifier: match[3] ?? '' };
    }
    flush();
    return entries;
  };

  /**
   * Where pnpm installs one package: `node_modules/.pnpm/<name with `/` as `+`>@<version>…`.
   * The directory name carries a peer suffix when a package was installed for a
   * specific peer set, so the prefix is matched rather than the whole name.
   */
  const noticePackageDirs = async (name: string, version: string): Promise<string[]> => {
    const store = `${root}node_modules/.pnpm`;
    const prefix = `${name.replace('/', '+')}@${version}`;
    const entries = await readdir(store, { withFileTypes: true }).catch(() => []);
    return entries
      .filter((entry) => entry.isDirectory() && (entry.name === prefix || entry.name.startsWith(`${prefix}(`)))
      .map((entry) => `${store}/${entry.name}/node_modules/${name}`);
  };

  /** Percent-decoding of an external string; `null` when it is not well-formed. */
  const decode = (value: string): string | null => {
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  };

  /** The version a bundle URL path pins, or `null` when the path is not a bundle path. */
  const pinnedVersionIn = (pathname: string): string | null => {
    const match = VERSION_SEGMENT.exec(pathname);
    return match === null ? null : decode(match[1] ?? '');
  };

  /**
   * `_headers` rules as `pattern -> header lines`, classified the way Wrangler does
   * (`workers-shared/utils/configuration/parseHeaders.ts`): every line is trimmed, a
   * line that looks like a path starts a rule, and anything else is a header line of
   * the rule that is currently open. Indentation is not significant, and a query is
   * not part of the path a rule matches (`?…` is dropped, `#…` is kept — a fragment
   * cannot match a release path either way).
   */
  const headerRules = (text: string): Map<string, string[]> => {
    const rules = new Map<string, string[]>();
    let pattern: string | null = null;
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (line === '' || line.startsWith('#')) continue;
      if (line.startsWith('/') || line.startsWith('https://')) {
        pattern = line.replace(/\?.*$/, '');
        rules.set(pattern, []);
        continue;
      }
      if (pattern !== null) rules.get(pattern)?.push(line);
    }
    return rules;
  };

  const failures: string[] = [];

  const exists = async (path: string): Promise<boolean> => {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  };

  const requirePath = async (path: string, label: string): Promise<void> => {
    if (!(await exists(path))) failures.push(`missing ${label}: ${path.replace(root, '')}`);
  };

  const readText = async (path: string): Promise<string | null> => {
    try {
      return await readFile(path, 'utf8');
    } catch {
      return null;
    }
  };

  /** A relative import specifier as written in a built module: `from './chunks/shared-x.js'`. */
  const RELATIVE_IMPORT = /(?:from|import)\s*["'](\.\.?\/[^"']+)["']/g;

  /** Resolves a relative specifier against the module that imports it. */
  const resolveRelative = (file: string, specifier: string): string => {
    const stack = file.split('/').slice(0, -1);
    for (const part of specifier.split('/')) {
      if (part === '.' || part === '') continue;
      if (part === '..') stack.pop();
      else stack.push(part);
    }
    return stack.join('/');
  };

  // 1. Every entry, and the shared chunks they import. A release is a unit: an entry that
  //    imports a file the release does not contain cannot run, and nothing the channel does
  //    not publish belongs next to it.
  for (const entry of ENTRY_FILES) {
    await requirePath(`${versionDir}/${entry}`, `entry ${entry}`);
  }
  for (const file of await readdir(versionDir, { recursive: true })) {
    if (!file.endsWith('.js')) continue;
    const path = `${versionDir}/${file}`;
    const source = await readText(path);
    if (source === null || source.trim().length === 0) {
      failures.push(`empty or unreadable module: ${releaseSegment(release)}/${file}`);
      continue;
    }
    for (const match of source.matchAll(RELATIVE_IMPORT)) {
      const specifier = match[1] ?? '';
      if (!(await exists(resolveRelative(path, specifier)))) {
        failures.push(`${releaseSegment(release)}/${file} imports ${specifier}, which the release does not contain`);
      }
    }
  }
  if (!tree.sourcemap) {
    for (const file of await readdir(versionDir, { recursive: true })) {
      if (file.endsWith('.map')) failures.push(`a release publishes a source map: ${file}`);
    }
  }

  // 2. Published documentation, and nothing else.
  for (const entry of PUBLISHED_DOCS) {
    await requirePath(`${docsDir}/${entry}`, `published docs/${entry}`);
  }
  for (const leaked of ['guidelines', 'adr', 'tmp']) {
    if (await exists(`${docsDir}/${leaked}`)) {
      failures.push(`developer documentation leaked into the bundle: docs/${leaked}`);
    }
  }

  // 3. The documentation entry point names the release it belongs to. The asset root's
  //    `llms.txt` sends a reader here, so a release whose documentation does not name itself
  //    is a release that cannot be pinned.
  const entryDoc = await readText(`${docsDir}/index.md`);
  if (entryDoc === null) failures.push('missing the documentation entry point: docs/index.md');
  else if (!entryDoc.includes(releaseSegment(release))) {
    failures.push(`docs/index.md does not mention the current release (${releaseSegment(release)})`);
  }

  // 4. VERSION matches the channel and the release it holds.
  const versionFile = await readText(`${versionDir}/VERSION`);
  if (versionFile === null) failures.push('missing VERSION');
  else {
    if (!versionFile.includes(releaseSegment(release))) {
      failures.push(`VERSION does not name the release it holds (${releaseSegment(release)})`);
    }
    if (!versionFile.includes(`channel ${tree.channel}`)) {
      failures.push(`VERSION does not name the channel (${tree.channel})`);
    }
    if (!versionFile.includes(`version ${pkg.version}`)) {
      failures.push(`VERSION does not name the package version (${pkg.version})`);
    }
  }

  // 5. Response headers of the deployable tree: cross-origin loading of the bundle,
  //    plus the cache policy of the channel being built. The development tree is not
  //    checked here (it lives in `public-dev/`), so a `_headers` without the release
  //    rules means the tree was not produced by `pnpm build`.
  const headers = await readText(`${assetsRoot}/_headers`);
  if (headers === null) failures.push('missing _headers');
  else {
    const rules = headerRules(headers);
    // 5a. The catch-all rule is what makes the bundle loadable from an artifact that
    //     another origin hosts; nothing else provides that header.
    if (!(rules.get('/*') ?? []).some((line) => line.startsWith('Access-Control-Allow-Origin:'))) {
      failures.push(`${tree.assetsDir}/_headers does not allow cross-origin loading of the bundle`);
    }

    // 5b. A rule without the cache policy is dropped by Wrangler, so the policy has
    //     to be inside each rule block, not merely somewhere in the file.
    const checkedPatterns = new Set<string>();
    /** Records the failure when `pattern` is missing or does not carry `releaseId`'s policy. */
    const requirePolicyRule = (pattern: string, releaseId: string): void => {
      if (checkedPatterns.has(pattern)) return;
      checkedPatterns.add(pattern);
      const block = rules.get(pattern);
      if (block === undefined) failures.push(`${tree.assetsDir}/_headers is missing ${pattern} (run \`pnpm build\`)`);
      else if (!block.includes(`Cache-Control: ${expectedCache(releaseId)}`)) {
        failures.push(
          `${tree.assetsDir}/_headers caches ${pattern} without \`Cache-Control: ${expectedCache(releaseId)}\``,
        );
      }
    };

    for (const pattern of cacheRulePatterns(release)) requirePolicyRule(pattern, release);

    // 5c. The samples are rewritten by every build, so a cached copy has to be revalidated.
    if (tree.samples) {
      const block = rules.get(SAMPLE_RULE_PATTERN);
      const expected = `Cache-Control: ${cacheControl(SAMPLE_CACHE_POLICY)}`;
      if (block === undefined) failures.push(`${tree.assetsDir}/_headers is missing ${SAMPLE_RULE_PATTERN}`);
      else if (!block.includes(expected)) {
        failures.push(`${tree.assetsDir}/_headers caches ${SAMPLE_RULE_PATTERN} without \`${expected}\``);
      }
    }

    // 6. Cached paths have to be real: a rule that covers something other than a
    //    complete release would let the asset worker cache its 404s. Both URL forms
    //    are read, because the encoded rule is the one that matches the canonical
    //    response.
    const cachedReleases = new Set<string>();
    for (const pattern of rules.keys()) {
      const match = RELEASE_RULE.exec(pattern);
      if (match === null) continue;
      const cached = decode(match[1] ?? '');
      if (cached === null) {
        failures.push(`${tree.assetsDir}/_headers has an unreadable release rule: ${pattern}`);
        continue;
      }
      cachedReleases.add(cached);
    }
    if (cachedReleases.size === 0) failures.push(`${tree.assetsDir}/_headers has no release cache rules`);
    for (const cached of cachedReleases) {
      for (const pattern of cacheRulePatterns(cached)) requirePolicyRule(pattern, cached);
      if (!(await isCompleteRelease(assetsRoot, cached))) {
        failures.push(`${tree.assetsDir}/_headers caches an incomplete release: ${releaseSegment(cached)}`);
      }
    }
  }

  // 7. The asset root's index says what this origin serves: which version is the latest, and what
  //    a release directory carries. It is the first thing a client that lands on the origin reads,
  //    so a version it names has to exist, the latest has to be the one it points at, and the debug
  //    release has no place in it (it is the maintainer's channel, replaced by every publish).
  const index = await readText(`${assetsRoot}/llms.txt`);
  if (index === null) failures.push(`missing the release index: ${tree.assetsDir}/llms.txt`);
  else {
    const releases = await completeReleasesIn(assetsRoot);
    const latest = latestRelease(releases);
    if (latest !== null && !index.includes(releaseSegment(latest))) {
      failures.push(`llms.txt does not name the latest release (${releaseSegment(latest)})`);
    }
    if (index.includes(releaseSegment(DEBUG_RELEASE_ID))) {
      failures.push('llms.txt names the debug release, which is not a published version');
    }
    for (const match of index.matchAll(/dev-process-kit@([A-Za-z0-9.+-]+)/g)) {
      const named = match[1] ?? '';
      if (named === DEBUG_RELEASE_ID) continue;
      if (!releases.includes(named)) {
        failures.push(`llms.txt names ${releaseSegment(named)}, which is not a complete release in this tree`);
      } else if (latest === null) {
        failures.push(`llms.txt names ${releaseSegment(named)}, but the tree holds no version release`);
      }
    }
  }

  //    The tree holds only what a build puts there: at the root, releases plus the index, the
  //    headers, the licence and the published samples (checked in 9); in the release being built, the entries, their shared chunks,
  //    the documentation and the release's own files. Anything else is a leftover — an artifact
  //    from an older era, a file someone copied in — and a deploy would publish it, so it is
  //    reported instead. Only the release being built is enumerated: a published version keeps
  //    whatever it was built with, which is what makes it immutable.
  const TREE_FILES = new Set(['_headers', 'LICENSE', 'llms.txt']);
  const RELEASE_FILES = new Set([...ENTRY_FILES, 'VERSION', 'LICENSE', 'THIRD_PARTY_LICENSES.md']);
  for (const entry of await readdir(assetsRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (tree.samples && entry.name === SAMPLE_DIR) continue;
      if (RELEASE_DIR.exec(entry.name) === null) failures.push(`${tree.assetsDir}/${entry.name}/ is not a release`);
    } else if (!TREE_FILES.has(entry.name)) {
      failures.push(`${tree.assetsDir}/${entry.name} is not part of a release tree (a deploy would publish it)`);
    }
  }
  for (const entry of await readdir(versionDir, { recursive: true, withFileTypes: true })) {
    // Directories are the shape the files live in (`docs/`, `chunks/`), not content.
    if (entry.isDirectory()) continue;
    const file = relative(versionDir, `${entry.parentPath}/${entry.name}`);
    if (RELEASE_FILES.has(file)) continue;
    if (/^chunks\/shared-[\w-]+\.js$/.test(file)) continue;
    if (/^docs\/[\w./-]+\.md$/.test(file)) continue;
    failures.push(`${releaseSegment(release)}/${file} is not part of the release (a deploy would publish it)`);
  }

  // 8. Channel addressing. A consumer document of the debug channel has to name the
  //    debug origin and release: an agent that copies a pinned URL out of it would
  //    otherwise generate an artifact that loads a version which does not exist. The
  //    rewrite is performed by `assemble-assets.ts` and the strings it knows are the
  //    ones `release.ts` declares, so a document that drifts from them fails here.
  if (tree.rewrites.length > 0) {
    const documents: string[] = [];
    for (const file of await readdir(docsDir, { recursive: true })) {
      if (file.endsWith('.md')) documents.push(`${docsDir}/${file}`);
    }
    for (const document of documents) {
      const text = await readText(document);
      if (text === null) continue;
      for (const value of [STABLE_ORIGIN, releaseSegment(pkg.version)]) {
        if (text.includes(value)) {
          failures.push(`${document.replace(root, '')} still addresses another channel: ${value}`);
        }
      }
    }
  }

  // 9. The published samples. They are what a reader opens first, so a sample that loads
  //    nothing is a broken front page: every page is present, is exactly the repository
  //    sample addressed to the release it loads (nobody edited it in the tree), and every
  //    path it asks this origin for exists in the tree.
  if (tree.samples) {
    const sampleRoot = `${assetsRoot}/${SAMPLE_DIR}`;
    const loaded = sampleRelease(await completeReleasesIn(assetsRoot));
    const published = new Set(await readdir(sampleRoot).catch(() => []));
    for (const file of published) {
      if (!(SAMPLES as readonly string[]).includes(file)) {
        failures.push(`${tree.assetsDir}/${SAMPLE_DIR}/${file} is not a sample (a deploy would publish it)`);
      }
    }
    if (loaded === null) failures.push(`${tree.assetsDir}/ holds no release the samples can load`);
    else {
      for (const sample of SAMPLES) {
        const label = `${tree.assetsDir}/${SAMPLE_DIR}/${sample}`;
        const html = await readText(`${sampleRoot}/${sample}`);
        const source = await readText(`${root}sample/${sample}`);
        if (html === null) {
          failures.push(`missing published sample: ${label}`);
          continue;
        }
        if (source === null || html !== applyRewrites(source, sampleRewrites(loaded))) {
          failures.push(`${label} is not sample/${sample} addressed to ${releaseSegment(loaded)} (run \`pnpm build\`)`);
        }
        if (html.includes(DEV_ORIGIN)) failures.push(`${label} still loads from the dev origin (${DEV_ORIGIN})`);
        for (const attribute of html.matchAll(URL_ATTRIBUTES)) {
          const value = attribute[1] ?? attribute[2] ?? '';
          let url: URL;
          try {
            url = new URL(value, `https://sample.invalid/${SAMPLE_DIR}/${sample}`);
          } catch {
            continue;
          }
          if (url.origin !== 'https://sample.invalid') continue;
          const decoded = decode(url.pathname);
          if (decoded === null) continue;
          const path = decoded.endsWith('/') ? `${decoded}index.html` : decoded;
          if (!(await exists(`${assetsRoot}${path}`))) {
            failures.push(`${label} requests ${JSON.stringify(value)}, which the tree does not contain`);
          }
        }
      }
    }
  }

  // 10. The samples pin the version being built: a stale pin makes the documented
  //    example load a version that is not the one this build produced. They are part
  //    of the repository, not of a deployable tree, and they pin the stable release —
  //    so they are checked when the stable tree is built (`pnpm build`).
  if (tree.channel === 'stable') {
    for (const sample of SAMPLES) {
      const html = await readText(`${root}sample/${sample}`);
      if (html === null) {
        failures.push(`missing sample: sample/${sample}`);
        continue;
      }

      // 10a. Resource references, resolved the way a browser resolves them: TAB, LF and
      //     CR inside the value are dropped by the URL parser, the fragment is not part
      //     of the request, and the version lives in a path segment of the resolved URL.
      let references = 0;
      for (const attribute of html.matchAll(URL_ATTRIBUTES)) {
        const value = attribute[1] ?? attribute[2] ?? '';
        let pathname: string;
        try {
          pathname = new URL(value, 'https://sample.invalid/').pathname;
        } catch {
          if (value.includes('dev-process-kit')) {
            failures.push(`sample/${sample} has an unparsable bundle URL: ${JSON.stringify(value)}`);
          }
          continue;
        }
        // Whether a reference is a bundle reference is decided from the parsed path,
        // not from the raw value: a query string or another host may mention the name.
        if (!pathname.includes('dev-process-kit')) continue;
        references += 1;
        if (pinnedVersionIn(pathname) !== release) {
          failures.push(`sample/${sample} references ${JSON.stringify(value)} (expected a version-${release} path)`);
        }
      }
      if (references === 0) failures.push(`sample/${sample} does not reference ${releaseSegment(release)}`);

      // 10b. Version mentions outside those attributes (prose, footers, examples that are
      //     not attributes) must be current as well.
      for (const ref of html.replaceAll(URL_ATTRIBUTES, '').matchAll(VERSION_REFS)) {
        // A reference is `<segment>/<path>`; the segment is the pin, encoded or not.
        const [segment = ''] = (ref[1] ?? '').split('/');
        if (decode(segment) !== release) {
          failures.push(`sample/${sample} mentions ${JSON.stringify(ref[0])} (expected ${releaseSegment(release)})`);
        }
      }
    }
  }

  // 11. Third-party attribution. A release bundles other people's code, and both MIT
  //    and BSD-3-Clause require their copyright notice and license text to travel with
  //    the copy that is distributed — so the notice is part of what makes a release
  //    shippable, not a nicety. This check reads the notice Vite generated from the
  //    module graph rather than the dependency declarations: only the packages whose
  //    code is actually in `index.js` owe attribution.
  const notice = await readText(`${versionDir}/THIRD_PARTY_LICENSES.md`);
  if (notice === null) failures.push('missing third-party notice: THIRD_PARTY_LICENSES.md');
  else {
    const entries = noticeEntries(notice);
    if (entries.length === 0) failures.push('THIRD_PARTY_LICENSES.md lists no bundled dependency');
    for (const entry of entries) {
      const label = `${entry.name}@${entry.version}`;
      if (entry.text === '') failures.push(`THIRD_PARTY_LICENSES.md has no license text for ${label}`);
      if (!ALLOWED_LICENSES.has(entry.identifier)) {
        failures.push(
          `THIRD_PARTY_LICENSES.md bundles ${label} under ${entry.identifier}, which is not an allowed license`,
        );
      }

      // Apache-2.0 (section 4d) additionally requires reproducing the `NOTICE` file of
      // any work that ships one, and the generator collects license files only. Failing
      // here is the point: collecting it is a pipeline change, not a one-line fix.
      if (NOTICE_BEARING_LICENSES.has(entry.identifier)) {
        for (const dir of await noticePackageDirs(entry.name, entry.version)) {
          if (await exists(`${dir}/NOTICE`)) {
            failures.push(`${label} ships a NOTICE file that THIRD_PARTY_LICENSES.md does not reproduce`);
          }
        }
      }
    }
  }

  // 12. The framework's own license, at the stable URL and inside the release. MIT is
  //     a claim about terms; shipping the text is what makes it true.
  for (const [path, label] of [
    [`${assetsRoot}/LICENSE`, 'assets/LICENSE'],
    [`${versionDir}/LICENSE`, 'release LICENSE'],
  ] as const) {
    const text = await readText(path);
    if (text === null) failures.push(`missing ${label}`);
    else {
      for (const marker of MIT_MARKERS) {
        if (!text.includes(marker)) failures.push(`${label} is not the MIT license (missing: ${marker})`);
      }
    }
  }

  return failures;
};
