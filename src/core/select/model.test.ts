import { describe, expect, it } from 'vitest';

import { clampActiveIndex, indexOfValue, moveActiveIndex, typeAheadMatch, type SelectOption } from './model';

const options: readonly SelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'fr', label: 'French' },
];

describe('clampActiveIndex', () => {
  it('clamps into range, or -1 when there is nothing to point at', () => {
    expect(clampActiveIndex(1, 3)).toBe(1);
    expect(clampActiveIndex(-4, 3)).toBe(0);
    expect(clampActiveIndex(9, 3)).toBe(2);
    expect(clampActiveIndex(0, 0)).toBe(-1);
  });
});

describe('moveActiveIndex', () => {
  it('wraps at either end and starts from the matching end when nothing is active', () => {
    expect(moveActiveIndex(-1, 1, 3)).toBe(0);
    expect(moveActiveIndex(-1, -1, 3)).toBe(2);
    expect(moveActiveIndex(2, 1, 3)).toBe(0);
    expect(moveActiveIndex(0, -1, 3)).toBe(2);
    expect(moveActiveIndex(0, 1, 0)).toBe(-1);
  });
});

describe('indexOfValue', () => {
  it('finds the option carrying a value, or -1 when none does', () => {
    expect(indexOfValue(options, 'ja')).toBe(1);
    expect(indexOfValue(options, 'missing')).toBe(-1);
  });
});

describe('typeAheadMatch', () => {
  it('finds the next option (wrapping) whose label starts with the query, case-insensitively', () => {
    expect(typeAheadMatch(options, 'j', -1)).toBe(1);
    expect(typeAheadMatch(options, 'J', 1)).toBe(1); // wraps past the end back to itself when it's the only match
    expect(typeAheadMatch(options, 'f', 0)).toBe(2);
  });

  it('returns null for a blank query or no match', () => {
    expect(typeAheadMatch(options, '', 0)).toBeNull();
    expect(typeAheadMatch(options, 'z', 0)).toBeNull();
    expect(typeAheadMatch([], 'e', -1)).toBeNull();
  });
});
