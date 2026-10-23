import { describe, expect, it } from 'vitest';

import type { EsGesture } from './ui-mode';

import { moveGesture } from './gesture';

const rects = [{ id: 'b', rect: { left: 20, top: 0, width: 20, height: 20 } }];
describe('pointer gesture transitions', () => {
  it.each(['connect', 'move-slice'] as const)('clears the previous %s target when leaving it', (kind) => {
    const initial: EsGesture =
      kind === 'connect'
        ? { kind, pointerId: 1, fromSliceId: 'a', start: { x: 0, y: 0 }, current: { x: 0, y: 0 }, moved: false }
        : { kind, pointerId: 1, sliceId: 'a', start: { x: 0, y: 0 }, current: { x: 0, y: 0 }, moved: false };
    const over = moveGesture(initial, { pointerId: 1, point: { x: 25, y: 10 } }, rects);
    expect(over.kind === 'connect' ? over.targetSliceId : over.kind === 'move-slice' ? over.drop : null).toBeDefined();
    const away = moveGesture(over, { pointerId: 1, point: { x: 100, y: 100 } }, rects);
    expect(
      away.kind === 'connect' ? away.targetSliceId : away.kind === 'move-slice' ? away.drop : null,
    ).toBeUndefined();
    expect(moveGesture(over, { pointerId: 2, point: { x: 100, y: 100 } }, rects)).toBe(over);
  });
});
