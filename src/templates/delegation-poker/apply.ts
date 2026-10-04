import type { ApplyResult, DraftAction } from '../../core/types';

import { assertNever, parseTemplateAction } from '../../core/schema';
import { delegationPokerActions } from './actions';
import { allDelegationPokerIds, type DecisionArea, type DelegationPokerState } from './model';

// Pure reducer: (state, action) => state | null. No DOM, no I/O.
export const applyDelegationPokerAction = (
  state: DelegationPokerState,
  action: DraftAction,
): ApplyResult<DelegationPokerState> => {
  const typed = parseTemplateAction(delegationPokerActions, action);
  if (typed === null) return null;
  const id = typed.target.id;
  switch (typed.type) {
    case 'PLAY_CARD':
      return updateDecision(state, id, (decision) => ({ ...decision, yours: typed.payload.level }));
    case 'AGREE_LEVEL':
      return updateDecision(state, id, (decision) => ({ ...decision, agreed: typed.payload.level }));
    case 'ADD_DECISION': {
      const payload = typed.payload;
      if (state.decisions.some((decision) => decision.id === payload.id)) return state;
      if (allDelegationPokerIds(state).includes(payload.id)) return null;
      return {
        ...state,
        decisions: [
          ...state.decisions,
          {
            id: payload.id,
            name: payload.name,
            ...(payload.description === undefined ? {} : { description: payload.description }),
            cards: [],
          },
        ],
      };
    }
    case 'SET_DECISION_NAME':
      return updateDecision(state, id, (decision) => ({ ...decision, name: typed.payload.name }));
    case 'DELETE_DECISION': {
      if (!state.decisions.some((decision) => decision.id === id)) return null;
      return { ...state, decisions: state.decisions.filter((decision) => decision.id !== id) };
    }
    default:
      return assertNever(typed);
  }
};

const updateDecision = (
  state: DelegationPokerState,
  id: string,
  fn: (decision: DecisionArea) => DecisionArea,
): DelegationPokerState | null => {
  if (!state.decisions.some((decision) => decision.id === id)) return null;
  return { ...state, decisions: state.decisions.map((decision) => (decision.id === id ? fn(decision) : decision)) };
};
