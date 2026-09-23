import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { emptyPlainBase, findSection, parsePlainBase, type PlainState } from './model';
import {
  describePlainAction,
  plainCommentTargets,
  plainTitle,
  resolvePlainNavigation,
  serializePlainAction,
} from './present';

export const plainHasTarget = (state: PlainState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'section':
      return findSection(state, target.id) !== undefined;
    case 'page':
      return true;
    default:
      return false;
  }
};

/**
 * No actions: the page is the author's markup, and the only draft a reader
 * produces is comments. `apply` therefore never has anything to apply.
 */
export const plainDefinition: TemplateDefinition<PlainState> = {
  name: 'plain',
  label: 'Plain',
  parseBase: parsePlainBase,
  emptyBase: emptyPlainBase,
  actions: {},
  apply: () => null,
  hasTarget: plainHasTarget,
  describe: describePlainAction,
  serialize: serializePlainAction,
  resolveNavigation: resolvePlainNavigation,
  commentTargets: (state) => plainCommentTargets(state),
  title: plainTitle,
};
