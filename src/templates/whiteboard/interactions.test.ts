import { describe, expect, it } from 'vitest';

import { newItem } from './commands';
import { constrainViewport, fitRect, revealRect, toCanvas, toScreen, zoomAt, ZOOM_MAX } from './interactions';
import { boardBounds, connectorGeometry, itemAt, outlinePoint } from './layout';
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

  it('brings an off-screen rect into view, and leaves a visible one alone', () => {
    const view = { width: 800, height: 600 };
    const viewport = { x: 0, y: 0, zoom: 1 };
    expect(revealRect(viewport, { x: 100, y: 100, w: 160, h: 160 }, view)).toBe(viewport);
    expect(revealRect(viewport, { x: 100, y: -700, w: 160, h: 160 }, view)).toEqual({ x: 220, y: 920, zoom: 1 });
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

  it('finds what lies on top under a point', () => {
    expect(itemAt(state, { x: 50, y: 50 })?.id).toBe('a');
    expect(itemAt(state, { x: 50, y: 50 }, 'a')?.id).toBe('frame');
    expect(itemAt(state, { x: 900, y: 50 })).toBeUndefined();
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
