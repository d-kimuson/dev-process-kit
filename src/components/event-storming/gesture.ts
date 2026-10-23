import type { EsGesture, Point } from './ui-mode';

import { dropSide, hitRect, type IdRect } from './interactions';

export const moveGesture = (
  gesture: EsGesture,
  input: { readonly pointerId: number; readonly point: Point },
  rects: readonly IdRect[],
  threshold = 4,
): EsGesture => {
  if (input.pointerId !== gesture.pointerId) return gesture;
  const { point } = input;
  const common = {
    pointerId: gesture.pointerId,
    start: gesture.start,
    current: point,
    moved: gesture.moved || Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) > threshold,
  };
  const hit = hitRect(rects, point.x, point.y);
  switch (gesture.kind) {
    case 'connect':
      return {
        ...common,
        kind: 'connect',
        fromSliceId: gesture.fromSliceId,
        ...(hit !== undefined && hit !== gesture.fromSliceId ? { targetSliceId: hit } : {}),
      };
    case 'move-slice': {
      const rect = rects.find((entry) => entry.id === hit)?.rect;
      return {
        ...common,
        kind: 'move-slice',
        sliceId: gesture.sliceId,
        ...(hit !== undefined && hit !== gesture.sliceId && rect !== undefined
          ? { drop: { sliceId: hit, side: dropSide(rect, point.x) } }
          : {}),
      };
    }
    case 'select':
      return { ...common, kind: 'select' };
  }
};
