import { describe, expect, it } from 'vitest';

import { constrainViewport, fitRect, toCanvas, toScreen, zoomAt, ZOOM_MAX } from './interactions';
import { boardBounds, connectorGeometry, itemAt, outlinePoint } from './layout';
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
});
