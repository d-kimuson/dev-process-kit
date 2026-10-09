import { describe, expect, it } from 'vitest';

import { newItem } from './commands';
import {
  constrainViewport,
  fitRect,
  focusRect,
  keepInside,
  revealRect,
  toCanvas,
  toScreen,
  zoomAt,
  ZOOM_MAX,
} from './interactions';
import {
  boardBounds,
  connectorGeometry,
  connectorPath,
  grownToHold,
  itemAt,
  itemsInRect,
  outlinePoint,
  rectBetween,
} from './layout';
import { whiteboardMessages } from './messages';
import { parseWhiteboardBase } from './model';

describe('whiteboard viewport', () => {
  it('zooms around the pointer', () => {
    const viewport = zoomAt({ x: 10, y: 20, zoom: 1 }, { x: 110, y: 120 }, 2);
    expect(viewport.zoom).toBe(2);
    expect(toScreen(viewport, toCanvas({ x: 10, y: 20, zoom: 1 }, { x: 110, y: 120 }))).toEqual({ x: 110, y: 120 });
    expect(zoomAt(viewport, { x: 0, y: 0 }, 100).zoom).toBe(ZOOM_MAX);
  });

  it('fits a rect into the view, centered, never above the cap', () => {
    const fitted = fitRect({ x: 100, y: 100, w: 400, h: 200 }, { width: 1000, height: 600 }, 50);
    expect(fitted.zoom).toBe(1);
    expect(toScreen(fitted, { x: 300, y: 200 })).toEqual({ x: 500, y: 300 });
    expect(fitRect({ x: 0, y: 0, w: 1800, h: 200 }, { width: 1000, height: 600 }, 50).zoom).toBe(0.5);
  });

  it('shows the whole board when the least zoom can hold it', () => {
    const items = [
      { x: 0, y: 0, w: 160, h: 160 },
      { x: 3000, y: 2000, w: 160, h: 160 },
    ];
    expect(focusRect(items, { width: 1000, height: 600 }, 50)).toEqual({ x: 0, y: 0, w: 3160, h: 2160 });
  });

  it('leaves out an item too far away to fit, rather than show a board of empty space', () => {
    const near = [
      { x: 0, y: 0, w: 160, h: 160 },
      { x: 400, y: 100, w: 160, h: 160 },
      { x: 200, y: 300, w: 160, h: 160 },
    ];
    const far = { x: 1_000_000, y: -1_000_000, w: 160, h: 160 };
    expect(focusRect([...near, far], { width: 1000, height: 600 }, 50)).toEqual({ x: 0, y: 0, w: 560, h: 460 });
    expect(focusRect([], { width: 1000, height: 600 }, 50)).toBeNull();
  });

  it('brings an off-screen rect into view, and leaves a visible one alone', () => {
    const view = { width: 800, height: 600 };
    const viewport = { x: 0, y: 0, zoom: 1 };
    expect(revealRect(viewport, { x: 100, y: 100, w: 160, h: 160 }, view)).toBe(viewport);
    expect(revealRect(viewport, { x: 100, y: -700, w: 160, h: 160 }, view)).toEqual({ x: 220, y: 920, zoom: 1 });
  });

  it('shifts a floating bar back inside the view, and leaves one that fits alone', () => {
    // Overflows on the right: pulled left so its end sits at the margin.
    expect(keepInside(1084, 410, 1440, 8)).toBe(-62);
    // Overflows on the left: pushed right.
    expect(keepInside(-30, 200, 1440, 8)).toBe(38);
    expect(keepInside(100, 200, 1440, 8)).toBe(0);
    // Wider than the view: its start stays visible.
    expect(keepInside(-30, 2000, 1440, 8)).toBe(38);
  });

  it('keeps a floating bar right of a floor, such as the add-toolbar along the left edge', () => {
    expect(keepInside(20, 200, 390, 8, 56)).toBe(44);
    expect(keepInside(100, 200, 390, 8, 56)).toBe(0);
    // No room right of the floor: its start still clears the floor.
    expect(keepInside(20, 400, 390, 8, 56)).toBe(44);
  });

  it('lets the board wander but keeps a strip of it on screen', () => {
    const board = { x: 0, y: 0, w: 500, h: 500 };
    const view = { width: 800, height: 600 };
    expect(constrainViewport({ x: 100, y: 50, zoom: 1 }, board, view)).toEqual({ x: 100, y: 50, zoom: 1 });
    expect(constrainViewport({ x: -5000, y: 5000, zoom: 1 }, board, view)).toEqual({ x: -404, y: 504, zoom: 1 });
    expect(constrainViewport({ x: -5000, y: 0, zoom: 1 }, null, view)).toEqual({ x: -5000, y: 0, zoom: 1 });
  });
});

