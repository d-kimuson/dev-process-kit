import { describe, expect, it } from 'vitest';

import { parseSelection, serializeSelection, toggleSelection } from './selection';

describe('selection in the hash', () => {
  it('reads a comma-separated list of ids, once each', () => {
    expect(parseSelection(undefined)).toEqual([]);
    expect(parseSelection('')).toEqual([]);
    expect(parseSelection('a')).toEqual(['a']);
    expect(parseSelection('a,b,,a')).toEqual(['a', 'b']);
  });

  it('writes it back, and nothing for an empty selection', () => {
    expect(serializeSelection([])).toBeUndefined();
    expect(serializeSelection(['a', 'b'])).toBe('a,b');
  });

  it('toggles one id in or out', () => {
    expect(toggleSelection(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b']);
  });
});
