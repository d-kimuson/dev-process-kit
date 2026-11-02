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
  menuClearanceOf,
  menuPlacedAt,
  nearestMenuEdge,
  orientationOf,
  parseMenuDock,
  parseMenuSpot,
  droppedMenuSpot,
  HEADER_SPOT,
  keyedMenuSpot,
  menuSizeAs,
  menuGhostOf,
  menuRowWidth,
  menuSlotOf,
  restingMenuBox,
  restingMenuInsets,
  spotOrientation,
  type MenuSpot,
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

  it('falls back to the top of the right edge, clear of the rail and of the hand-off dock', () => {
    expect(FLOATING_MENU.fallback).toEqual({ edge: 'right', offset: margin });
    expect(dockedMenuBox(FLOATING_MENU.fallback, COLUMN, AREA)).toEqual({
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

describe('the room a docked menu takes', () => {
  const at = (edge: MenuDock['edge']): MenuSpot => ({ kind: 'edge', dock: { edge, offset: margin } });

  it('is the menu plus its margin on the right edge, and nothing on the others or in the header', () => {
    expect(menuClearanceOf(at('right'), 44)).toBe(44 + FLOATING_MENU.margin);
    for (const edge of ['top', 'bottom', 'left'] as const) expect(menuClearanceOf(at(edge), 44)).toBe(0);
    expect(menuClearanceOf(HEADER_SPOT, 300)).toBe(0);
    // Before measurement there is nothing to step aside for yet.
    expect(menuClearanceOf(at('right'), 0)).toBe(0);
  });
});

describe('the header spot', () => {
  /** The same screen, with a 44px header row above the menu's area. */
  const BELOW_HEADER: MenuArea = { left: 0, top: 44, width: 1200, height: 756 };
  const edge = (dock: MenuDock): MenuSpot => ({ kind: 'edge', dock });

  it('is where the menu opens, lying as one row', () => {
    expect(FLOATING_MENU.default).toEqual(HEADER_SPOT);
    expect(spotOrientation(HEADER_SPOT)).toBe('horizontal');
    expect(spotOrientation(edge({ edge: 'left', offset: 40 }))).toBe('vertical');
  });

  it('takes a menu let go over the header row, and leaves the rest of the screen to the edges', () => {
    // Its top reaches into the header row: it snaps into the header.
    expect(droppedMenuSpot({ left: 600, top: 30 }, ROW, BELOW_HEADER, true)).toEqual(HEADER_SPOT);
    // Just below the header it hangs from the top edge, as before.
    expect(droppedMenuSpot({ left: 600, top: 50 }, ROW, BELOW_HEADER, true)).toEqual(
      edge({ edge: 'top', offset: 600 }),
    );
    // A header with no room for the menu takes nothing: the nearest edge does.
    expect(droppedMenuSpot({ left: 600, top: 30 }, ROW, BELOW_HEADER, false)).toEqual(
      edge({ edge: 'top', offset: 600 }),
    );
  });

  it('goes into the header with a second ArrowUp, and leaves it with the other arrows', () => {
    const top = edge({ edge: 'top', offset: 300 });
    expect(keyedMenuSpot(edge({ edge: 'left', offset: 300 }), { key: 'ArrowUp' }, ROW, AREA, true)).toEqual(top);
    expect(keyedMenuSpot(top, { key: 'ArrowUp' }, ROW, AREA, true)).toEqual(HEADER_SPOT);
    // A header with no room for the menu keeps it on the top edge.
    expect(keyedMenuSpot(top, { key: 'ArrowUp' }, ROW, AREA, false)).toEqual(top);
    expect(keyedMenuSpot(HEADER_SPOT, { key: 'ArrowDown' }, ROW, AREA, true)).toEqual(
      edge({ edge: 'bottom', offset: margin }),
    );
    expect(keyedMenuSpot(HEADER_SPOT, { key: 'ArrowRight' }, COLUMN, AREA, true)).toEqual(
      edge({ edge: 'right', offset: margin }),
    );
    // Already as high as it goes; Home and End have no edge to run along.
    expect(keyedMenuSpot(HEADER_SPOT, { key: 'ArrowUp' }, ROW, AREA, true)).toBeNull();
    expect(keyedMenuSpot(HEADER_SPOT, { key: 'Home' }, ROW, AREA, true)).toBeNull();
    expect(keyedMenuSpot(HEADER_SPOT, { key: 'Enter' }, ROW, AREA, true)).toBeNull();
  });

  it('estimates the size the menu will have in the other orientation by turning it', () => {
    expect(menuSizeAs('horizontal', COLUMN, 'vertical')).toEqual(ROW);
    expect(menuSizeAs('vertical', COLUMN, 'vertical')).toEqual(COLUMN);
  });

  it('reads back what it stored, and a bare dock stored before the header had a slot', () => {
    const left = edge({ edge: 'left', offset: 220 });
    for (const spot of [HEADER_SPOT, left]) expect(parseMenuSpot(JSON.parse(JSON.stringify(spot)))).toEqual(spot);
    expect(parseMenuSpot({ edge: 'left', offset: 220 })).toEqual(left);
    expect(parseMenuSpot({ kind: 'nowhere' })).toBeNull();
    expect(parseMenuSpot(null)).toBeNull();
  });
});

describe("the header's slot", () => {
  const left: MenuSpot = { kind: 'edge', dock: { edge: 'left', offset: 40 } };

  it('holds the room of the menu that is in it, and offers itself while the menu is carried', () => {
    expect(menuSlotOf(HEADER_SPOT, null, 240)).toEqual({ kind: 'room', drop: 'none', width: 240 });
    expect(menuSlotOf(HEADER_SPOT, left, 240)).toEqual({ kind: 'room', drop: 'offered', width: 240 });
    expect(menuSlotOf(HEADER_SPOT, HEADER_SPOT, null)).toEqual({ kind: 'room', drop: 'targeted', width: null });
  });

  // A menu elsewhere leaves a button that brings it back, the size of one header
  // control whatever the menu's own: carrying the menu changes its look, not its width.
  it('is a button that brings back a menu kept elsewhere, and the place to let it go', () => {
    expect(menuSlotOf(left, null, 240)).toEqual({ kind: 'return', drop: 'none' });
    expect(menuSlotOf(left, left, 240)).toEqual({ kind: 'return', drop: 'offered' });
    expect(menuSlotOf(left, HEADER_SPOT, 240)).toEqual({ kind: 'return', drop: 'targeted' });
  });

  it('holds the room of the menu as one row, however it was last drawn', () => {
    expect(menuRowWidth(ROW)).toBe(ROW.width);
    expect(menuRowWidth(COLUMN)).toBe(ROW.width);
  });
});

describe('where a resting menu is drawn', () => {
  const SLOT = { left: 700, top: 6 };
  const right: MenuSpot = { kind: 'edge', dock: { edge: 'right', offset: 40 } };

  it("sits on the header's slot, and against its edge elsewhere", () => {
    expect(restingMenuBox(HEADER_SPOT, SLOT, ROW, AREA)).toEqual(SLOT);
    expect(restingMenuBox(right, SLOT, COLUMN, AREA)).toEqual(
      dockedMenuBox({ edge: 'right', offset: 40 }, COLUMN, AREA),
    );
    expect(restingMenuInsets(HEADER_SPOT, SLOT, AREA)).toEqual([
      { side: 'left', value: SLOT.left },
      { side: 'top', value: SLOT.top },
    ]);
    expect(restingMenuInsets(right, SLOT, AREA)).toEqual(dockedMenuInsets({ edge: 'right', offset: 40 }, AREA));
  });

  it('falls back to its edge when the header has no slot to hold it', () => {
    expect(restingMenuBox(HEADER_SPOT, null, COLUMN, AREA)).toEqual(
      dockedMenuBox(FLOATING_MENU.fallback, COLUMN, AREA),
    );
    expect(restingMenuInsets(HEADER_SPOT, null, AREA)).toEqual(dockedMenuInsets(FLOATING_MENU.fallback, AREA));
  });
});

describe('the ghost of an edge drop', () => {
  it('is drawn at the dock, turned to lie along its edge and held inside it', () => {
    // A column carried to the bottom edge lands as a row, clamped by the row's own width.
    const ghost = menuGhostOf({ edge: 'bottom', offset: 5_000 }, COLUMN, 'vertical', AREA);
    expect(ghost).toEqual({
      ...dockedMenuBox({ edge: 'bottom', offset: AREA.width - ROW.width - margin }, ROW, AREA),
      ...ROW,
    });
    expect(menuGhostOf({ edge: 'left', offset: 100 }, COLUMN, 'vertical', AREA)).toEqual({
      ...dockedMenuBox({ edge: 'left', offset: 100 }, COLUMN, AREA),
      ...COLUMN,
    });
  });
});
