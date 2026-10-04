import * as v from 'valibot';

import { entityIdSchema } from '../../core/schema';

/**
 * Meaning model of the delegation poker template (Management 3.0, Jurgen
 * Appelo): for each key decision area, every player privately picks one of
 * the seven delegation levels, the cards are revealed together, the lowest and
 * the highest explain, and the group settles on one level. The settled levels
 * make up the delegation board.
 *
 * The base carries what the other players (often the agent itself) already
 * played. The reader's own card only ever comes from the draft (`yours`), so
 * the board can keep a row's other cards face down until the reader has played
 * on it.
 */
export const DELEGATION_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;

/** 1 Tell · 2 Sell · 3 Consult · 4 Agree · 5 Advise · 6 Inquire · 7 Delegate. */
export type DelegationLevel = (typeof DELEGATION_LEVELS)[number];

export const delegationLevelSchema = v.picklist(DELEGATION_LEVELS, 'a delegation level is an integer from 1 to 7');

export type PokerPlayer = {
  readonly id: string;
  readonly name: string;
};

/** A card another player has put on the table for one decision area. */
export type PlayedCard = {
  readonly player: string;
  readonly level: DelegationLevel;
  readonly reason?: string;
};

export type DecisionArea = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly cards: readonly PlayedCard[];
  /** The reader's card: played on the board, sent back as a draft action. */
  readonly yours?: DelegationLevel;
  readonly agreed?: DelegationLevel;
};

/**
 * Who hands authority to whom. The level phrases read with these names
 * ("Manager decides and tells Team"); the messages supply a default pair.
 */
export type DelegationParties = {
  readonly delegator?: string;
  readonly delegate?: string;
};

export type DelegationPokerState = {
  readonly title?: string;
  readonly parties?: DelegationParties;
  readonly players: readonly PokerPlayer[];
  readonly decisions: readonly DecisionArea[];
};

/** Where a decision area stands in the game, as the reader sees it. */
export type DecisionStatus = 'to-play' | 'discuss' | 'consensus' | 'agreed';

const nameSchema = v.pipe(v.string(), v.minLength(1));

const playedCardSchema = v.strictObject({
  player: nameSchema,
  level: delegationLevelSchema,
  reason: v.exactOptional(v.string()),
});

export const delegationPokerBaseSchema = v.strictObject({
  title: v.exactOptional(v.string()),
  parties: v.exactOptional(
    v.strictObject({
      delegator: v.exactOptional(nameSchema),
      delegate: v.exactOptional(nameSchema),
    }),
  ),
  players: v.optional(v.array(v.strictObject({ id: entityIdSchema, name: nameSchema })), []),
  decisions: v.optional(
    v.array(
      v.strictObject({
        id: entityIdSchema,
        name: nameSchema,
        description: v.exactOptional(v.string()),
        cards: v.optional(v.array(playedCardSchema), []),
        agreed: v.exactOptional(delegationLevelSchema),
      }),
    ),
    [],
  ),
});

export const parseDelegationPokerBase = (input: unknown): DelegationPokerState => {
  const parsed = v.parse(delegationPokerBaseSchema, input);
  const playerIds = new Set<string>();
  for (const player of parsed.players) {
    if (playerIds.has(player.id)) throw new Error(`duplicate id "${player.id}" in players`);
    playerIds.add(player.id);
  }
  const decisionIds = new Set<string>();
  for (const decision of parsed.decisions) {
    if (decisionIds.has(decision.id)) throw new Error(`duplicate id "${decision.id}" in decisions`);
    decisionIds.add(decision.id);
    const played = new Set<string>();
    for (const card of decision.cards) {
      if (!playerIds.has(card.player)) {
        throw new Error(`decision "${decision.id}" has a card from unknown player "${card.player}"`);
      }
      if (played.has(card.player)) {
        throw new Error(`player "${card.player}" played more than one card on decision "${decision.id}"`);
      }
      played.add(card.player);
    }
  }
  return parsed;
};

export const emptyDelegationPokerBase = (): DelegationPokerState => {
  return { players: [], decisions: [] };
};

export const findDecision = (state: DelegationPokerState, id: string | undefined): DecisionArea | undefined => {
  if (id === undefined) return undefined;
  return state.decisions.find((decision) => decision.id === id);
};

export const findPlayer = (state: DelegationPokerState, id: string): PokerPlayer | undefined => {
  return state.players.find((player) => player.id === id);
};

/** Every entity id, for UI-generated ids. */
export const allDelegationPokerIds = (state: DelegationPokerState): string[] => {
  return [...state.players.map((player) => player.id), ...state.decisions.map((decision) => decision.id)];
};
