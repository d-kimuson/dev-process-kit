import type { LayoutPoint } from '../../lib/layout/layered';

/** A screen-space point a gesture is measured from or against. */
export type GesturePoint = {
  readonly screenX: number;
  readonly screenY: number;
};

/**
 * The lifecycle of a whole-node or whole-group drag, as one discriminated
 * union instead of parallel ad-hoc fields: a gesture is either not happening,
 * or it is happening for exactly one `kind`, carrying exactly the data that
 * kind needs. `pointerId` identifies the single pointer allowed to drive it
 * (the one that started it); every other pointer's events are ignored.
 */
export type DragGesture =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'node';
      readonly id: string;
      readonly pointerId: number;
      readonly target: HTMLElement;
      readonly start: LayoutPoint;
      readonly origin: GesturePoint;
      /** `true` once the press has wandered past the threshold: a drag, not a click. */
      readonly moved: boolean;
      readonly preview: LayoutPoint | null;
    }
  | {
      readonly kind: 'group';
      readonly key: string;
      readonly pointerId: number;
      readonly target: HTMLElement;
      readonly starts: ReadonlyMap<string, LayoutPoint>;
      readonly origin: GesturePoint;
      readonly moved: boolean;
      readonly preview: ReadonlyMap<string, LayoutPoint> | null;
    };

export const IDLE_DRAG: DragGesture = { kind: 'idle' };

/** Begins a whole-node drag; the caller still owns wiring the DOM (listeners, pointer capture). */
export const beginNodeDrag = (args: {
  readonly id: string;
  readonly pointerId: number;
  readonly target: HTMLElement;
  readonly start: LayoutPoint;
  readonly origin: GesturePoint;
}): DragGesture => ({ kind: 'node', ...args, moved: false, preview: null });

/** Begins a whole-group drag; the caller still owns wiring the DOM (listeners, pointer capture). */
export const beginGroupDrag = (args: {
  readonly key: string;
  readonly pointerId: number;
  readonly target: HTMLElement;
  readonly starts: ReadonlyMap<string, LayoutPoint>;
  readonly origin: GesturePoint;
}): DragGesture => ({ kind: 'group', ...args, moved: false, preview: null });

/**
 * Folds one `pointermove` into a gesture: below the threshold it is a no-op
 * (still a possible click), past it the gesture becomes `moved` and carries a
 * fresh preview of where every dragged id would land. `idle` is returned
 * unchanged — there is nothing to update.
 */
export const updateDrag = (
  gesture: DragGesture,
  point: GesturePoint,
  scale: number,
  thresholdPx: number,
): DragGesture => {
  if (gesture.kind === 'idle') return gesture;
  const screenDx = point.screenX - gesture.origin.screenX;
  const screenDy = point.screenY - gesture.origin.screenY;
  if (!gesture.moved && Math.hypot(screenDx, screenDy) <= thresholdPx) return gesture;
  const dx = screenDx / scale;
  const dy = screenDy / scale;
  if (gesture.kind === 'node') {
    const preview: LayoutPoint = { x: Math.max(0, gesture.start.x + dx), y: Math.max(0, gesture.start.y + dy) };
    return { ...gesture, moved: true, preview };
  }
  const preview = new Map<string, LayoutPoint>();
  for (const [id, start] of gesture.starts)
    preview.set(id, { x: Math.max(0, start.x + dx), y: Math.max(0, start.y + dy) });
  return { ...gesture, moved: true, preview };
};
