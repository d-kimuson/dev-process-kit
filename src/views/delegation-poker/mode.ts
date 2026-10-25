import type { DecisionArea } from './model';

/**
 * How final the reader's card is, set by the page author (`mode="strict|lax"`).
 *
 * - `strict`: one card per decision area. Seeing the others' cards cannot
 *   pull the reader's card after the fact, which is the point of the game.
 * - `lax`: the reader may play again after the row turns face up.
 */
export type PlayMode = 'strict' | 'lax';

/** An absent or unknown attribute keeps the forgiving default. */
export const parsePlayMode = (value: string | null | undefined): PlayMode => {
  return value === 'strict' ? 'strict' : 'lax';
};

/** What a click on a level cell leads to. */
export type PlayIntent =
  | { readonly kind: 'play' }
  /** Strict mode's first card: warn that it cannot be taken back. */
  | { readonly kind: 'confirm' }
  /** Strict mode, card already played: the click does nothing. */
  | { readonly kind: 'locked' };

export const isLocked = (mode: PlayMode, decision: DecisionArea): boolean => {
  return mode === 'strict' && decision.yours !== undefined;
};

export const playIntent = (mode: PlayMode, decision: DecisionArea, skipConfirm: boolean): PlayIntent => {
  if (mode === 'lax') return { kind: 'play' };
  if (isLocked(mode, decision)) return { kind: 'locked' };
  return skipConfirm ? { kind: 'play' } : { kind: 'confirm' };
};
