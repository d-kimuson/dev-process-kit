import { describe, expect, it } from 'vitest';

import { nearestScrollTop } from './scroll';

describe('nearestScrollTop', () => {
  const viewport = { top: 100, bottom: 300 };

  it('leaves a fully visible child where it is', () => {
    expect(nearestScrollTop(40, viewport, { top: 120, bottom: 200 })).toBe(40);
  });

  it('scrolls up just enough to show a child above the viewport', () => {
    expect(nearestScrollTop(40, viewport, { top: 80, bottom: 150 })).toBe(20);
  });

  it('scrolls down just enough to show a child below the viewport', () => {
    expect(nearestScrollTop(40, viewport, { top: 250, bottom: 350 })).toBe(90);
  });

  it('aligns a child taller than the viewport to its top', () => {
    expect(nearestScrollTop(40, viewport, { top: 150, bottom: 500 })).toBe(90);
  });
});
