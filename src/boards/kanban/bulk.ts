import type { ElementActionRequest } from '../base/model';

import { ADD_CARD_TAG, allCards, MOVE_CARD, REMOVE_CARD_TAG, type KanbanData } from './model';

/**
 * The cards picked for one bulk action, and what that action records: the
 * ids are in the order the reader picked them; the actions follow the board's
 * order, so cards moved together keep their order in the new column.
 */

/** Adds the card to the picked cards, or takes it out when it is already among them. */
export const toggleCard = (picked: readonly string[], id: string): readonly string[] =>
  picked.includes(id) ? picked.filter((item) => item !== id) : [...picked, id];

/** The cards from `anchor` to `target` in `order`, both included; just `target` when the anchor is not in `order`. */
export const cardRange = (order: readonly string[], anchor: string, target: string): readonly string[] => {
  const from = order.indexOf(anchor);
  const to = order.indexOf(target);
  if (to === -1) return [];
  if (from === -1) return [target];
  return order.slice(Math.min(from, to), Math.max(from, to) + 1);
};

/** The picked cards that are still on the board, in board order. */
const pickedCards = (data: KanbanData, picked: readonly string[]) =>
  allCards(data).filter((card) => picked.includes(card.id));

/** Moves the picked cards that are elsewhere to the end of `column`. */
export const bulkMoveActions = (
  data: KanbanData,
  picked: readonly string[],
  column: string,
): readonly ElementActionRequest[] =>
  pickedCards(data, picked)
    .filter((card) => card.column !== column)
    .map((card) => ({ type: MOVE_CARD, element: ['card', card.id], payload: { column, before: null } }));

/** Whether every picked card is already in `column`: moving them there would do nothing. */
export const allInColumn = (data: KanbanData, picked: readonly string[], column: string): boolean =>
  pickedCards(data, picked).every((card) => card.column === column);

export type TagCoverage = 'all' | 'some' | 'none';

/** How many of the picked cards carry the tag. */
export const tagCoverage = (data: KanbanData, picked: readonly string[], tag: string): TagCoverage => {
  const cards = pickedCards(data, picked);
  const tagged = cards.filter((card) => card.tags.includes(tag)).length;
  return tagged === 0 ? 'none' : tagged === cards.length ? 'all' : 'some';
};

/** Puts the tag on every picked card (`present`), or takes it off every one. */
export const bulkTagActions = (
  data: KanbanData,
  picked: readonly string[],
  tag: string,
  present: boolean,
): readonly ElementActionRequest[] =>
  pickedCards(data, picked)
    .filter((card) => card.tags.includes(tag) !== present)
    .map((card) => ({ type: present ? ADD_CARD_TAG : REMOVE_CARD_TAG, element: ['card', card.id], payload: { tag } }));
