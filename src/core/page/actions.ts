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
  /** The board's own name, given in the header's inline edit. */
  RENAME_BOARD: defineAction(
    'RENAME_BOARD',
    'page',
    v.object({ board: boardIdSchema, label: v.pipe(v.string(), v.trim(), v.minLength(1)) }),
    {
      mode: 'patch',
      // Every page-wide action shares one target, so the default dedupe key
      // (type + target) would wrongly coalesce renames of different boards;
      // key on the board itself instead.
      dedupeKey: (action) => {
        const parsed = v.safeParse(v.object({ board: boardIdSchema }), action.payload);
        return parsed.success ? `RENAME_BOARD|${parsed.output.board}` : null;
      },
    },
  ),
} satisfies ActionSpecs;

export type PageActionType = keyof typeof pageActions;
