/**
 * The release channels decide where a build goes and how it is cached, so the
 * decisions are tested here rather than discovered in a deploy.
 *
 * The last case is the one that fails when the documentation drifts: the debug
 * channel rewrites the addressing of the consumer documents, and a document that
 * pins a different origin or version would silently keep pointing a reader at a
 * release that does not exist. `scripts/check-public.ts` checks the assembled tree
 * for the same property; this one fails in `pnpm test`.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import pkg from '../package.json' with { type: 'json' };
import { releaseIndex } from './assemble-assets';
import {
  applyRewrites,
  cacheControl,
  channelFromEnv,
  compareReleases,
  currentTree,
  devTree,
  isVersionRelease,
  latestRelease,
  DEV_ORIGIN,
  PUBLISHED_DOCS,
  publishTree,
  releaseCachePolicy,
  SAMPLES,
  sampleRelease,
  sampleRewrites,
  PUBLIC_ORIGIN,
} from './release';

/** Repository root, resolved from this file's own location (`scripts/`). */
const root = `${import.meta.dirname}/../`;

/** Every document a release ships: the published part of `docs/`. */
const publishedDocuments = async (): Promise<string[]> => {
  const documents: string[] = [];
  for (const entry of PUBLISHED_DOCS) {
    const path = `${root}docs/${entry}`;
    if (!(await stat(path)).isDirectory()) {
      documents.push(path);
      continue;
    }
    for (const file of await readdir(path, { recursive: true })) {
      if (file.endsWith('.md')) documents.push(`${path}/${file}`);
    }
  }
  return documents;
};

describe('channelFromEnv', () => {
  it('defaults to the stable channel', () => {
    expect(channelFromEnv({})).toBe('stable');
  });

  it('selects the debug channel', () => {
    expect(channelFromEnv({ DPK_CHANNEL: 'debug' })).toBe('debug');
  });

  it('rejects an unknown channel instead of falling back', () => {
    expect(() => channelFromEnv({ DPK_CHANNEL: 'Debug' })).toThrow(/DPK_CHANNEL/);
  });
});

describe('publishTree', () => {
  it('writes the package version into the deployable tree', () => {
    const tree = publishTree('stable');
    expect(tree.releaseId).toBe(pkg.version);
    expect(tree.frameworkVersion).toBe(pkg.version);
    expect(tree.assetsDir).toBe('public');
    expect(tree.origin).toBe(PUBLIC_ORIGIN);
    expect(tree.cacheRules).toBe(true);
    expect(tree.samples).toBe(true);
    expect(tree.rewrites).toEqual([]);
  });

  it('writes the debug release into the same deployable tree', () => {
    const tree = publishTree('debug');
    expect(tree.releaseId).toBe('debug');
    expect(tree.frameworkVersion).toBe(`${pkg.version}-debug`);
    expect(tree.assetsDir).toBe(publishTree('stable').assetsDir);
    expect(tree.origin).toBe(PUBLIC_ORIGIN);
    expect(tree.cacheRules).toBe(true);
    // The debug release is served by the deployed Worker while the repository is
    // private, so it does not publish the source maps the dev tree keeps.
    expect(tree.sourcemap).toBe(false);
    expect(tree.samples).toBe(true);
  });

  it('leaves the samples out of the development tree', () => {
    // The dev server serves `sample/` from its own origin, so the cross-origin load
    // is exercised locally; the dev tree does not need a copy.
    expect(devTree().samples).toBe(false);
  });
});

describe('currentTree', () => {
  it('resolves the deployable tree of the selected channel', () => {
    expect(currentTree({}).assetsDir).toBe('public');
    expect(currentTree({ DPK_CHANNEL: 'debug' }).releaseId).toBe('debug');
  });

  it('serves the development tree when DPK_ASSETS_DIR is set', () => {
    // The dev server selects its tree with its own variable, so a routine build
    // cannot change what a running dev session serves.
    expect(currentTree({ DPK_CHANNEL: 'debug', DPK_ASSETS_DIR: 'public-dev' })).toEqual(devTree('public-dev'));
  });
});

describe('cacheControl', () => {
  it('caches a published version immutably and revalidates the debug release', () => {
    expect(cacheControl('immutable')).toContain('immutable');
    expect(cacheControl('revalidate')).toBe('no-cache');
  });

  it('reads the policy from the release, not from the tree', () => {
    // One tree holds both, so the policy cannot be a property of the tree.
    expect(releaseCachePolicy(pkg.version)).toBe('immutable');
    expect(releaseCachePolicy('0.0.1-rc.1')).toBe('immutable');
    expect(releaseCachePolicy('debug')).toBe('revalidate');
  });
});

