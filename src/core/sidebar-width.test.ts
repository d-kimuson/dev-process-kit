import { describe, expect, it } from 'vitest';

import { SIDEBAR_WIDTH, draggedSidebarWidth, keyedSidebarWidth, parseSidebarWidth } from './sidebar-width';

describe('parseSidebarWidth', () => {
  it('accepts a finite number and keeps it within the bounds', () => {
    expect(parseSidebarWidth(320)).toBe(320);
    expect(parseSidebarWidth(320.6)).toBe(321);
    expect(parseSidebarWidth(10)).toBe(SIDEBAR_WIDTH.min);
    expect(parseSidebarWidth(10_000)).toBe(SIDEBAR_WIDTH.max);
  });

  it('rejects anything that is not a width', () => {
    expect(parseSidebarWidth('320')).toBeNull();
    expect(parseSidebarWidth(Number.NaN)).toBeNull();
    expect(parseSidebarWidth(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseSidebarWidth(null)).toBeNull();
  });
});

describe('draggedSidebarWidth', () => {
  it('grows a left sidebar as its edge moves right', () => {
    expect(draggedSidebarWidth({ side: 'left', startX: 260, startWidth: 260 }, 340)).toBe(340);
    expect(draggedSidebarWidth({ side: 'left', startX: 300, startWidth: 260 }, 250)).toBe(210);
  });

  it('grows a right sidebar as its edge moves left', () => {
    expect(draggedSidebarWidth({ side: 'right', startX: 900, startWidth: 336 }, 800)).toBe(436);
    expect(draggedSidebarWidth({ side: 'right', startX: 900, startWidth: 336 }, 950)).toBe(286);
  });

  it('stops at the bounds', () => {
    expect(draggedSidebarWidth({ side: 'left', startX: 260, startWidth: 260 }, 0)).toBe(SIDEBAR_WIDTH.min);
    expect(draggedSidebarWidth({ side: 'left', startX: 260, startWidth: 260 }, 5000)).toBe(SIDEBAR_WIDTH.max);
  });
});

describe('keyedSidebarWidth', () => {
  const key = (name: string, shiftKey = false) => ({ key: name, shiftKey });

  it('moves the edge with the arrow keys, further with Shift', () => {
    expect(keyedSidebarWidth(260, 'left', key('ArrowRight'))).toBe(260 + SIDEBAR_WIDTH.step);
    expect(keyedSidebarWidth(260, 'left', key('ArrowLeft'))).toBe(260 - SIDEBAR_WIDTH.step);
    expect(keyedSidebarWidth(260, 'left', key('ArrowRight', true))).toBe(260 + SIDEBAR_WIDTH.largeStep);
    expect(keyedSidebarWidth(336, 'right', key('ArrowLeft'))).toBe(336 + SIDEBAR_WIDTH.step);
    expect(keyedSidebarWidth(336, 'right', key('ArrowRight'))).toBe(336 - SIDEBAR_WIDTH.step);
  });

  it('jumps to the bounds with Home and End', () => {
    expect(keyedSidebarWidth(260, 'left', key('Home'))).toBe(SIDEBAR_WIDTH.min);
    expect(keyedSidebarWidth(260, 'right', key('End'))).toBe(SIDEBAR_WIDTH.max);
  });

  it('stays within the bounds', () => {
    expect(keyedSidebarWidth(SIDEBAR_WIDTH.max, 'left', key('ArrowRight', true))).toBe(SIDEBAR_WIDTH.max);
  });

  it('ignores keys that do not resize', () => {
    expect(keyedSidebarWidth(260, 'left', key('Enter'))).toBeNull();
  });
});
