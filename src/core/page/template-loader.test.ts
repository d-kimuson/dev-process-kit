import { describe, expect, it } from 'vitest';

import { siblingEntryUrl } from './template-loader';

describe('siblingEntryUrl', () => {
  it('resolves a sibling of the running entry, same version, same directory', () => {
    expect(
      siblingEntryUrl('usm', 'https://cdn.jsdelivr.net/npm/dev-process-kit@1.2.3/dist/templates/event-storming.js'),
    ).toBe('https://cdn.jsdelivr.net/npm/dev-process-kit@1.2.3/dist/templates/usm.js');
  });

  it('resolves across a cross-origin dev split the same way', () => {
    expect(siblingEntryUrl('plain', 'https://dev-process-kit.localhost/dist/templates/usm.js')).toBe(
      'https://dev-process-kit.localhost/dist/templates/plain.js',
    );
  });

  it('gives nothing without an entry to resolve against', () => {
    expect(siblingEntryUrl('usm', null)).toBeNull();
  });
});