describe('release ordering', () => {
  it('counts versions as releases, and not the debug channel', () => {
    expect(isVersionRelease('0.0.1')).toBe(true);
    expect(isVersionRelease('0.0.1-rc.1')).toBe(true);
    expect(isVersionRelease('0.0.1+build.1')).toBe(true);
    expect(isVersionRelease('debug')).toBe(false);
    expect(isVersionRelease('0.0')).toBe(false);
  });

  it('orders versions the way semver does', () => {
    expect(compareReleases('0.0.2', '0.0.1')).toBeGreaterThan(0);
    expect(compareReleases('0.1.0', '0.0.9')).toBeGreaterThan(0);
    expect(compareReleases('0.0.1-rc.1', '0.0.1')).toBeLessThan(0);
    expect(compareReleases('0.0.1-rc.2', '0.0.1-rc.10')).toBeLessThan(0);
    expect(compareReleases('1.0.0', '1.0.0+build.2')).toBe(0);
  });

  it('finds the latest version and ignores the debug release', () => {
    expect(latestRelease(['debug'])).toBeNull();
    expect(latestRelease(['0.0.1', 'debug', '0.0.2-rc.1'])).toBe('0.0.2-rc.1');
    expect(latestRelease(['0.0.2', '0.0.10'])).toBe('0.0.10');
  });
});

describe('releaseIndex', () => {
  it('names the latest version and never the debug release', () => {
    const index = releaseIndex(['0.0.1', 'debug', '0.0.2']);
    expect(index).toContain('dev-process-kit@0.0.2');
    expect(index).not.toContain('dev-process-kit@debug');
    expect(index).toContain('docs/index.md');
    expect(index).toContain('THIRD_PARTY_LICENSES.md');
  });

  it('says so when the tree holds no version', () => {
    const index = releaseIndex(['debug']);
    expect(index).toContain('No version is published');
    expect(index).not.toContain('dev-process-kit@debug');
  });
});

describe('debug channel addressing', () => {
  it('rewrites every published document so it names the debug release', async () => {
    const { rewrites } = publishTree('debug');
    const documents = await publishedDocuments();
    expect(documents.length).toBeGreaterThan(1);
    // The release segment is rewritten everywhere it appears, which is only safe
    // while no published document pins the local dev origin: that URL is not a
    // release URL and must not be rewritten.
    const pinned = [`dev-process-kit@${pkg.version}`, 'dev-process-kit.localhost'];
    const leftovers: string[] = [];
    for (const document of documents) {
      const rewritten = applyRewrites(await readFile(document, 'utf8'), rewrites);
      for (const value of pinned) {
        if (rewritten.includes(value)) leftovers.push(`${document.replace(root, '')}: ${value}`);
      }
    }
    expect(leftovers).toEqual([]);
  });

  it('leaves the stable channel untouched', async () => {
    const [document] = await publishedDocuments();
    const source = await readFile(document ?? '', 'utf8');
    expect(applyRewrites(source, publishTree('stable').rewrites)).toBe(source);
  });
});

describe('published samples', () => {
  it('load the version the repository pins, and the debug release before one is built', () => {
    expect(sampleRelease([pkg.version, 'debug'])).toBe(pkg.version);
    expect(sampleRelease(['debug'])).toBe('debug');
    // An older version was written for older sources; the samples are not.
    expect(sampleRelease(['0.0.0-older', 'debug'])).toBe('debug');
    expect(sampleRelease(['0.0.0-older'])).toBeNull();
    expect(sampleRelease([])).toBeNull();
  });

  it('load the bundle from the origin that serves them', () => {
    const source = `<script type="module" src="${DEV_ORIGIN}/dev-process-kit@${pkg.version}/components.js"></script>`;
    expect(applyRewrites(source, sampleRewrites(pkg.version))).toBe(
      `<script type="module" src="/dev-process-kit@${pkg.version}/components.js"></script>`,
    );
    expect(applyRewrites(source, sampleRewrites('debug'))).toBe(
      '<script type="module" src="/dev-process-kit@debug/components.js"></script>',
    );
  });

  it('address the debug release everywhere when they load it', () => {
    const snippet = `${PUBLIC_ORIGIN}/dev-process-kit@${pkg.version}/templates/prototype.js`;
    expect(applyRewrites(snippet, sampleRewrites('debug'))).toBe(
      `${PUBLIC_ORIGIN}/dev-process-kit@debug/templates/prototype.js`,
    );
    expect(applyRewrites(snippet, sampleRewrites(pkg.version))).toBe(snippet);
  });

  it('lists every page of sample/', async () => {
    const pages = (await readdir(`${root}sample`)).filter((file) => file.endsWith('.html'));
    expect([...pages].sort()).toEqual([...SAMPLES].sort());
  });

  it('leave no address behind that the published page cannot reach', async () => {
    // A sample that pins another version, or the dev origin in a form the rewrite does
    // not know, would load nothing once it is published.
    const leftovers: string[] = [];
    for (const sample of SAMPLES) {
      const source = await readFile(`${root}sample/${sample}`, 'utf8');
      for (const release of [pkg.version, 'debug']) {
        const published = applyRewrites(source, sampleRewrites(release));
        const pinned = release === 'debug' ? [DEV_ORIGIN, `dev-process-kit@${pkg.version}`] : [DEV_ORIGIN];
        for (const value of pinned) {
          if (published.includes(value)) leftovers.push(`${sample} (${release}): ${value}`);
        }
      }
    }
    expect(leftovers).toEqual([]);
  });
});
