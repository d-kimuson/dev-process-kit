/**
 * A pointer gesture in flight on the board, and what it amounts to when the
 * pointer is released. Pure: the element feeds canvas points in and dispatches
 * the outcome. Nothing reaches the draft until the pointer is released, so a
 * drag is one action per item, not one per pointer move.
 */
import type { ActionInput } from '../../core/types';

import { whiteboardAction } from './actions';
import { framesAt, itemAt, itemsInRect, rectBetween, type Point, type Rect } from './layout';
import { findItem, frameMembers, MIN_ITEM_SIZE, type WbItem, type WhiteboardState } from './model';

/** Screen pixels a press may wander before it counts as a drag instead of a click. */
export const DRAG_THRESHOLD = 4;

type Origin = { readonly id: string; readonly x: number; readonly y: number };

export type WbGesture =
  /** Space-drag, middle-button drag or a touch on empty canvas: the view follows the pointer (screen points). */
  | {
      readonly kind: 'pan';
      readonly pointerId: number;
      readonly start: Point;
      readonly last: Point;
      readonly moved: boolean;
    }
  /** Dragging out a selection area over empty canvas; `base` is what stays selected besides (shift). */
  | {
      readonly kind: 'marquee';
      readonly pointerId: number;
      readonly base: readonly string[];
      readonly start: Point;
      readonly current: Point;
      readonly moved: boolean;
    }
  /** Carrying the selected items, and everything inside the frames among them. */
  | {
      readonly kind: 'move';
      readonly pointerId: number;
      readonly itemId: string;
      readonly origins: readonly Origin[];
      readonly start: Point;
      readonly current: Point;
      readonly moved: boolean;
    }
  /** Pulling an item's bottom-right corner. */
  | {
      readonly kind: 'resize';
      readonly pointerId: number;
      readonly itemId: string;
      readonly origin: { readonly w: number; readonly h: number };
      readonly start: Point;
      readonly current: Point;
      readonly moved: boolean;
      /** Shift held: the item keeps its proportions. */
      readonly keepRatio: boolean;
    }
  /** Drawing a connector out of an item's handle. */
  | {
      readonly kind: 'connect';
      readonly pointerId: number;
      readonly fromId: string;
      readonly start: Point;
      readonly current: Point;
      readonly targetId?: string;
      readonly moved: boolean;
    };

/**
 * Picks up `itemId` together with the rest of `carry` (the selection it
 * belongs to); a frame brings along whatever lies inside it, and nothing is
 * carried twice.
 */
export const startMove = (
  state: WhiteboardState,
  itemId: string,
  pointerId: number,
  at: Point,
  carry: readonly string[] = [itemId],
): WbGesture | undefined => {
  if (findItem(state, itemId) === undefined) return undefined;
  const carried = new Map<string, WbItem>();
  for (const id of carry.includes(itemId) ? carry : [itemId, ...carry]) {
    const item = findItem(state, id);
    if (item === undefined) continue;
    for (const one of item.kind === 'frame' ? [item, ...frameMembers(state, item)] : [item]) carried.set(one.id, one);
  }
  return {
    kind: 'move',
    pointerId,
    itemId,
    origins: [...carried.values()].map(({ id, x, y }) => ({ id, x, y })),
    start: at,
    current: at,
    moved: false,
  };
};

export const startResize = (
  state: WhiteboardState,
  itemId: string,
  pointerId: number,
  at: Point,
): WbGesture | undefined => {
  const item = findItem(state, itemId);
  if (item === undefined) return undefined;
  return {
    kind: 'resize',
    pointerId,
    itemId,
    origin: { w: item.w, h: item.h },
    start: at,
    current: at,
    moved: false,
    keepRatio: false,
  };
};

export const startPan = (pointerId: number, at: Point): WbGesture => ({
  kind: 'pan',
  pointerId,
  start: at,
  last: at,
  moved: false,
});

