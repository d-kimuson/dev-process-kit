import { describe, expect, it } from 'vitest';

import {
  delegationTarget,
  entryUrl,
  pageUrlFor,
  parsePublishedVersions,
  presentVersionSelect,
  requestedVersion,
} from './version-switch';

describe('requestedVersion', () => {
  it('reads an exact version from the query', () => {
    expect(requestedVersion('?dpk-version=0.0.7')).toBe('0.0.7');
    expect(requestedVersion('?a=1&dpk-version=1.2.3-beta.4')).toBe('1.2.3-beta.4');
  });

  it('still honours the parameter the samples used', () => {
    expect(requestedVersion('?version=0.0.5')).toBe('0.0.5');
    expect(requestedVersion('?version=0.0.5&dpk-version=0.0.6')).toBe('0.0.6');
  });

  it('ignores anything that is not an exact version', () => {
    for (const value of ['', 'latest', '^0.0.7', '0.0', '0.0.7/../../x', '0.0.7 ', '1.2.3-', '1.2.3-a..b']) {
      expect(requestedVersion(`?dpk-version=${encodeURIComponent(value)}`)).toBeNull();
    }
    expect(requestedVersion('')).toBeNull();
  });
});

describe('delegationTarget', () => {
  it('names another version', () => {
    expect(delegationTarget('?dpk-version=0.0.7', '0.0.8')).toBe('0.0.7');
  });

  it('runs the page itself when the version asked for is its own, or none is', () => {
    expect(delegationTarget('?dpk-version=0.0.8', '0.0.8')).toBeNull();
    expect(delegationTarget('', '0.0.8')).toBeNull();
    expect(delegationTarget('?dpk-version=nope', '0.0.8')).toBeNull();
  });
});

describe('entryUrl', () => {
  it('points at the same entry of that version on jsDelivr', () => {
    expect(entryUrl('0.0.7', 'templates/prototype.js')).toBe(
      'https://cdn.jsdelivr.net/npm/dev-process-kit@0.0.7/dist/templates/prototype.js',
    );
    expect(entryUrl('1.0.0-beta.1', 'index.js')).toBe(
      'https://cdn.jsdelivr.net/npm/dev-process-kit@1.0.0-beta.1/dist/index.js',
    );
  });

  it('refuses a version or an entry that could leave the package', () => {
    expect(() => entryUrl('latest', 'index.js')).toThrow();
    expect(() => entryUrl('0.0.7', '../evil.js')).toThrow();
    expect(() => entryUrl('0.0.7', 'https://example.com/x.js')).toThrow();
  });
});

describe('pageUrlFor', () => {
  it('sets the version and keeps the rest of the URL', () => {
    expect(pageUrlFor('https://a.test/p.html?x=1#step=s1', '0.0.7')).toBe(
      'https://a.test/p.html?x=1&dpk-version=0.0.7#step=s1',
    );
  });

  it('drops the parameter (and the legacy one) to go back to the pinned version', () => {
    expect(pageUrlFor('https://a.test/p.html?dpk-version=0.0.7&version=0.0.6#h', null)).toBe('https://a.test/p.html#h');
    expect(pageUrlFor('https://a.test/p.html?version=0.0.6', '0.0.7')).toBe('https://a.test/p.html?dpk-version=0.0.7');
  });
});

describe('parsePublishedVersions', () => {
  it('reads the latest tag and the versions in the listing order', () => {
    expect(
      parsePublishedVersions({
        type: 'npm',
        name: 'dev-process-kit',
        tags: { latest: '0.0.8', beta: '0.0.9-beta.1' },
        versions: [{ version: '0.0.9-beta.1', links: {} }, { version: '0.0.8' }, { version: '0.0.7' }],
      }),
    ).toEqual({ latest: '0.0.8', versions: ['0.0.9-beta.1', '0.0.8', '0.0.7'] });
  });

  it('drops what is not an exact version', () => {
    expect(
      parsePublishedVersions({ tags: { latest: 'x' }, versions: [{ version: '0.0.8' }, { version: '../x' }] }),
    ).toEqual({ latest: null, versions: ['0.0.8'] });
  });

  it('throws on a listing of another shape', () => {
    expect(() => parsePublishedVersions({ versions: ['0.0.8'] })).toThrow();
    expect(() => parsePublishedVersions(null)).toThrow();
  });
});

describe('presentVersionSelect', () => {
  const text = { pinned: 'Pinned by the page', latest: (version: string) => `${version} (latest)` };

  it('lists the running version alone before the listing arrives', () => {
    expect(presentVersionSelect({ current: '0.0.8', requested: false, published: null, text })).toEqual({
      value: '0.0.8',
      options: [{ value: '0.0.8', label: '0.0.8' }],
    });
  });

  it('lists the published versions and marks the latest', () => {
    const model = presentVersionSelect({
      current: '0.0.7',
      requested: true,
      published: { latest: '0.0.8', versions: ['0.0.8', '0.0.7'] },
      text,
    });
    expect(model).toEqual({
      value: '0.0.7',
      options: [
        { value: '', label: 'Pinned by the page' },
        { value: '0.0.8', label: '0.0.8 (latest)' },
        { value: '0.0.7', label: '0.0.7' },
      ],
    });
  });

  it('never relabels the running version, so the header keeps its width when the listing arrives', () => {
    const model = presentVersionSelect({
      current: '0.0.8',
      requested: false,
      published: { latest: '0.0.8', versions: ['0.0.9-beta.1', '0.0.8'] },
      text,
    });
    expect(model.options).toEqual([
      { value: '0.0.9-beta.1', label: '0.0.9-beta.1' },
      { value: '0.0.8', label: '0.0.8' },
    ]);
  });

  it('keeps the running version listed when the listing lacks it (an unpublished build)', () => {
    const model = presentVersionSelect({
      current: '0.0.9',
      requested: false,
      published: { latest: '0.0.8', versions: ['0.0.8'] },
      text,
    });
    expect(model.options.map((option) => option.value)).toEqual(['0.0.9', '0.0.8']);
  });
});
