/**
 * Stacking order: where selected items go when the reader brings them to the
 * front or sends them back. Pure: it reads the board and returns the
 * `REORDER_ITEM` actions that get there. Frames are always painted behind
 * everything else, so only the order among the other items matters, and every
 * anchor is one of those items.
 */
import type { ActionInput } from '../../core/types';
import type { WbItem, WhiteboardState } from './model';

import { whiteboardAction } from './actions';
import { overlaps } from './layout';

export const ARRANGE_DIRECTIONS = ['front', 'forward', 'backward', 'back'] as const;
export type ArrangeDirection = (typeof ARRANGE_DIRECTIONS)[number];

const stackOf = (state: WhiteboardState): readonly WbItem[] => state.items.filter((item) => item.kind !== 'frame');

/** Moves one step up (or down) past the nearest item it overlaps, else past its neighbor. */
const step = (stack: WbItem[], item: WbItem, selected: ReadonlySet<string>, up: boolean): WbItem[] => {
  const from = stack.indexOf(item);
  const others = (up ? stack.slice(from + 1) : stack.slice(0, from).reverse()).filter(
    (other) => !selected.has(other.id),
  );
  const past = others.find((other) => overlaps(item, other, 0)) ?? others[0];
  if (past === undefined) return stack;
  const rest = stack.filter((other) => other !== item);
  const at = rest.indexOf(past) + (up ? 1 : 0);
  return [...rest.slice(0, at), item, ...rest.slice(at)];
};

const targetStack = (
  stack: readonly WbItem[],
  selected: ReadonlySet<string>,
  direction: ArrangeDirection,
): readonly WbItem[] => {
  const picked = stack.filter((item) => selected.has(item.id));
  const others = stack.filter((item) => !selected.has(item.id));
  switch (direction) {
    case 'front':
      return [...others, ...picked];
    case 'back':
      return [...picked, ...others];
    case 'forward':
      // Topmost first, so a lower selected item never jumps over a higher one.
      return [...picked].reverse().reduce((order, item) => step(order, item, selected, true), [...stack]);
    case 'backward':
      return picked.reduce((order, item) => step(order, item, selected, false), [...stack]);
  }
};

/**
 * The `REORDER_ITEM`s that turn the current stack into `target`: each
 * moved item goes right after its new neighbor below, in target order, and an
 * item already sitting there is left alone.
 */
const reorderInputs = (
  stack: readonly WbItem[],
  target: readonly WbItem[],
  moved: ReadonlySet<string>,
): ActionInput[] => {
  let order = stack.map((item) => item.id);
  const inputs: ActionInput[] = [];
  target.forEach((item, index) => {
    if (!moved.has(item.id)) return;
    const after = target[index - 1]?.id ?? null;
    const at = order.indexOf(item.id);
    if ((order[at - 1] ?? null) === after) return;
    order = order.filter((id) => id !== item.id);
    order.splice(after === null ? 0 : order.indexOf(after) + 1, 0, item.id);
    inputs.push(whiteboardAction.reorder(item.id, after));
  });
  return inputs;
};

export const arrangeActions = (
  state: WhiteboardState,
  ids: readonly string[],
  direction: ArrangeDirection,
): readonly ActionInput[] => {
  const stack = stackOf(state);
  const selected = new Set(ids.filter((id) => stack.some((item) => item.id === id)));
  if (selected.size === 0) return [];
  return reorderInputs(stack, targetStack(stack, selected, direction), selected);
};

/**
 * The directions that change what the reader sees: a selected item ends up on
 * the other side of an item it overlaps. A move that only passes items it does
 * not touch would look like nothing happened, so it is not offered.
 */
export const arrangeOptions = (state: WhiteboardState, ids: readonly string[]): ReadonlySet<ArrangeDirection> => {
  const stack = stackOf(state);
  const selected = new Set(ids.filter((id) => stack.some((item) => item.id === id)));
  const pairs = stack.flatMap((item) =>
    selected.has(item.id)
      ? stack
          .filter((other) => !selected.has(other.id) && overlaps(item, other, 0))
          .map((other): readonly [WbItem, WbItem] => [item, other])
      : [],
  );
  const above = (order: readonly WbItem[], [item, other]: readonly [WbItem, WbItem]): boolean =>
    order.indexOf(item) > order.indexOf(other);
  return new Set(
    ARRANGE_DIRECTIONS.filter((direction) => {
      const target = targetStack(stack, selected, direction);
      return pairs.some((pair) => above(stack, pair) !== above(target, pair));
    }),
  );
};
