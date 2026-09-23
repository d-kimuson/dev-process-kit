import { isEqual } from 'es-toolkit/predicate';

import type { DraftAction, TemplateDefinition } from './types';

import { COMMENT_ACTION } from './action';
import { isElementAction, type ElementActionResult } from './element-actions';
import { ownAction } from './schema';
import { targetRef } from './target';

export type StaleReason = 'unsupported-action-type' | 'target-missing' | 'constraint-violated';

/** Target type reserved by the core for "the artifact as a whole". */
export const ARTIFACT_TARGET_TYPE = 'artifact';

export type StaleAction = {
  readonly action: DraftAction;
  readonly reason: StaleReason;
};

export type Derivation<S> = {
  readonly base: S;
  /** `reduce(base, draftActions, applyAction)` (design §10). */
  readonly state: S;
  /** Everything persisted, in dispatch order. */
  readonly actions: readonly DraftAction[];
  /** Actions that actually shaped `state`. */
  readonly applied: readonly DraftAction[];
  /** Persisted but not applicable to the current base (design §11). */
  readonly stale: readonly StaleAction[];
  /** Patch actions the base/state already reflects — safe to drop (design §12). */
  readonly obsolete: readonly DraftAction[];
  readonly comments: readonly DraftAction[];
  readonly commentsByTarget: ReadonlyMap<string, readonly DraftAction[]>;
};

export const commentTargetKey = (target: { type: string; id: string }): string => {
  return targetRef(target);
};

/**
 * Derives the visible artifact state from the base data and the draft actions.
 * Pure: safe to run on every render and in tests without a DOM.
 *
 * Component element actions never touch `state`: their owner applies them and
 * reports the outcome in `elementResults`. Without a report the owner is gone.
 */
export const derive = <S>(
  definition: TemplateDefinition<S>,
  base: S,
  actions: readonly DraftAction[],
  elementResults: ReadonlyMap<string, ElementActionResult> = new Map(),
): Derivation<S> => {
  let state = base;
  const applied: DraftAction[] = [];
  const stale: StaleAction[] = [];
  const obsolete: DraftAction[] = [];
  const comments: DraftAction[] = [];
  const commentsByTarget = new Map<string, DraftAction[]>();

  for (const action of actions) {
    if (action.type === COMMENT_ACTION) continue;

    if (isElementAction(action)) {
      const result = elementResults.get(action.id);
      if (result === undefined || result.stale !== undefined) {
        stale.push({ action, reason: result?.stale ?? 'target-missing' });
      } else {
        applied.push(action);
      }
      continue;
    }

    const descriptor = ownAction(definition.actions, action.type);

    if (!descriptor) {
      stale.push({ action, reason: 'unsupported-action-type' });
      continue;
    }

    const next = definition.apply(state, action);
    if (next === null) {
      stale.push({
        action,
        reason: definition.hasTarget(state, action.target) ? 'constraint-violated' : 'target-missing',
      });
      continue;
    }

    if (descriptor.mode !== 'append' && sameState(definition, state, next)) {
      // The base HTML (or an earlier draft action) already says this: drop it.
      obsolete.push(action);
      continue;
    }

    state = next;
    applied.push(action);
  }

  // Comments describe the final artifact, not the intermediate state at their
  // position in the draft. A later deletion (or creation) must be visible here.
  for (const action of actions) {
    if (action.type !== COMMENT_ACTION) continue;
    if (action.target.type !== ARTIFACT_TARGET_TYPE && !definition.hasTarget(state, action.target)) {
      stale.push({ action, reason: 'target-missing' });
      continue;
    }
    comments.push(action);
    const key = commentTargetKey(action.target);
    commentsByTarget.set(key, [...(commentsByTarget.get(key) ?? []), action]);
  }
  const order = new Map(actions.map((action, index) => [action.id, index]));
  stale.sort((a, b) => (order.get(a.action.id) ?? 0) - (order.get(b.action.id) ?? 0));

  return {
    base,
    state,
    actions,
    applied,
    stale,
    obsolete,
    comments,
    commentsByTarget,
  };
};

/** Whether two states mean the same artifact, per the template's canonical form. */
export const sameState = <S>(definition: TemplateDefinition<S>, a: S, b: S): boolean => {
  if (a === b) return true;
  if (definition.canonicalState === undefined) return isEqual(a, b);
  return isEqual(definition.canonicalState(a), definition.canonicalState(b));
};

export const liveActions = <S>(derivation: Derivation<S>): DraftAction[] => {
  const dropped = new Set(derivation.obsolete.map((action) => action.id));
  return derivation.actions.filter((action) => !dropped.has(action.id));
};
