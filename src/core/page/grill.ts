/**
 * The questions of a page: its own block, plus every page's. A page keeps
 * its questions next to its own base JSON, so it can be written, moved or
 * taken out together with them; the page asks them all in one panel. A
 * page's question is qualified by its page like any target of it
 * (`grill:retry@scope`, shown as `Q1@scope`), so pages never collide.
 */
import type { Grill, GrillQuestion, GrillRound } from '../grill';

import { pageNameOf } from './host';
import { PAGE_SEPARATOR, qualifyRef } from './page-target';

export type PageGrill = {
  readonly page: string;
  readonly grill: Grill;
};

const qualifyQuestion = <Q extends GrillQuestion>(question: Q, page: string): Q => ({
  ...question,
  id: qualifyRef(question.id, page),
  ref: qualifyRef(question.ref, page),
});

/** Rounds line up by position: the n-th earlier round of every page is one round of the page. */
const mergeRounds = (own: readonly GrillRound[], pages: readonly PageGrill[]): readonly GrillRound[] => {
  const length = Math.max(own.length, ...pages.map(({ grill }) => grill.rounds.length));
  return Array.from({ length }, (_, index): GrillRound => {
    const label =
      own[index]?.label ??
      pages.map(({ grill }) => grill.rounds[index]?.label).find((entry) => entry !== undefined) ??
      `v${index + 1}`;
    return {
      label,
      questions: [
        ...(own[index]?.questions ?? []),
        ...pages.flatMap(({ page, grill }) =>
          (grill.rounds[index]?.questions ?? []).map((question) => qualifyQuestion(question, page)),
        ),
      ],
    };
  });
};

export const pageGrill = (own: Grill, pages: readonly PageGrill[]): Grill => {
  const asking = pages.filter(({ grill }) => grill.questions.length > 0 || grill.rounds.length > 0);
  if (asking.length === 0) return own;
  return {
    questions: [
      ...own.questions,
      ...asking.flatMap(({ page, grill }) => grill.questions.map((question) => qualifyQuestion(question, page))),
    ],
    rounds: mergeRounds(own.rounds, asking),
  };
};

/**
 * The refs a mark's token may name: inside a page, an unqualified `Q1` is
 * that page's question first, and the page's own `Q1` otherwise.
 */
export const refCandidates = (token: string, page: string | null): readonly string[] =>
  page === null || token.includes(PAGE_SEPARATOR) ? [token] : [qualifyRef(token, page), token];

/** The page a mark sits in, crossing the shadow roots of the components inside it. */
export const pageOfMark = (mark: Element): string | null => {
  let node: Element | null = mark;
  while (node !== null) {
    const page = pageNameOf(node);
    if (page !== null) return page;
    const root = node.getRootNode();
    node = node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  return null;
};
