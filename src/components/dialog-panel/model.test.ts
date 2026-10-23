import { describe, expect, it } from 'vitest';

import { PANEL_MIN_HEIGHT, draggedPanelHeight, keyedPanelHeight, scrollsInside, type ScrollBox } from './model';

const box = (overrides: Partial<ScrollBox> = {}): ScrollBox => ({
  overflowX: 'visible',
  scrollLeft: 0,
  scrollWidth: 200,
  clientWidth: 200,
  overflowY: 'auto',
  scrollTop: 0,
  scrollHeight: 400,
  clientHeight: 200,
  ...overrides,
});

describe('scrollsInside', () => {
  it('is false when nothing on the path scrolls', () => {
    expect(scrollsInside([box({ overflowY: 'visible' }), box({ scrollHeight: 200 })], 0, 10)).toBe(false);
  });

  it('follows the vertical direction: down needs room below, up needs room above', () => {
    expect(scrollsInside([box()], 0, 10)).toBe(true);
    expect(scrollsInside([box()], 0, -10)).toBe(false);
    expect(scrollsInside([box({ scrollTop: 200 })], 0, 10)).toBe(false);
    expect(scrollsInside([box({ scrollTop: 200 })], 0, -10)).toBe(true);
  });

  it('is true when any box on the path can take the turn', () => {
    expect(scrollsInside([box({ scrollTop: 200 }), box({ overflowY: 'scroll' })], 0, 10)).toBe(true);
  });

  it('follows the horizontal direction when the turn is mostly sideways, left needs room before, right needs room after', () => {
    const horizontal = box({ overflowX: 'auto', scrollWidth: 400, clientWidth: 200 });
    expect(scrollsInside([horizontal], 10, 0)).toBe(true);
    expect(scrollsInside([horizontal], -10, 0)).toBe(false);
    expect(scrollsInside([{ ...horizontal, scrollLeft: 200 }], 10, 0)).toBe(false);
    expect(scrollsInside([{ ...horizontal, scrollLeft: 200 }], -10, 0)).toBe(true);
  });

  it('ignores a box that only scrolls vertically when the turn is horizontal, and vice versa', () => {
    expect(scrollsInside([box({ overflowY: 'scroll', scrollTop: 200 })], -10, 0)).toBe(false);
    expect(scrollsInside([box({ overflowX: 'auto', scrollWidth: 400, scrollLeft: 200 })], 0, -10)).toBe(false);
  });
});

describe('draggedPanelHeight', () => {
  it('follows the drag and stops at the minimum', () => {
    expect(draggedPanelHeight(400, 60)).toBe(460);
    expect(draggedPanelHeight(400, -60)).toBe(340);
    expect(draggedPanelHeight(200, -500)).toBe(PANEL_MIN_HEIGHT);
  });
});

describe('keyedPanelHeight', () => {
  it('steps with the up and down arrows, further with Shift', () => {
    expect(keyedPanelHeight(400, 'ArrowDown', false)).toBe(424);
    expect(keyedPanelHeight(400, 'ArrowUp', true)).toBe(304);
  });

  it('ignores other keys', () => {
    expect(keyedPanelHeight(400, 'Enter', false)).toBeNull();
  });
});
