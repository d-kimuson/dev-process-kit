import { describe, expect, it } from 'vitest';

import { normalizeOptions, parseTagFilterData } from './model';

describe('normalizeOptions', () => {
  it('takes names and counted options alike, dropping blanks and repeats', () => {
    expect(normalizeOptions(['BC:auth', { tag: 'BC:order', count: 3 }, '', 'BC:auth'])).toEqual([
      { tag: 'BC:auth', count: null },
      { tag: 'BC:order', count: 3 },
    ]);
  });

  it('moves BC: tags ahead of the rest, keeping each group in its authored order', () => {
    expect(normalizeOptions(['order', 'BC:order', 'payment', 'BC:auth'])).toEqual([
      { tag: 'BC:order', count: null },
      { tag: 'BC:auth', count: null },
      { tag: 'order', count: null },
      { tag: 'payment', count: null },
    ]);
  });
});

describe('parseTagFilterData', () => {
  it('reads a bare list as the tags', () => {
    expect(parseTagFilterData(['a', 'b'])).toEqual({ tags: ['a', 'b'], active: null, match: null });
  });

  it('reads the selection and the matching when given', () => {
    expect(parseTagFilterData({ tags: ['a'], active: ['a', 1], match: 'any' })).toEqual({
      tags: ['a'],
      active: ['a'],
      match: 'any',
    });
    expect(parseTagFilterData({ tags: [], match: 'xor' }).match).toBeNull();
  });

  it('rejects anything without a tag list', () => {
    expect(() => parseTagFilterData({ active: [] })).toThrow();
    expect(() => parseTagFilterData('a')).toThrow();
  });
});
