/**
 * A pointer gesture in flight on the board, and what it amounts to when the
 * pointer is released. Pure: the element feeds canvas points in and dispatches
 * the outcome. Nothing reaches the draft until the pointer is released, so a
 * drag is one action per item, not one per pointer move.
 */
import type { ActionInput } from '../../core/types';

import { whiteboardAction } from './actions';
import { itemAt, type Point } from './layout';
import { findItem, frameMembers, MIN_ITEM_SIZE, type WhiteboardState } from './model';

/** Screen pixels a press may wander before it counts as a drag instead of a click. */
export const DRAG_THRESHOLD = 4;

type Origin = { readonly id: string; readonly x: number; readonly y: number };

export type WbGesture =
  /** Dragging empty canvas: the view follows the pointer (screen points). */
  | {
      readonly kind: 'pan';
      readonly pointerId: number;
      readonly start: Point;
      readonly last: Point;
      readonly moved: boolean;
    }
  /** Carrying an item, and everything inside it when it is a frame. */
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

/** Picks up an item; a frame brings along whatever lies inside it. */
export const startMove = (
  state: WhiteboardState,
  itemId: string,
  pointerId: number,
  at: Point,
): WbGesture | undefined => {
  const item = findItem(state, itemId);
  if (item === undefined) return undefined;
  const carried = item.kind === 'frame' ? [item, ...frameMembers(state, item)] : [item];
  return {
    kind: 'move',
    pointerId,
    itemId,
    origins: carried.map(({ id, x, y }) => ({ id, x, y })),
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
  return { kind: 'resize', pointerId, itemId, origin: { w: item.w, h: item.h }, start: at, current: at, moved: false };
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

export const startConnect = (fromId: string, pointerId: number, at: Point): WbGesture => ({
  kind: 'connect',
  pointerId,
  fromId,
  start: at,
  current: at,
  moved: false,
});

/** Follows the pointer to the canvas point `at`; `zoom` turns the drag threshold into canvas units. */
export const updateGesture = (
  state: WhiteboardState,
  gesture: WbGesture,
  pointerId: number,
  at: Point,
  zoom: number,
): WbGesture => {
  if (gesture.pointerId !== pointerId) return gesture;
  switch (gesture.kind) {
    case 'pan':
      return gesture;
    case 'move':
    case 'resize': {
      const moved = gesture.moved || Math.hypot(at.x - gesture.start.x, at.y - gesture.start.y) * zoom > DRAG_THRESHOLD;
      return { ...gesture, current: at, moved };
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

const resizedSize = (gesture: Extract<WbGesture, { kind: 'resize' }>): { w: number; h: number } => ({
  w: Math.max(MIN_ITEM_SIZE, snap(gesture.origin.w + gesture.current.x - gesture.start.x)),
  h: Math.max(MIN_ITEM_SIZE, snap(gesture.origin.h + gesture.current.y - gesture.start.y)),
});

export type GestureOutcome =
  | { readonly kind: 'none' }
  /** The press never became a drag: a click on the item (or on the canvas). */
  | { readonly kind: 'click'; readonly itemId?: string }
  | { readonly kind: 'dispatch'; readonly inputs: readonly ActionInput[] }
  | { readonly kind: 'connect'; readonly from: string; readonly to: string };

/** What a released gesture asks for. */
export const finishGesture = (state: WhiteboardState, gesture: WbGesture): GestureOutcome => {
  switch (gesture.kind) {
    case 'pan':
      return gesture.moved ? { kind: 'none' } : { kind: 'click' };
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