/** A pan step to the screen point `at`: the gesture that follows, and how far the view moves. */
export const panTo = (
  gesture: Extract<WbGesture, { kind: 'pan' }>,
  at: Point,
): { readonly gesture: WbGesture; readonly dx: number; readonly dy: number } => ({
  gesture: {
    ...gesture,
    last: at,
    moved: gesture.moved || Math.hypot(at.x - gesture.start.x, at.y - gesture.start.y) > DRAG_THRESHOLD,
  },
  dx: at.x - gesture.last.x,
  dy: at.y - gesture.last.y,
});

export const startMarquee = (pointerId: number, at: Point, base: readonly string[]): WbGesture => ({
  kind: 'marquee',
  pointerId,
  base,
  start: at,
  current: at,
  moved: false,
});

/**
 * A press on open ground (items catch their own, so this is empty canvas or a
 * frame's empty inside). Inside a selected frame it picks the selection up, as
 * a press on the frame's title would; anywhere else it starts a selection area
 * that keeps `base`.
 */
export const startGroundPress = (
  state: WhiteboardState,
  selected: readonly string[],
  pointerId: number,
  at: Point,
  base: readonly string[],
): WbGesture => {
  const frame = framesAt(state, at).find((item) => selected.includes(item.id));
  const carry = frame === undefined ? undefined : startMove(state, frame.id, pointerId, at, selected);
  return carry ?? startMarquee(pointerId, at, base);
};

/** The selection area of a marquee that has started to move. */
export const marqueeRect = (gesture: WbGesture | undefined): Rect | undefined =>
  gesture?.kind === 'marquee' && gesture.moved ? rectBetween(gesture.start, gesture.current) : undefined;

/** What a marquee selects so far: what it started with, then what its area picks. */
export const marqueeSelection = (state: WhiteboardState, gesture: WbGesture): readonly string[] => {
  const rect = marqueeRect(gesture);
  if (gesture.kind !== 'marquee' || rect === undefined) return [];
  const picked = itemsInRect(state, rect).map((item) => item.id);
  return [...new Set([...gesture.base, ...picked])];
};

export const startConnect = (fromId: string, pointerId: number, at: Point): WbGesture => ({
  kind: 'connect',
  pointerId,
  fromId,
  start: at,
  current: at,
  moved: false,
});

/**
 * Follows the pointer to the canvas point `at`; `zoom` turns the drag
 * threshold into canvas units. `keepRatio` (Shift held) makes a resize keep
 * the item's proportions.
 */
export const updateGesture = (
  state: WhiteboardState,
  gesture: WbGesture,
  pointerId: number,
  at: Point,
  zoom: number,
  keepRatio = false,
): WbGesture => {
  if (gesture.pointerId !== pointerId) return gesture;
  switch (gesture.kind) {
    case 'pan':
      return gesture;
    case 'marquee':
    case 'move': {
      const moved = gesture.moved || Math.hypot(at.x - gesture.start.x, at.y - gesture.start.y) * zoom > DRAG_THRESHOLD;
      return { ...gesture, current: at, moved };
    }
    case 'resize': {
      const moved = gesture.moved || Math.hypot(at.x - gesture.start.x, at.y - gesture.start.y) * zoom > DRAG_THRESHOLD;
      return { ...gesture, current: at, moved, keepRatio };
    }
    case 'connect': {
      const moved = gesture.moved || Math.hypot(at.x - gesture.start.x, at.y - gesture.start.y) * zoom > DRAG_THRESHOLD;
      const target = itemAt(state, at, gesture.fromId);
      const { targetId: _previous, ...rest } = gesture;
      return target === undefined
        ? { ...rest, current: at, moved }
        : { ...rest, current: at, moved, targetId: target.id };
    }
  }
};

const snap = (value: number): number => Math.round(value);

/** The board as the reader sees it mid-gesture: carried items follow the pointer, a pulled corner grows. */
export const previewState = (state: WhiteboardState, gesture: WbGesture | undefined): WhiteboardState => {
  if (gesture === undefined || !gesture.moved) return state;
  if (gesture.kind === 'move') {
    const dx = gesture.current.x - gesture.start.x;
    const dy = gesture.current.y - gesture.start.y;
    const origins = new Map(gesture.origins.map((origin) => [origin.id, origin]));
    return {
      ...state,
      items: state.items.map((item) => {
        const origin = origins.get(item.id);
        return origin === undefined ? item : { ...item, x: snap(origin.x + dx), y: snap(origin.y + dy) };
      }),
    };
  }
  if (gesture.kind === 'resize') {
    const size = resizedSize(gesture);
    return {
      ...state,
      items: state.items.map((item) => (item.id === gesture.itemId ? { ...item, ...size } : item)),
    };
  }
  return state;
};

