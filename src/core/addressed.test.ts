import { describe, expect, it } from 'vitest';

import {
  addressThrough,
  EMPTY_ADDRESSED,
  formatAddressed,
  isAddressed,
  parseActionId,
  parseAddressed,
} from './addressed';

const read = (text: string) => {
  const set = parseAddressed(text);
  if (typeof set === 'string') throw new Error(set);
  return set;
};

describe('addressed', () => {
  it('reads an action id as its writer and number', () => {
    expect(parseActionId('k3f9:14')).toEqual({ writer: 'k3f9', seq: 14 });
    expect(parseActionId('3f2a9c1e-0000-4000-8000-000000000000')).toBeNull();
    expect(parseActionId('k3f9:0')).toBeNull();
  });

  it('merges ranges that touch or overlap, and writes them back sorted by writer', () => {
    expect(formatAddressed(read('x7a2:1-10, k3f9:5-9,k3f9:1-4,k3f9:12,k3f9:10-11'))).toBe('k3f9:1-12,x7a2:1-10');
  });

  it('keeps a gap the author split out', () => {
    const set = read('k3f9:1-4,k3f9:6-14');
    expect(isAddressed(set, 'k3f9:4')).toBe(true);
    expect(isAddressed(set, 'k3f9:5')).toBe(false);
    expect(isAddressed(set, 'x7a2:1')).toBe(false);
    expect(formatAddressed(set)).toBe('k3f9:1-4,k3f9:6-14');
  });

  it('names the bad item', () => {
    expect(parseAddressed('k3f9:1-14,x7a2')).toBe('"x7a2" is not written "writer:from-to"');
    expect(parseAddressed('k3f9:9-3')).toBe('"k3f9:9-3" ends before it starts');
    expect(parseAddressed('')).toEqual(EMPTY_ADDRESSED);
  });

  it('grows each writer from 1 to its highest id, gaps included', () => {
    const next = addressThrough(read('k3f9:1-10'), ['k3f9:11', 'k3f9:14', 'x7a2:3', 'not-an-id']);
    expect(formatAddressed(next)).toBe('k3f9:1-14,x7a2:1-3');
  });

  it('fills a split gap again when its request comes back', () => {
    expect(formatAddressed(addressThrough(read('k3f9:1-4,k3f9:6-14'), ['k3f9:5']))).toBe('k3f9:1-14');
  });
});
