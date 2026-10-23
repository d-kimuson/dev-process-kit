import { describe, expect, it } from 'vitest';

import { keyTarget, selectedIndex } from './model';

describe('selectedIndex', () => {
  it('finds the named tab, else falls back to the first', () => {
    expect(selectedIndex(['a', 'b'], 'b')).toBe(1);
    expect(selectedIndex(['a', 'b'], 'zzz')).toBe(0);
    expect(selectedIndex(['a', 'b'], null)).toBe(0);
  });
});

describe('keyTarget', () => {
  it('wraps around with the arrow keys', () => {
    expect(keyTarget('ArrowRight', 2, 3)).toBe(0);
    expect(keyTarget('ArrowLeft', 0, 3)).toBe(2);
  });

  it('jumps to the ends and ignores other keys', () => {
    expect(keyTarget('Home', 2, 3)).toBe(0);
    expect(keyTarget('End', 0, 3)).toBe(2);
    expect(keyTarget('a', 0, 3)).toBeNull();
    expect(keyTarget('End', 0, 0)).toBeNull();
  });
});
