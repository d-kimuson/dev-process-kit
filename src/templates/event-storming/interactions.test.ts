import { describe, expect, it } from 'vitest';

import {
  ZOOM_MAX,
  ZOOM_MIN,
  constrainViewport,
  dropSide,
  fitViewport,
  hitRect,
  panBy,
  rectsInBand,
  sliceMovePlan,
  sliceMoveSteps,
  zoomAt,
  type Rect,
} from './interactions';

const rect = (left: number, top: number, width: number, height: number): Rect => ({ left, top, width, height });

describe('event-storming viewport', () => {
  it('panBy shifts the pan offsets, leaving zoom alone', () => {
    expect(panBy({ panX: 10, panY: -5, zoom: 1.5 }, 30, 20)).toEqual({ panX: 40, panY: 15, zoom: 1.5 });
  });

  it('zoomAt keeps the world point under the cursor fixed', () => {
    const vp = { panX: 100, panY: 50, zoom: 1 };
    const next = zoomAt(vp, 300, 250, 2);
    expect(next.zoom).toBe(2);
    // world point under (300, 250) was (200, 200); it must still map there.
    expect(next.panX + 200 * next.zoom).toBe(300);
    expect(next.panY + 200 * next.zoom).toBe(250);
  });

  it('zoomAt clamps to the zoom range', () => {
    expect(zoomAt({ panX: 0, panY: 0, zoom: 1 }, 0, 0, 100).zoom).toBe(ZOOM_MAX);
    expect(zoomAt({ panX: 0, panY: 0, zoom: 1 }, 0, 0, 0.001).zoom).toBe(ZOOM_MIN);
  });

  it('zoomAt at the cursor origin only scales', () => {
    expect(zoomAt({ panX: 0, panY: 0, zoom: 1 }, 0, 0, 1.5)).toEqual({ panX: 0, panY: 0, zoom: 1.5 });
  });

  it('fitViewport centers content that fits, without zooming past 100%', () => {
    const vp = fitViewport({ width: 400, height: 300 }, { width: 1000, height: 700 }, 40);
    expect(vp.zoom).toBe(1);
    expect(vp.panX).toBe(300);
    expect(vp.panY).toBe(200);
  });

  it('fitViewport shrinks oversized content to the padded view', () => {
    const vp = fitViewport({ width: 2000, height: 500 }, { width: 1040, height: 700 }, 20);
    expect(vp.zoom).toBe(0.5);
    expect(vp.panX).toBe(20);
    expect(vp.panY).toBe(225);
  });

  it('constrainViewport centers content that is smaller than the view', () => {
    const vp = constrainViewport(
      { panX: 999, panY: -999, zoom: 1 },
      { width: 200, height: 100 },
      { width: 800, height: 600 },
      0,
    );
    expect(vp).toEqual({ panX: 300, panY: 250, zoom: 1 });
  });

  it('constrainViewport stops the pan at the content edges, plus its buffer', () => {
    const content = { width: 1000, height: 800 };
    const view = { width: 500, height: 400 };
    expect(constrainViewport({ panX: 9999, panY: 9999, zoom: 1 }, content, view, 0)).toEqual({
      panX: 0,
      panY: 0,
      zoom: 1,
    });
    expect(constrainViewport({ panX: -9999, panY: -9999, zoom: 1 }, content, view, 0)).toEqual({
      panX: -500,
      panY: -400,
      zoom: 1,
    });
    expect(constrainViewport({ panX: 9999, panY: 9999, zoom: 1 }, content, view, 64)).toEqual({
      panX: 64,
      panY: 64,
      zoom: 1,
    });
  });

  it('constrainViewport scales the limits with the zoom', () => {
    const vp = constrainViewport(
      { panX: -9999, panY: -9999, zoom: 0.5 },
      { width: 2000, height: 1600 },
      { width: 500, height: 400 },
      0,
    );
    expect(vp).toEqual({ panX: -500, panY: -400, zoom: 0.5 });
  });
});

describe('event-storming hit testing', () => {
  const rects = [
    { id: 'a', rect: rect(0, 0, 100, 50) },
    { id: 'b', rect: rect(80, 0, 100, 50) },
  ];

  it('hitRect finds the containing rect, later (topmost) entries winning', () => {
    expect(hitRect(rects, 10, 10)).toBe('a');
    expect(hitRect(rects, 90, 10)).toBe('b');
    expect(hitRect(rects, 300, 10)).toBeUndefined();
  });

  it('dropSide splits a rect at its horizontal middle', () => {
    expect(dropSide(rect(100, 0, 200, 50), 150)).toBe('before');
    expect(dropSide(rect(100, 0, 200, 50), 250)).toBe('after');
  });

  it('rectsInBand collects the ids intersecting a selection rectangle', () => {
    expect(rectsInBand(rects, rect(70, 10, 30, 10))).toEqual(['a', 'b']);
    expect(rectsInBand(rects, rect(150, 10, 10, 10))).toEqual(['b']);
    expect(rectsInBand(rects, rect(0, 100, 500, 50))).toEqual([]);
  });
});

describe('event-storming slice move plan', () => {
  it('moves every member before the target, chained in order', () => {
    expect(sliceMovePlan(['a1', 'b1', 'b2'], ['b1', 'b2'], ['a1'], 'before')).toEqual([
      { id: 'b1', after: null },
      { id: 'b2', after: 'b1' },
    ]);
  });

  it('moves every member after the target block', () => {
    expect(sliceMovePlan(['a1', 'a2', 'b1'], ['a1', 'a2'], ['b1'], 'after')).toEqual([
      { id: 'a1', after: 'b1' },
      { id: 'a2', after: 'a1' },
    ]);
  });

  it('anchors before a target that has elements ahead of it', () => {
    expect(sliceMovePlan(['a1', 'b1', 'c1'], ['c1'], ['b1'], 'before')).toEqual([{ id: 'c1', after: 'a1' }]);
  });

  it('dropping a slice onto itself is a no-op', () => {
    expect(sliceMovePlan(['a1', 'b1'], ['a1'], ['a1'], 'before')).toEqual([]);
  });

  it('unknown targets are a no-op', () => {
    expect(sliceMovePlan(['a1', 'b1'], ['a1'], ['zz'], 'before')).toEqual([]);
  });
});

describe('event-storming connect reorder', () => {
  it('pulls a forward target right behind its source', () => {
    expect(sliceMoveSteps(['a1', 'b1', 'c1'], ['c1'], ['a1'], 'after')).toEqual([{ id: 'c1', after: 'a1' }]);
  });

  it('a target already behind its source records no draft actions', () => {
    expect(sliceMoveSteps(['a1', 'b1'], ['b1'], ['a1'], 'after')).toEqual([]);
  });
});
