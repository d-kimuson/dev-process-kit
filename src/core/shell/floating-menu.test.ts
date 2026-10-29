import { describe, expect, it } from 'vitest';

import {
  clampMenuDock,
  dockedMenuAt,
  dockedMenuBox,
  dockedMenuInsets,
  draggedMenuBox,
  droppedMenuDock,
  FLOATING_MENU,
  keyedMenuDock,
  menuPlacedAt,
  nearestMenuEdge,
  orientationOf,
  parseMenuDock,
  type MenuArea,
  type MenuDock,
  type MenuInset,
  type MenuSize,
} from './floating-menu';

/** A 1200x800 screen, with a 52px rail down its left edge. */
const AREA: MenuArea = { left: 52, top: 0, width: 1148, height: 800 };
/** The menu as a row (docked to a horizontal edge) and as a column (a vertical one). */
const ROW: MenuSize = { width: 240, height: 44 };
const COLUMN: MenuSize = { width: 44, height: 240 };
const { margin } = FLOATING_MENU;

/**
 * Where a box placed by `insets` lands: the resolved inset on each axis, with
 * the box's own size taking the far side when the near one is not given.
 */
const placedBy = (insets: readonly MenuInset[], size: MenuSize, area: MenuArea): { left: number; top: number } => {
  const at = (side: MenuInset['side']): number | undefined => insets.find((inset) => inset.side === side)?.value;
  const left = at('left') ?? area.left + area.width - size.width - (at('right') ?? 0);
  const top = at('top') ?? area.top + area.height - size.height - (at('bottom') ?? 0);
  return { left, top };
};

