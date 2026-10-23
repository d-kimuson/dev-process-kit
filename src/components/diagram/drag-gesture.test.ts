import { describe, expect, it } from 'vitest';

import { beginGroupDrag, beginNodeDrag, IDLE_DRAG, updateDrag, type DragGesture } from './drag-gesture';

const target = {} as HTMLElement;
const THRESHOLD = 4;

describe('drag-gesture (pure state machine)', () => {
  it('starts idle', () => {
    expect(IDLE_DRAG).toEqual({ kind: 'idle' });
  });

  it('begins a node drag unmoved, with no preview yet', () => {
    const gesture = beginNodeDrag({
      id: 'a',
      pointerId: 1,
      target,
      start: { x: 10, y: 20 },
      origin: { screenX: 100, screenY: 100 },
    });
    expect(gesture).toMatchObject({ kind: 'node', id: 'a', moved: false, preview: null });
  });

  it('begins a group drag unmoved, with no preview yet', () => {
    const starts = new Map([
      ['a', { x: 10, y: 20 }],
      ['b', { x: 30, y: 40 }],
    ]);
    const gesture = beginGroupDrag({ key: 'g1', pointerId: 1, target, starts, origin: { screenX: 0, screenY: 0 } });
    expect(gesture).toMatchObject({ kind: 'group', key: 'g1', moved: false, preview: null });
  });

  it('leaves idle unchanged on an update', () => {
    expect(updateDrag(IDLE_DRAG, { screenX: 50, screenY: 50 }, 1, THRESHOLD)).toBe(IDLE_DRAG);
  });

  it('ignores movement within the threshold: still unmoved, no preview', () => {
    const start = beginNodeDrag({
      id: 'a',
      pointerId: 1,
      target,
      start: { x: 10, y: 20 },
      origin: { screenX: 100, screenY: 100 },
    });
    const next = updateDrag(start, { screenX: 102, screenY: 101 }, 1, THRESHOLD);
    expect(next).toMatchObject({ moved: false, preview: null });
  });

  it('becomes moved once past the threshold and computes the node preview at scale 1', () => {
    const start = beginNodeDrag({
      id: 'a',
      pointerId: 1,
      target,
      start: { x: 10, y: 20 },
      origin: { screenX: 100, screenY: 100 },
    });
    const next = updateDrag(start, { screenX: 130, screenY: 150 }, 1, THRESHOLD);
    expect(next).toMatchObject({ kind: 'node', moved: true, preview: { x: 40, y: 70 } });
  });

  it('divides the screen delta by the viewport scale', () => {
    const start = beginNodeDrag({
      id: 'a',
      pointerId: 1,
      target,
      start: { x: 10, y: 20 },
      origin: { screenX: 100, screenY: 100 },
    });
    const next = updateDrag(start, { screenX: 200, screenY: 100 }, 2, THRESHOLD);
    expect(next).toMatchObject({ kind: 'node', moved: true, preview: { x: 60, y: 20 } });
  });

  it('clamps the node preview at zero on each axis', () => {
    const start = beginNodeDrag({
      id: 'a',
      pointerId: 1,
      target,
      start: { x: 5, y: 5 },
      origin: { screenX: 100, screenY: 100 },
    });
    const next = updateDrag(start, { screenX: 0, screenY: 0 }, 1, THRESHOLD);
    expect(next).toMatchObject({ kind: 'node', preview: { x: 0, y: 0 } });
  });

  it('moves every id in a group preview by the same delta, independent of their individual starts', () => {
    const starts = new Map([
      ['a', { x: 10, y: 20 }],
      ['b', { x: 110, y: 220 }],
    ]);
    const start = beginGroupDrag({ key: 'g1', pointerId: 1, target, starts, origin: { screenX: 0, screenY: 0 } });
    const next = updateDrag(start, { screenX: 10, screenY: 10 }, 1, THRESHOLD) as DragGesture & { kind: 'group' };
    expect(next.moved).toBe(true);
    expect(next.preview?.get('a')).toEqual({ x: 20, y: 30 });
    expect(next.preview?.get('b')).toEqual({ x: 120, y: 230 });
  });

  it('once moved, keeps producing a fresh preview on every further update, even back within the threshold distance of origin', () => {
    const start = beginNodeDrag({
      id: 'a',
      pointerId: 1,
      target,
      start: { x: 10, y: 20 },
      origin: { screenX: 100, screenY: 100 },
    });
    const moved = updateDrag(start, { screenX: 130, screenY: 150 }, 1, THRESHOLD);
    const backNearOrigin = updateDrag(moved, { screenX: 101, screenY: 101 }, 1, THRESHOLD);
    expect(backNearOrigin).toMatchObject({ kind: 'node', moved: true, preview: { x: 11, y: 21 } });
  });
});
