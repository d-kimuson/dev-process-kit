import type { Locale } from '../../core/i18n';
import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { whiteboardActions } from './actions';
import { applyWhiteboardAction } from './apply';
import { paintOrder } from './layout';
import { whiteboardMessages } from './messages';
import { emptyWhiteboardBase, findConnector, findItem, parseWhiteboardBase, type WhiteboardState } from './model';
import {
  describeWhiteboardAction,
  resolveWhiteboardNavigation,
  serializeWhiteboardAction,
  whiteboardCommentTargets,
  whiteboardCurrentTarget,
  whiteboardTitle,
} from './present';

export const whiteboardHasTarget = (state: WhiteboardState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'item':
      return findItem(state, target.id) !== undefined;
    case 'connector':
      return findConnector(state, target.id) !== undefined;
    case 'page':
      return true;
    default:
      return false;
  }
};

/** The whiteboard template, describing its actions in `locale`. */
export const whiteboardDefinitionFor = (locale: Locale): TemplateDefinition<WhiteboardState> => {
  const m = whiteboardMessages(locale);
  return {
    name: 'whiteboard',
    label: 'Whiteboard',
    parseBase: parseWhiteboardBase,
    emptyBase: emptyWhiteboardBase,
    actions: whiteboardActions,
    apply: applyWhiteboardAction,
    // Frames are painted first wherever they sit in `items`: only the order the reader sees counts.
    canonicalState: (state) => ({ ...state, items: paintOrder(state) }),
    hasTarget: whiteboardHasTarget,
    describe: (action, state, base) => describeWhiteboardAction(m, action, state, base),
    serialize: serializeWhiteboardAction,
    resolveNavigation: resolveWhiteboardNavigation,
    navigationHierarchy: ['frame', 'item'],
    commentTargets: (state) => whiteboardCommentTargets(m, state),
    currentTarget: (state, navigation) => whiteboardCurrentTarget(m, state, navigation),
    title: whiteboardTitle,
  };
};
