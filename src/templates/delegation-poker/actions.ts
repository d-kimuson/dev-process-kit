import * as v from 'valibot';

import type { ActionInput } from '../../core/types';

import {
  defineAction,
  entityDedupeKey,
  entityIdSchema,
  type ActionSpecs,
  type TemplateAction,
} from '../../core/schema';
import { delegationLevelSchema, type DelegationLevel } from './model';

/** The page-wide target new decision areas are added to. */
export const DELEGATION_POKER_PAGE = 'delegation-poker';

// Domain vocabulary for Delegation Poker. No generic SET_FIELD.
export const delegationPokerActions = {
  /** The reader's card for one decision area; a later card replaces it. */
  PLAY_CARD: defineAction('PLAY_CARD', 'decision', v.strictObject({ level: delegationLevelSchema })),
  /** The level the players settled on: one cell of the delegation board. */
  AGREE_LEVEL: defineAction('AGREE_LEVEL', 'decision', v.object({ level: delegationLevelSchema })),
  ADD_DECISION: defineAction(
    'ADD_DECISION',
    'page',
    v.object({
      id: entityIdSchema,
      name: v.pipe(v.string(), v.minLength(1)),
      description: v.exactOptional(v.string()),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  SET_DECISION_NAME: defineAction(
    'SET_DECISION_NAME',
    'decision',
    v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
  ),
  DELETE_DECISION: defineAction('DELETE_DECISION', 'decision', v.object({})),
} satisfies ActionSpecs;

/** The discriminated union of this template's actions. */
export type DelegationPokerAction = TemplateAction<typeof delegationPokerActions>;

export const delegationPokerAction = {
  playCard: (decisionId: string, level: DelegationLevel): ActionInput => ({
    type: 'PLAY_CARD',
    target: { type: 'decision', id: decisionId },
    payload: { level },
  }),
  agreeLevel: (decisionId: string, level: DelegationLevel): ActionInput => ({
    type: 'AGREE_LEVEL',
    target: { type: 'decision', id: decisionId },
    payload: { level },
  }),
  addDecision: (id: string, name: string): ActionInput => ({
    type: 'ADD_DECISION',
    target: { type: 'page', id: DELEGATION_POKER_PAGE },
    payload: { id, name },
  }),
  setDecisionName: (id: string, name: string): ActionInput => ({
    type: 'SET_DECISION_NAME',
    target: { type: 'decision', id },
    payload: { name },
  }),
  deleteDecision: (id: string): ActionInput => ({
    type: 'DELETE_DECISION',
    target: { type: 'decision', id },
    payload: {},
  }),
};