describe('floating menu placement', () => {
  it('lies along the edge it is docked to', () => {
    expect(orientationOf('top')).toBe('horizontal');
    expect(orientationOf('bottom')).toBe('horizontal');
    expect(orientationOf('left')).toBe('vertical');
    expect(orientationOf('right')).toBe('vertical');
  });

  it('opens at the top of the right edge, clear of the rail and of the hand-off dock', () => {
    expect(FLOATING_MENU.default).toEqual({ edge: 'right', offset: margin });
    expect(dockedMenuBox(FLOATING_MENU.default, COLUMN, AREA)).toEqual({
      left: AREA.left + AREA.width - COLUMN.width - margin,
      top: margin,
    });
  });

  it('draws each edge against that edge, one margin in', () => {
    const dock = (edge: MenuDock['edge'], offset: number): MenuDock => ({ edge, offset });
    expect(dockedMenuBox(dock('top', 300), ROW, AREA)).toEqual({ left: 352, top: margin });
    expect(dockedMenuBox(dock('bottom', 300), ROW, AREA)).toEqual({
      left: 352,
      top: 800 - ROW.height - margin,
    });
    expect(dockedMenuBox(dock('left', 200), COLUMN, AREA)).toEqual({ left: AREA.left + margin, top: 200 });
    expect(dockedMenuBox(dock('right', 200), COLUMN, AREA)).toEqual({
      left: AREA.left + AREA.width - COLUMN.width - margin,
      top: 200,
    });
  });

  // Before the menu is measurable it is drawn by the dock's insets: wherever it
  // hangs from, those insets put it exactly where its measured box would be.
  it('places the menu by insets alone, the same place as its measured box', () => {
    for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
      for (const size of [ROW, COLUMN]) {
        const dock: MenuDock = { edge, offset: 300 };
        expect(placedBy(dockedMenuInsets(dock, AREA), size, AREA)).toEqual(dockedMenuBox(dock, size, AREA));
      }
    }
  });

  it('counts a box drawn where it belongs as placed, sub-pixel rounding aside', () => {
    expect(menuPlacedAt({ left: 100, top: 20 }, { left: 100, top: 20 })).toBe(true);
    expect(menuPlacedAt({ left: 100.6, top: 19.4 }, { left: 100, top: 20 })).toBe(true);
    expect(menuPlacedAt({ left: 102, top: 20 }, { left: 100, top: 20 })).toBe(false);
    expect(menuPlacedAt({ left: 100, top: 20 }, { left: 100, top: 24 })).toBe(false);
  });

  it('holds the offset inside its edge, and keeps the start margin in an area too small for the menu', () => {
    expect(clampMenuDock({ edge: 'top', offset: -400 }, ROW, AREA)).toEqual({ edge: 'top', offset: margin });
    expect(clampMenuDock({ edge: 'top', offset: 5_000 }, ROW, AREA)).toEqual({
      edge: 'top',
      offset: AREA.width - ROW.width - margin,
    });
    expect(clampMenuDock({ edge: 'top', offset: 300.4 }, ROW, AREA)).toEqual({ edge: 'top', offset: 300 });
    const narrow: MenuArea = { left: 0, top: 0, width: 100, height: 100 };
    expect(clampMenuDock({ edge: 'top', offset: 900 }, ROW, narrow)).toEqual({ edge: 'top', offset: margin });
  });

  it('snaps a free box to the edge whose side it is nearest', () => {
    const box = { left: 600, top: 4 };
    expect(nearestMenuEdge(box, ROW, AREA)).toBe('top');
    expect(nearestMenuEdge({ left: 4, top: 400 }, ROW, AREA)).toBe('left');
    expect(nearestMenuEdge({ left: 1000, top: 400 }, ROW, AREA)).toBe('right');
    expect(nearestMenuEdge({ left: 600, top: 760 }, ROW, AREA)).toBe('bottom');
    // A menu near the top of a short screen is still nearest the top.
    const short: MenuArea = { left: 0, top: 0, width: 1_200, height: 200 };
    expect(nearestMenuEdge({ left: 400, top: 20 }, ROW, short)).toBe('top');
  });

  it('docks a free box by its start along the edge it snapped to', () => {
    expect(dockedMenuAt({ left: 300, top: 2 }, ROW, AREA)).toEqual({ edge: 'top', offset: 300 - AREA.left });
    expect(dockedMenuAt({ left: 2, top: 260 }, COLUMN, AREA)).toEqual({ edge: 'left', offset: 260 });
    // Left off the area entirely, it comes back inside the edge it hung from.
    expect(dockedMenuAt({ left: -500, top: -500 }, ROW, AREA)).toEqual({ edge: 'left', offset: margin });
  });

  it('follows the pointer while it is dragged, and drops on the nearest edge', () => {
    const drag = { startX: 500, startY: 20, box: { left: 900, top: 12 } };
    expect(draggedMenuBox(drag, 480, 60)).toEqual({ left: 880, top: 52 });
    // Let go low on the screen: it hangs from the bottom, where it was left along that edge.
    expect(droppedMenuDock(drag, 100, 780, COLUMN, AREA)).toEqual({ edge: 'bottom', offset: 500 - AREA.left });
  });

  it('docks with the arrows, and goes to the ends of its edge with Home and End', () => {
    const dock: MenuDock = { edge: 'top', offset: 300 };
    expect(keyedMenuDock(dock, { key: 'ArrowLeft' }, COLUMN, AREA)).toEqual({ edge: 'left', offset: 300 });
    expect(keyedMenuDock(dock, { key: 'ArrowRight' }, COLUMN, AREA)).toEqual({ edge: 'right', offset: 300 });
    expect(keyedMenuDock(dock, { key: 'ArrowDown' }, ROW, AREA)).toEqual({ edge: 'bottom', offset: 300 });
    expect(keyedMenuDock(dock, { key: 'ArrowUp' }, ROW, AREA)).toEqual({ edge: 'top', offset: 300 });
    // An offset from a longer edge is held inside a shorter one.
    const long: MenuDock = { edge: 'top', offset: 700 };
    expect(keyedMenuDock(long, { key: 'ArrowLeft' }, COLUMN, AREA)).toEqual({
      edge: 'left',
      offset: AREA.height - COLUMN.height - margin,
    });
    expect(keyedMenuDock(dock, { key: 'Home' }, ROW, AREA)).toEqual({ edge: 'top', offset: margin });
    expect(keyedMenuDock(dock, { key: 'End' }, ROW, AREA)).toEqual({
      edge: 'top',
      offset: AREA.width - ROW.width - margin,
    });
    // Other keys belong to the page.
    expect(keyedMenuDock(dock, { key: 'Enter' }, ROW, AREA)).toBeNull();
    expect(keyedMenuDock(dock, { key: 'Escape' }, ROW, AREA)).toBeNull();
  });

  it('reads a stored dock, refusing what is not one', () => {
    expect(parseMenuDock({ edge: 'left', offset: 220 })).toEqual({ edge: 'left', offset: 220 });
    expect(parseMenuDock({ edge: 'left', offset: 220.6 })).toEqual({ edge: 'left', offset: 221 });
    expect(parseMenuDock({ edge: 'middle', offset: 10 })).toBeNull();
    expect(parseMenuDock({ edge: 'top', offset: Number.NaN })).toBeNull();
    expect(parseMenuDock({ edge: 'top' })).toBeNull();
    expect(parseMenuDock({ edge: 4, offset: 10 })).toBeNull();
    expect(parseMenuDock('top')).toBeNull();
    expect(parseMenuDock(null)).toBeNull();
  });
});
