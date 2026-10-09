import { describe, expect, it } from 'vitest';

import { clipLabel } from './link-label';

describe('clipLabel', () => {
  it('keeps a label that fits its room', () => {
    expect(clipLabel('pays', 80)).toBe('pays');
  });

  it('cuts a label to its room and ends it in an ellipsis', () => {
    const clipped = clipLabel('places an order and pays for it', 60);
    expect(clipped.endsWith('…')).toBe(true);
    expect(clipped.length).toBeLessThan('places an order and pays for it'.length);
  });

  it('counts a wide character as wider than a narrow one', () => {
    expect(Array.from(clipLabel('注文確定から決済オーソリ', 60)).length).toBeLessThan(
      Array.from(clipLabel('abcdefghijklmnopqrstuvwx', 60)).length,
    );
  });

  it('never cuts an emoji in half', () => {
    expect(clipLabel('🔥📦🔥📦🔥📦🔥📦🔥📦', 40)).toMatch(/^(🔥|📦)+…$/u);
  });

  it('shows at least the ellipsis where there is almost no room', () => {
    expect(clipLabel('注文確定', 4)).toBe('…');
  });
});
