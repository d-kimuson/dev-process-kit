/**
 * Targets inside a page are qualified by the board they belong to:
 * `<type>:<id>@<board>` (`story:checkout.pay@scope`). The qualifier is split
 * off at the last `@`; board ids cannot contain one, so a component id that
 * does stays intact. `page:page` is the page as a whole and is never qualified.
 */
import type { ActionTarget } from '../types';

import { PAGE_TARGET_TYPE } from '../derive';

export const BOARD_SEPARATOR = '@';
export const PAGE_WIDE_TARGET: ActionTarget = Object.freeze({ type: PAGE_TARGET_TYPE, id: 'page' });

/** Board ids follow the common id rule, which keeps `@` and `.` out of them. */
export const BOARD_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type BoardTarget = {
  readonly board: string;
  /** The target as the board itself knows it, without the qualifier. */
  readonly target: ActionTarget;
};

export const isPageWide = (target: ActionTarget): boolean =>
  target.type === PAGE_WIDE_TARGET.type && target.id === PAGE_WIDE_TARGET.id;

/** The board a target names, or `null` when it names none (page-wide, or a question of the page). */
export const splitBoard = (target: ActionTarget): BoardTarget | null => {
  const index = target.id.lastIndexOf(BOARD_SEPARATOR);
  if (index < 0) return null;
  const board = target.id.slice(index + 1);
  if (!BOARD_ID_PATTERN.test(board)) return null;
  return { board, target: { type: target.type, id: target.id.slice(0, index) } };
};

export const qualify = (target: ActionTarget, board: string): ActionTarget => ({
  type: target.type,
  id: `${target.id}${BOARD_SEPARATOR}${board}`,
});

/**
 * Resolves a target written inside a board: one that already names a board of
 * the page keeps it, the page as a whole stays the page, and anything else
 * belongs to `board`.
 */
export const resolveBoardTarget = (target: ActionTarget, board: string, boards: ReadonlySet<string>): ActionTarget => {
  if (isPageWide(target)) return target;
  const scoped = splitBoard(target);
  if (scoped !== null && boards.has(scoped.board)) return target;
  return qualify(target, board);
};

/** The string form of `qualify`, for refs offered to the comment composer. */
export const qualifyRef = (ref: string, board: string): string => `${ref}${BOARD_SEPARATOR}${board}`;
