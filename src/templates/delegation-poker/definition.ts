import type { Locale } from '../../core/i18n';
import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { DELEGATION_POKER_PAGE, delegationPokerActions } from './actions';
import { applyDelegationPokerAction } from './apply';
import { delegationPokerMessages } from './messages';
import { emptyDelegationPokerBase, findDecision, parseDelegationPokerBase, type DelegationPokerState } from './model';
import {
  delegationPokerCommentTargets,
  delegationPokerTitle,
  describeDelegationPokerAction,
  resolveDelegationPokerNavigation,
  serializeDelegationPokerAction,
} from './present';

export const delegationPokerHasTarget = (state: DelegationPokerState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'decision':
      return findDecision(state, target.id) !== undefined;
    case 'page':
      return target.id === DELEGATION_POKER_PAGE;
    default:
      return false;
  }
};

/** The delegation poker template, describing its actions in `locale`. */
export const delegationPokerDefinitionFor = (locale: Locale): TemplateDefinition<DelegationPokerState> => {
  const m = delegationPokerMessages(locale);
  return {
    name: 'delegation-poker',
    label: 'Delegation Poker',
    parseBase: parseDelegationPokerBase,
    emptyBase: emptyDelegationPokerBase,
    actions: delegationPokerActions,
    apply: applyDelegationPokerAction,
    hasTarget: delegationPokerHasTarget,
    describe: (action, state, base) => describeDelegationPokerAction(m, action, state, base),
    serialize: serializeDelegationPokerAction,
    resolveNavigation: resolveDelegationPokerNavigation,
    commentTargets: (state, navigation) => delegationPokerCommentTargets(m, state, navigation),
    title: delegationPokerTitle,
  };
};
