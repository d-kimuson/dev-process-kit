/**
 * The app's own vocabulary: which pages it holds. Adding or removing a page
 * is a change of the draft like any other, so the agent sees it and the
 * reviewer can take it back.
 */
import * as v from 'valibot';

import { PAGE_NAME_PATTERN } from '../page/page-target';
import { defineAction, type ActionSpecs } from '../schema';

const pageNameSchema = v.pipe(v.string(), v.regex(PAGE_NAME_PATTERN));

export const appActions = {
  /** A new page of `content` (a view or a board), starting from its empty base. */
  ADD_PAGE: defineAction(
    'ADD_PAGE',
    'app',
    v.object({
      page: pageNameSchema,
      kind: v.picklist(['view', 'board']),
      content: v.pipe(v.string(), v.minLength(1)),
      label: v.pipe(v.string(), v.minLength(1)),
    }),
    { mode: 'append' },
  ),
  /** The page leaves the app, and with it every change and comment on it. */
  REMOVE_PAGE: defineAction('REMOVE_PAGE', 'app', v.object({ page: pageNameSchema }), { mode: 'append' }),
  /** The page's own name, given in the header's inline edit. */
  RENAME_PAGE: defineAction(
    'RENAME_PAGE',
    'app',
    v.object({ page: pageNameSchema, label: v.pipe(v.string(), v.trim(), v.minLength(1)) }),
    {
      mode: 'patch',
      // Every app-wide action shares one target, so the default dedupe key
      // (type + target) would wrongly coalesce renames of different pages;
      // key on the page itself instead.
      dedupeKey: (action) => {
        const parsed = v.safeParse(v.object({ page: pageNameSchema }), action.payload);
        return parsed.success ? `RENAME_PAGE|${parsed.output.page}` : null;
      },
    },
  ),
} satisfies ActionSpecs;

export type AppActionType = keyof typeof appActions;
