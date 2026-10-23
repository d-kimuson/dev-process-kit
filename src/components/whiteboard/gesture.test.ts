import { describe, expect, it } from 'vitest';

import {
  finishGesture,
  marqueeRect,
  marqueeSelection,
  moveBy,
  panTo,
  previewState,
  startConnect,
  startGroundPress,
  startMarquee,
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

  it('keeps the proportions while asked, following whichever side the pointer pulls further', () => {
    const shape = parseWhiteboardBase({ items: [{ id: 's', kind: 'shape', x: 0, y: 0, w: 200, h: 100, text: '' }] });
    const pull = (to: { x: number; y: number }, keepRatio: boolean): unknown =>
      findItem(
        previewState(
          shape,
          updateGesture(shape, must(startResize(shape, 's', 1, { x: 200, y: 100 })), 1, to, 1, keepRatio),
        ),
        's',
      );
    expect(pull({ x: 300, y: 110 }, true)).toMatchObject({ w: 300, h: 150 });
    expect(pull({ x: 210, y: 250 }, true)).toMatchObject({ w: 500, h: 250 });
    expect(pull({ x: 300, y: 110 }, false)).toMatchObject({ w: 300, h: 110 });
    // Shrunk, the shorter side stops at the minimum and the other keeps the ratio.
    expect(pull({ x: 0, y: 0 }, true)).toMatchObject({ w: 48, h: 24 });
    // Let go of the key mid-drag and the corner is free again.
    const held = updateGesture(
      shape,
      must(startResize(shape, 's', 1, { x: 200, y: 100 })),
      1,
      { x: 300, y: 110 },
      1,
      true,
    );
    expect(finishGesture(shape, updateGesture(shape, held, 1, { x: 300, y: 110 }, 1, false))).toEqual({
      kind: 'dispatch',
      inputs: [{ type: 'RESIZE_ITEM', target: { type: 'item', id: 's' }, payload: { w: 300, h: 110 } }],
    });
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

  it('selects what a dragged-out area touches, adding to the selection when asked', () => {
    const drag = updateGesture(state, startMarquee(1, { x: 500, y: 0 }, []), 1, { x: 700, y: 60 }, 1);
    expect(marqueeRect(drag)).toEqual({ x: 500, y: 0, w: 200, h: 60 });
    expect(marqueeSelection(state, drag)).toEqual(['b']);
    expect(finishGesture(state, drag)).toEqual({ kind: 'select', ids: ['b'] });
    // Starting inside a frame and sweeping over a sticky picks the sticky, not the frame.
    const inside = updateGesture(state, startMarquee(1, { x: 10, y: 10 }, ['b']), 1, { x: 60, y: 60 }, 1);
    expect(finishGesture(state, inside)).toEqual({ kind: 'select', ids: ['b', 'a'] });
    // A press that never moves is a click on the canvas, or on the frame whose empty area it hit.
    expect(finishGesture(state, startMarquee(1, { x: 500, y: 0 }, []))).toEqual({ kind: 'click' });
    expect(finishGesture(state, startMarquee(1, { x: 300, y: 250 }, []))).toEqual({ kind: 'click', itemId: 'frame' });
  });

  it('moves every selected item together, frame contents once', () => {
    const drag = updateGesture(
      state,
      must(startMove(state, 'b', 1, { x: 610, y: 30 }, ['b', 'frame', 'a'])),
      1,
      { x: 620, y: 40 },
      1,
    );
    const outcome = finishGesture(state, drag);
    expect(
      outcome.kind === 'dispatch'
        ? outcome.inputs.map((input) => (typeof input.target === 'string' ? input.target : input.target.id))
        : [],
    ).toEqual(['b', 'frame', 'a']);
    expect(moveBy(state, ['a', 'b'], 0, 10).map((input) => input.payload)).toEqual([
      { x: 20, y: 30 },
      { x: 600, y: 30 },
    ]);
  });

  it('picks a selected frame up by its empty inside, and draws an area anywhere else', () => {
    // Selected: a press inside carries the frame and its contents, like a press on its title.
    const carry = startGroundPress(state, ['frame'], 1, { x: 300, y: 250 }, []);
    expect(carry).toMatchObject({ kind: 'move', itemId: 'frame' });
    const drag = updateGesture(state, carry, 1, { x: 310, y: 250 }, 1);
    const outcome = finishGesture(state, drag);
    expect(outcome.kind === 'dispatch' ? outcome.inputs.map((input) => input.payload) : []).toEqual([
      { x: 10, y: 0 },
      { x: 30, y: 20 },
    ]);
    // With others selected too, they all come along.
    expect(startGroundPress(state, ['b', 'frame'], 1, { x: 300, y: 250 }, [])).toMatchObject({
      kind: 'move',
      origins: [{ id: 'b' }, { id: 'frame' }, { id: 'a' }],
    });
    // Not selected, or outside it: a selection area (whose click then selects the frame).
    expect(startGroundPress(state, [], 1, { x: 300, y: 250 }, ['b'])).toMatchObject({ kind: 'marquee', base: ['b'] });
    expect(startGroundPress(state, ['frame'], 1, { x: 500, y: 250 }, [])).toMatchObject({ kind: 'marquee' });
  });
});
