/**
 * The page's own vocabulary: which boards it holds. Adding or removing a
 * board is a change of the draft like any other, so the agent sees it and
 * the reviewer can take it back.
 */
import * as v from 'valibot';

import { defineAction, type ActionSpecs } from '../schema';
import { BOARD_ID_PATTERN } from './board-target';

const boardIdSchema = v.pipe(v.string(), v.regex(BOARD_ID_PATTERN));

export const pageActions = {
  /** A new board of `template`, starting from its empty base. */
  ADD_BOARD: defineAction(
    'ADD_BOARD',
    'page',
    v.object({
      board: boardIdSchema,
      template: v.pipe(v.string(), v.minLength(1)),
      label: v.pipe(v.string(), v.minLength(1)),
    }),
    { mode: 'append' },
  ),
  /** The board leaves the page, and with it every change and comment on it. */
  REMOVE_BOARD: defineAction('REMOVE_BOARD', 'page', v.object({ board: boardIdSchema }), { mode: 'append' }),
} satisfies ActionSpecs;

export type PageActionType = keyof typeof pageActions;