/**
 * The size the pulled corner gives. Keeping the ratio, the side pulled further
 * (relative to its length) leads, and the shorter side stops at the minimum.
 */
const resizedSize = (gesture: Extract<WbGesture, { kind: 'resize' }>): { w: number; h: number } => {
  const { origin } = gesture;
  const w = origin.w + gesture.current.x - gesture.start.x;
  const h = origin.h + gesture.current.y - gesture.start.y;
  if (!gesture.keepRatio) return { w: Math.max(MIN_ITEM_SIZE, snap(w)), h: Math.max(MIN_ITEM_SIZE, snap(h)) };
  const scale = Math.max(w / origin.w, h / origin.h, MIN_ITEM_SIZE / Math.min(origin.w, origin.h));
  return { w: snap(origin.w * scale), h: snap(origin.h * scale) };
};

/** A keyboard nudge: the same moves a drag of the selection by `(dx, dy)` would dispatch, frame contents included. */
export const moveBy = (
  state: WhiteboardState,
  itemIds: readonly string[],
  dx: number,
  dy: number,
): readonly ActionInput[] => {
  const [first] = itemIds;
  if (first === undefined) return [];
  const picked = startMove(state, first, 0, { x: 0, y: 0 }, itemIds);
  if (picked?.kind !== 'move') return [];
  const outcome = finishGesture(state, { ...picked, current: { x: dx, y: dy }, moved: true });
  return outcome.kind === 'dispatch' ? outcome.inputs : [];
};

export type GestureOutcome =
  | { readonly kind: 'none' }
  /** The press never became a drag: a click on the item (or on the canvas). */
  | { readonly kind: 'click'; readonly itemId?: string }
  /** A marquee was dragged out: these items are the selection now. */
  | { readonly kind: 'select'; readonly ids: readonly string[] }
  | { readonly kind: 'dispatch'; readonly inputs: readonly ActionInput[] }
  | { readonly kind: 'connect'; readonly from: string; readonly to: string };

/** What a released gesture asks for. */
export const finishGesture = (state: WhiteboardState, gesture: WbGesture): GestureOutcome => {
  switch (gesture.kind) {
    case 'pan':
      return gesture.moved ? { kind: 'none' } : { kind: 'click' };
    case 'marquee': {
      if (gesture.moved) return { kind: 'select', ids: marqueeSelection(state, gesture) };
      // Items catch their own presses, so only a frame's empty area can lie under this one.
      const frame = itemAt(state, gesture.start);
      return frame === undefined ? { kind: 'click' } : { kind: 'click', itemId: frame.id };
    }
    case 'move': {
      if (!gesture.moved) return { kind: 'click', itemId: gesture.itemId };
      const preview = previewState(state, gesture);
      const inputs = gesture.origins.flatMap((origin) => {
        const item = findItem(preview, origin.id);
        if (item === undefined || (item.x === origin.x && item.y === origin.y)) return [];
        return [whiteboardAction.move(origin.id, item.x, item.y)];
      });
      return inputs.length === 0 ? { kind: 'none' } : { kind: 'dispatch', inputs };
    }
    case 'resize': {
      if (!gesture.moved) return { kind: 'click', itemId: gesture.itemId };
      const size = resizedSize(gesture);
      if (size.w === gesture.origin.w && size.h === gesture.origin.h) return { kind: 'none' };
      return { kind: 'dispatch', inputs: [whiteboardAction.resize(gesture.itemId, size.w, size.h)] };
    }
    case 'connect':
      if (!gesture.moved) return { kind: 'click', itemId: gesture.fromId };
      return gesture.targetId === undefined
        ? { kind: 'none' }
        : { kind: 'connect', from: gesture.fromId, to: gesture.targetId };
  }
};