describe('whiteboard layout', () => {
  const state = parseWhiteboardBase({
    items: [
      { id: 'frame', kind: 'frame', x: 0, y: 0, w: 400, h: 300, title: 'Ideas' },
      { id: 'a', kind: 'sticky', x: 20, y: 20, w: 100, h: 100 },
      { id: 'e', kind: 'shape', shape: 'ellipse', x: 300, y: 20, w: 100, h: 100 },
    ],
  });
  const [, a, e] = state.items;
  if (a === undefined || e === undefined) throw new Error('fixture');

  it('grows an item down just enough to hold its text, and never shrinks it', () => {
    expect(grownToHold(a, 37.2)).toEqual({ w: 100, h: 138 });
    expect(grownToHold(a, 0)).toBeUndefined();
    // Sub-pixel rounding noise is not overflow.
    expect(grownToHold(a, 0.4)).toBeUndefined();
    expect(grownToHold(a, -20)).toBeUndefined();
  });

  it('measures the board around every item', () => {
    expect(boardBounds([])).toBeNull();
    expect(boardBounds(state.items)).toEqual({ x: 0, y: 0, w: 400, h: 300 });
  });

  it('leaves a box through its edge and an ellipse through its curve', () => {
    expect(outlinePoint(a, { x: 1000, y: 70 })).toEqual({ x: 120, y: 70 });
    const diagonal = outlinePoint(e, { x: 1350, y: 1070 });
    expect(diagonal.x).toBeCloseTo(350 + 50 / Math.SQRT2);
    expect(diagonal.y).toBeCloseTo(70 + 50 / Math.SQRT2);
    expect(connectorGeometry(a, e)).toEqual({
      start: { x: 120, y: 70 },
      end: { x: 300, y: 70 },
      mid: { x: 210, y: 70 },
    });
  });

  it('routes a connector straight, at right angles, or as an S-curve between facing sides', () => {
    if (a === undefined || e === undefined) throw new Error('expected items');
    expect(connectorPath(a, e, 'straight')).toEqual({ d: 'M 120 70 L 300 70', mid: { x: 210, y: 70 } });
    const below = { ...e, x: 400, y: 300 };
    // Wider apart than tall: leave through the right side, enter through the left.
    expect(connectorPath(a, below, 'elbow')).toEqual({
      d: 'M 120 70 L 260 70 L 260 350 L 400 350',
      mid: { x: 260, y: 210 },
    });
    expect(connectorPath(a, below, 'curve')).toEqual({
      d: 'M 120 70 C 260 70 260 350 400 350',
      mid: { x: 260, y: 210 },
    });
    // Taller apart than wide: bottom side to top side.
    const under = { ...e, x: 60, y: 400 };
    expect(connectorPath(a, under, 'elbow').d).toBe('M 70 120 L 70 260 L 110 260 L 110 400');
  });

  it('finds what lies on top under a point', () => {
    expect(itemAt(state, { x: 50, y: 50 })?.id).toBe('a');
    expect(itemAt(state, { x: 50, y: 50 }, 'a')?.id).toBe('frame');
    expect(itemAt(state, { x: 900, y: 50 })).toBeUndefined();
  });

  it('selects what a dragged-out area touches, but a frame only when it encloses it whole', () => {
    expect(rectBetween({ x: 50, y: 60 }, { x: 10, y: 0 })).toEqual({ x: 10, y: 0, w: 40, h: 60 });
    const ids = (rect: { x: number; y: number; w: number; h: number }) =>
      itemsInRect(state, rect).map((item) => item.id);
    expect(ids({ x: 100, y: 100, w: 250, h: 10 })).toEqual(['a', 'e']);
    expect(ids({ x: 500, y: 0, w: 100, h: 100 })).toEqual([]);
    expect(ids({ x: -10, y: -10, w: 420, h: 320 })).toEqual(['frame', 'a', 'e']);
  });

  it('lands a new item on free canvas near where it was asked for', () => {
    const m = whiteboardMessages('en');
    // Inside the frame, on top of nothing: right there.
    expect(newItem(state, m, 'sticky', { x: 200, y: 220 })).toMatchObject({ x: 120, y: 140, kind: 'sticky' });
    // On top of sticky "a": the nearest spot that covers nothing.
    const moved = newItem(state, m, 'sticky', { x: 70, y: 70 });
    expect(moved.id).toBe('new-sticky');
    expect(itemAt(state, { x: moved.x + 80, y: moved.y + 80 })?.kind ?? 'none').not.toBe('sticky');
    // A frame does not land over what is there, or it would swallow it.
    const frame = newItem(state, m, 'frame', { x: 200, y: 150 });
    expect(frame).toMatchObject({ kind: 'frame', title: 'New frame' });
    expect([frame.x, frame.y]).not.toEqual([-120, -60]);
    expect(itemAt({ ...state, items: [frame] }, { x: 70, y: 70 })).toBeUndefined();
  });
});
