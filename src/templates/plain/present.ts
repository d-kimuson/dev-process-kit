import type { ActionDescription, ActionTarget, CommentTargetOption, DraftAction, Navigation } from '../../core/types';

import { targetRef } from '../../core/target';
import { findSection, type PlainState } from './model';

/**
 * The plain template's review rail. It has no action vocabulary of its own, so
 * everything the rail ever describes is a comment: on the page, on a
 * declared section, or on a component element (the core labels those).
 */

export const plainTitle = (state: PlainState): string => (state.title === '' ? 'Plain' : state.title);

/** Never throws: an unknown target falls back to its raw id. */
export const plainTargetLabel = (state: PlainState, target: ActionTarget): string => {
  switch (target.type) {
    case 'section':
      return findSection(state, target.id)?.title ?? target.id;
    case 'page':
      return 'ページ全体';
    default:
      return target.id;
  }
};

export const describePlainAction = (action: DraftAction, state: PlainState): ActionDescription => ({
  title: action.type,
  targetLabel: plainTargetLabel(state, action.target),
  tone: 'meta',
});

export const serializePlainAction = (action: DraftAction): string =>
  `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;

export const plainCommentTargets = (state: PlainState): readonly CommentTargetOption[] =>
  state.sections.map((section) => ({ value: `section:${section.id}`, label: section.title, group: 'セクション' }));

/** A plain page has no navigable selection: the hash is left as the reader wrote it. */
export const resolvePlainNavigation = (_state: PlainState, navigation: Navigation): Navigation => navigation;
