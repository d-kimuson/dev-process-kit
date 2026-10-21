/**
 * The questions of a page: its own block, plus every board's. A board keeps
 * its questions next to its own base JSON, so it can be written, moved or
 * taken out together with them; the page asks them all in one panel. A
 * board's question is qualified by its board like any target of it
 * (`grill:retry@scope`, shown as `Q1@scope`), so boards never collide.
 */
import type { Grill, GrillQuestion, GrillRound } from '../grill';

import { BOARD_SEPARATOR, qualifyRef } from './board-target';
import { boardIdOf } from './host';

export type BoardGrill = {
  readonly board: string;
  readonly grill: Grill;
};

const qualifyQuestion = <Q extends GrillQuestion>(question: Q, board: string): Q => ({
  ...question,
  id: qualifyRef(question.id, board),
  ref: qualifyRef(question.ref, board),
});

/** Rounds line up by position: the n-th earlier round of every board is one round of the page. */
const mergeRounds = (own: readonly GrillRound[], boards: readonly BoardGrill[]): readonly GrillRound[] => {
  const length = Math.max(own.length, ...boards.map(({ grill }) => grill.rounds.length));
  return Array.from({ length }, (_, index): GrillRound => {
    const label =
      own[index]?.label ??
      boards.map(({ grill }) => grill.rounds[index]?.label).find((entry) => entry !== undefined) ??
      `v${index + 1}`;
    return {
      label,
      questions: [
        ...(own[index]?.questions ?? []),
        ...boards.flatMap(({ board, grill }) =>
          (grill.rounds[index]?.questions ?? []).map((question) => qualifyQuestion(question, board)),
        ),
      ],
    };
  });
};

export const pageGrill = (own: Grill, boards: readonly BoardGrill[]): Grill => {
  const asking = boards.filter(({ grill }) => grill.questions.length > 0 || grill.rounds.length > 0);
  if (asking.length === 0) return own;
  return {
    questions: [
      ...own.questions,
      ...asking.flatMap(({ board, grill }) => grill.questions.map((question) => qualifyQuestion(question, board))),
    ],
    rounds: mergeRounds(own.rounds, asking),
  };
};

/**
 * The refs a mark's token may name: inside a board, an unqualified `Q1` is
 * that board's question first, and the page's own `Q1` otherwise.
 */
export const refCandidates = (token: string, board: string | null): readonly string[] =>
  board === null || token.includes(BOARD_SEPARATOR) ? [token] : [qualifyRef(token, board), token];

/** The board a mark sits in, crossing the shadow roots of the components inside it. */
export const boardOfMark = (mark: Element): string | null => {
  let node: Element | null = mark;
  while (node !== null) {
    const board = boardIdOf(node);
    if (board !== null) return board;
    const root = node.getRootNode();
    node = node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  return null;
};
