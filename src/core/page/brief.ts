/**
 * The page's brief is the plain brief over the page's draft, with a section
 * naming the boards first: every target in it ends with `@<board>`, and the
 * agent needs to know which template and which base JSON each board is.
 */
import type { DraftAction } from '../types';
import type { BoardSpec } from './definition';

import { COMMENT_ACTION } from '../action';
import { isAnswerAction } from '../grill';
import { splitBoard } from './board-target';

const APPLY_HEADING = '## How to apply';

/** One line per board, with what the draft asks of it. */
export const boardsSection = (boards: readonly BoardSpec[], actions: readonly DraftAction[]): readonly string[] => {
  const counts = new Map<string, { changes: number; comments: number }>();
  for (const action of actions) {
    const board = splitBoard(action.target)?.board;
    if (board === undefined || isAnswerAction(action)) continue;
    const count = counts.get(board) ?? { changes: 0, comments: 0 };
    if (action.type === COMMENT_ACTION) count.comments += 1;
    else count.changes += 1;
    counts.set(board, count);
  }
  return [
    `## Boards (${boards.length})`,
    '',
    'This page is a `<dpk-page>` holding several templates as boards. Every target ending in `@<board>` belongs to ' +
      'that board: apply it to the `dpk-template-*` child with that `board` attribute, against its own base JSON and ' +
      'action vocabulary, with the qualifier removed. `page:page` is the page as a whole.',
    '',
    '`ADD_BOARD` on `page:page` asks for a new child `<dpk-template-<template> board="<board>" label="<label>">` ' +
      'whose base JSON is built from the actions on `@<board>`; `REMOVE_BOARD` asks to take that child out, ' +
      'with everything the draft says about it.',
    '',
    'A question `grill:<id>@<board>` comes from the `data-dpk-grill` block of that board; one without a qualifier ' +
      "comes from the page's own block. Settle each in the board (or page) it was asked of, writing its id back " +
      'into that block (`history` included) with the qualifier removed.',
    '',
    ...boards.map((board) => {
      const count = counts.get(board.id) ?? { changes: 0, comments: 0 };
      return `- \`${board.id}\` — ${board.label} (\`${board.definition.name}\`): ${count.changes} change(s), ${count.comments} comment(s)`;
    }),
    '',
  ];
};

/** Puts the boards section right before the instructions on how to apply the draft. */
export const withBoards = (brief: string, section: readonly string[]): string => {
  const index = brief.indexOf(APPLY_HEADING);
  const block = `${section.join('\n')}\n`;
  return index < 0 ? `${brief}\n${block}` : `${brief.slice(0, index)}${block}${brief.slice(index)}`;
};
