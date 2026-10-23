import type { Locale } from '../../core/i18n';
import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { plainMessages } from './messages';
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
export const plainDefinitionFor = (locale: Locale): TemplateDefinition<PlainState> => {
  const m = plainMessages(locale);
  return {
    name: 'plain',
    label: 'Plain',
    // Content comes from the author's own markup (`slot="main"` etc.); an empty board added
    // through the page's "+" menu has no markup and nothing to show.
    addable: false,
    parseBase: parsePlainBase,
    emptyBase: emptyPlainBase,
    actions: {},
    apply: () => null,
    hasTarget: plainHasTarget,
    describe: (action, state) => describePlainAction(m, action, state),
    serialize: serializePlainAction,
    resolveNavigation: resolvePlainNavigation,
    commentTargets: (state) => plainCommentTargets(m, state),
    title: plainTitle,
  };
};
