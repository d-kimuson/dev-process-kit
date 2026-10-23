import { describe, expect, it } from 'vitest';

import { nearestScrollTop, revealWithin, scrollByWheel, wheelDeltaPixels } from './scroll';

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

describe('revealWithin', () => {
  const boxed = (top: number, height: number): HTMLElement => {
    const element = document.createElement('div');
    element.getBoundingClientRect = () => new DOMRect(0, top, 100, height);
    return element;
  };

  it('keeps a margin between the child and the edge it scrolled in from', () => {
    const container = boxed(0, 100);
    Object.defineProperty(container, 'clientHeight', { value: 100 });
    revealWithin(container, boxed(150, 20), 20);
    expect(container.scrollTop).toBe(90);
  });
});

describe('wheelDeltaPixels', () => {
  it('passes a pixel-mode delta through unchanged', () => {
    expect(wheelDeltaPixels({ deltaX: 3, deltaY: 40, deltaMode: 0 }, 300)).toEqual({ dx: 3, dy: 40 });
  });

  it('scales a line-mode delta to pixels', () => {
    expect(wheelDeltaPixels({ deltaX: 0, deltaY: 2, deltaMode: 1 }, 300)).toEqual({ dx: 0, dy: 32 });
  });

  it('scales a page-mode delta to the viewport size', () => {
    expect(wheelDeltaPixels({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 300)).toEqual({ dx: 0, dy: 300 });
  });
});

describe('scrollByWheel', () => {
  const scrollable = (
    scrollTop: number,
  ): {
    scrollTop: number;
    scrollLeft: number;
    scrollHeight: number;
    scrollWidth: number;
    clientHeight: number;
    clientWidth: number;
  } => ({
    scrollTop,
    scrollLeft: 0,
    scrollHeight: 1000,
    scrollWidth: 100,
    clientHeight: 300,
    clientWidth: 100,
  });

  it('scrolls down and reports it moved', () => {
    const element = scrollable(0);
    const moved = scrollByWheel(element, { deltaX: 0, deltaY: 120, deltaMode: 0, ctrlKey: false });
    expect(moved).toBe(true);
    expect(element.scrollTop).toBe(120);
  });

  it('clamps to the scrollable range', () => {
    const element = scrollable(650);
    scrollByWheel(element, { deltaX: 0, deltaY: 120, deltaMode: 0, ctrlKey: false });
    expect(element.scrollTop).toBe(700); // scrollHeight (1000) - clientHeight (300)
  });

  it('does nothing at the boundary, in the direction of the boundary', () => {
    const element = scrollable(700);
    const moved = scrollByWheel(element, { deltaX: 0, deltaY: 120, deltaMode: 0, ctrlKey: false });
    expect(moved).toBe(false);
    expect(element.scrollTop).toBe(700);
  });

  it('ignores an element with no overflow', () => {
    const element = {
      scrollTop: 0,
      scrollLeft: 0,
      scrollHeight: 300,
      scrollWidth: 100,
      clientHeight: 300,
      clientWidth: 100,
    };
    const moved = scrollByWheel(element, { deltaX: 0, deltaY: 120, deltaMode: 0, ctrlKey: false });
    expect(moved).toBe(false);
  });

  it('leaves a ctrl-held wheel (pinch-zoom) alone', () => {
    const element = scrollable(0);
    const moved = scrollByWheel(element, { deltaX: 0, deltaY: 120, deltaMode: 0, ctrlKey: true });
    expect(moved).toBe(false);
    expect(element.scrollTop).toBe(0);
  });
});
