import type { ActionDescription, ActionTarget, CommentTargetOption, DraftAction, Navigation } from '../../core/types';
import type { PlainMessages } from './messages';

import { targetRef } from '../../core/target';
import { findSection, type PlainState } from './model';

/**
 * The plain template's review rail. It has no action vocabulary of its own, so
 * everything the rail ever describes is a comment: on the page, on a
 * declared section, or on a component element (the core labels those).
 */

export const plainTitle = (state: PlainState): string => (state.title === '' ? 'Plain' : state.title);

/** Never throws: an unknown target falls back to its raw id. */
export const plainTargetLabel = (m: PlainMessages, state: PlainState, target: ActionTarget): string => {
  switch (target.type) {
    case 'section':
      return findSection(state, target.id)?.title ?? target.id;
    case 'page':
      return m.wholePage;
    default:
      return target.id;
  }
};

export const describePlainAction = (m: PlainMessages, action: DraftAction, state: PlainState): ActionDescription => ({
  title: action.type,
  targetLabel: plainTargetLabel(m, state, action.target),
  tone: 'meta',
});

export const serializePlainAction = (action: DraftAction): string =>
  `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;

export const plainCommentTargets = (m: PlainMessages, state: PlainState): readonly CommentTargetOption[] =>
  state.sections.map((section) => ({ value: `section:${section.id}`, label: section.title, group: m.sectionGroup }));

/** A plain page has no navigable selection: the hash is left as the reader wrote it. */
export const resolvePlainNavigation = (_state: PlainState, navigation: Navigation): Navigation => navigation;
