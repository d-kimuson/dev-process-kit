import { describe, expect, it } from 'vitest';

import {
  finishGesture,
  panTo,
  previewState,
  startConnect,
  startMove,
  startPan,
  startResize,
  updateGesture,
  type WbGesture,
} from './gesture';
import { findItem, parseWhiteboardBase } from './model';

const state = parseWhiteboardBase({
  items: [
    { id: 'frame', kind: 'frame', x: 0, y: 0, w: 400, h: 300, title: 'Ideas' },
    { id: 'a', kind: 'sticky', x: 20, y: 20, text: 'A' },
    { id: 'b', kind: 'sticky', x: 600, y: 20, text: 'B' },
  ],
});

const must = (gesture: WbGesture | undefined): WbGesture => {
  if (gesture === undefined) throw new Error('expected a gesture');
  return gesture;
};

describe('whiteboard gestures', () => {
  it('treats a press that barely moves as a click', () => {
    const press = updateGesture(state, must(startMove(state, 'a', 1, { x: 30, y: 30 })), 1, { x: 31, y: 31 }, 1);
    expect(finishGesture(state, press)).toEqual({ kind: 'click', itemId: 'a' });
    // At 25% zoom the same canvas distance is a quarter of the screen distance.
    const far = updateGesture(state, must(startMove(state, 'a', 1, { x: 30, y: 30 })), 1, { x: 40, y: 30 }, 0.25);
    expect(far.moved).toBe(false);
  });

  it('drags a sticky by the pointer delta, snapped to whole units', () => {
    const drag = updateGesture(state, must(startMove(state, 'a', 1, { x: 30, y: 30 })), 1, { x: 130.4, y: 80.6 }, 1);
    expect(findItem(previewState(state, drag), 'a')).toMatchObject({ x: 120, y: 71 });
    expect(finishGesture(state, drag)).toEqual({
      kind: 'dispatch',
      inputs: [{ type: 'MOVE_ITEM', target: { type: 'item', id: 'a' }, payload: { x: 120, y: 71 } }],
    });
  });

  it('carries the contents of a frame along with it', () => {
    const drag = updateGesture(state, must(startMove(state, 'frame', 1, { x: 10, y: 10 })), 1, { x: 60, y: 10 }, 1);
    const outcome = finishGesture(state, drag);
    expect(outcome.kind === 'dispatch' ? outcome.inputs.map((input) => input.payload) : []).toEqual([
      { x: 50, y: 0 },
      { x: 70, y: 20 },
    ]);
  });

  it('ignores another pointer', () => {
    const drag = must(startMove(state, 'a', 1, { x: 30, y: 30 }));
    expect(updateGesture(state, drag, 2, { x: 300, y: 300 }, 1)).toBe(drag);
  });

  it('resizes from the corner, never below the minimum', () => {
    const grow = updateGesture(state, must(startResize(state, 'a', 1, { x: 180, y: 180 })), 1, { x: 220, y: 200 }, 1);
    expect(finishGesture(state, grow)).toEqual({
      kind: 'dispatch',
      inputs: [{ type: 'RESIZE_ITEM', target: { type: 'item', id: 'a' }, payload: { w: 200, h: 180 } }],
    });
    const shrink = updateGesture(state, must(startResize(state, 'a', 1, { x: 180, y: 180 })), 1, { x: 0, y: 0 }, 1);
    expect(findItem(previewState(state, shrink), 'a')).toMatchObject({ w: 24, h: 24 });
  });

  it('connects to the item the pointer is released over, and to nothing on empty canvas', () => {
    const over = updateGesture(state, startConnect('a', 1, { x: 180, y: 100 }), 1, { x: 650, y: 60 }, 1);
    expect(finishGesture(state, over)).toEqual({ kind: 'connect', from: 'a', to: 'b' });
    const empty = updateGesture(state, startConnect('a', 1, { x: 180, y: 100 }), 1, { x: 2000, y: 2000 }, 1);
    expect(finishGesture(state, empty)).toEqual({ kind: 'none' });
    // Released over the frame the sticky sits in: the frame is the target.
    const frame = updateGesture(state, startConnect('a', 1, { x: 180, y: 100 }), 1, { x: 300, y: 250 }, 1);
    expect(finishGesture(state, frame)).toEqual({ kind: 'connect', from: 'a', to: 'frame' });
  });

  it('pans by the screen delta and clicks when it never moved', () => {
    const pan = startPan(1, { x: 10, y: 10 });
    if (pan.kind !== 'pan') throw new Error('expected a pan');
    const step = panTo(pan, { x: 40, y: 0 });
    expect([step.dx, step.dy, step.gesture.moved]).toEqual([30, -10, true]);
    expect(finishGesture(state, pan)).toEqual({ kind: 'click' });
    expect(finishGesture(state, step.gesture)).toEqual({ kind: 'none' });
  });
});
