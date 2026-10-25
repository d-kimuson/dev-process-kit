/**
 * The app's brief is the plain brief over the app's draft, with a section
 * naming the pages first: every target in it ends with `@<page>`, and the
 * agent needs to know which view or board and which base JSON each page is.
 */
import type { DraftAction } from '../types';
import type { PageSpec } from './definition';

import { COMMENT_ACTION } from '../action';
import { isAnswerAction } from '../grill';
import { splitPage } from '../page/page-target';

const APPLY_HEADING = '## How to apply';

/** One line per page, with what the draft asks of it. */
export const pagesSection = (pages: readonly PageSpec[], actions: readonly DraftAction[]): readonly string[] => {
  const counts = new Map<string, { changes: number; comments: number }>();
  for (const action of actions) {
    const page = splitPage(action.target)?.page;
    if (page === undefined || isAnswerAction(action)) continue;
    const count = counts.get(page) ?? { changes: 0, comments: 0 };
    if (action.type === COMMENT_ACTION) count.comments += 1;
    else count.changes += 1;
    counts.set(page, count);
  }
  return [
    `## Pages (${pages.length})`,
    '',
    'This document is a `<dpk-app>` holding `<dpk-page>` elements. Every target ending in `@<page>` belongs to ' +
      "that page: apply it to its `dpk-view-*` or `dpk-board-*` child, against that content's base JSON and " +
      'action vocabulary, with the qualifier removed. `app:app` is the whole document.',
    '',
    '`ADD_PAGE` on `app:app` asks for a new `<dpk-page name="<page>" label="<label>">` whose content is a ' +
      '`<dpk-view-<content>>` or `<dpk-board-<content>>` (the action says which), with its base JSON built from ' +
      'the actions on `@<page>`; `REMOVE_PAGE` asks to take that page out, with everything the draft says about it.',
    '',
    'A question `grill:<id>@<page>` comes from the `data-dpk-grill` block of that page; one without a qualifier ' +
      "comes from the app's own block. Settle each in the page (or app) it was asked of, writing its id back " +
      'into that block (`history` included) with the qualifier removed.',
    '',
    ...pages.map((page) => {
      const count = counts.get(page.id) ?? { changes: 0, comments: 0 };
      return `- \`${page.id}\` — ${page.label} (\`${page.definition.kind}:${page.definition.name}\`): ${count.changes} change(s), ${count.comments} comment(s)`;
    }),
    '',
  ];
};

/** Puts the pages section right before the instructions on how to apply the draft. */
export const withPages = (brief: string, section: readonly string[]): string => {
  const index = brief.indexOf(APPLY_HEADING);
  const block = `${section.join('\n')}\n`;
  return index < 0 ? `${brief}\n${block}` : `${brief.slice(0, index)}${block}${brief.slice(index)}`;
};
