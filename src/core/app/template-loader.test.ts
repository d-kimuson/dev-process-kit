import { describe, expect, it } from 'vitest';

import { siblingEntryUrl, boardEntryUrl } from './template-loader';

const CDN = 'https://cdn.jsdelivr.net/npm/dev-process-kit@1.2.3/dist/';

describe('siblingEntryUrl', () => {
  it('resolves a sibling of the running entry, same version, same directory', () => {
    expect(siblingEntryUrl('usm', `${CDN}views/event-storming.js`)).toBe(`${CDN}views/usm.js`);
  });

  it('resolves across a cross-origin dev split the same way', () => {
    expect(siblingEntryUrl('plain', 'https://dev-process-kit.localhost/dist/views/usm.js')).toBe(
      'https://dev-process-kit.localhost/dist/views/plain.js',
    );
  });

  it('finds the views from an entry at the package root', () => {
    // `index.js`, `boards.js` and `components.js` sit one directory above the views.
    expect(siblingEntryUrl('usm', `${CDN}index.js`)).toBe(`${CDN}views/usm.js`);
    expect(siblingEntryUrl('usm', `${CDN}boards.js`)).toBe(`${CDN}views/usm.js`);
  });

  it('gives nothing without an entry to resolve against', () => {
    expect(siblingEntryUrl('usm', null)).toBeNull();
  });
});

describe('boardEntryUrl', () => {
  it('resolves the one board entry from a view entry', () => {
    expect(boardEntryUrl(`${CDN}views/usm.js`)).toBe(`${CDN}boards.js`);
  });

  it('resolves it from an entry already at the root', () => {
    expect(boardEntryUrl(`${CDN}components.js`)).toBe(`${CDN}boards.js`);
  });

  it('gives nothing without an entry to resolve against', () => {
    expect(boardEntryUrl(null)).toBeNull();
  });

  it('keeps a query or hash on the running entry out of the resolved URL', () => {
    expect(boardEntryUrl(`${CDN}views/usm.js?dpk-version=1.2.3#top`)).toBe(`${CDN}boards.js`);
  });
});
