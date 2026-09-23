import type { DraftAction, TemplateDefinition } from './types';

import { COMMENT_ACTION } from './action';
import { ARTIFACT_TARGET_TYPE, sameState, type Derivation } from './derive';
import { isElementAction } from './element-actions';
import { ownAction } from './schema';

/**
 * Interpretive drafts.
 *
 * A draft states what should change, not the history of how the reader got
 * there: adding a note and deleting it again leaves nothing to hand back, and
 * neither does moving a story away and back. After a change, every set of
 * template actions whose removal leaves the artifact meaning the same is
 * dropped from the draft.
 *
 * Only the final state decides, so a cancellation can never change what the
 * draft asks for. Candidates are the actions around the new one: a contiguous
 * run that ends where it started, and earlier actions on the same entities.
 * Removing a candidate may leave later actions without a target (a rename of a
 * note that is no longer added); those are removed with it, and still only when
 * the artifact then means the same. Comments and component element actions are
 * never removed, and a stale action is never part of a candidate.
 */
export const compactDraft = <S>(
  definition: TemplateDefinition<S>,
  derivation: Derivation<S>,
  rederive: (actions: readonly DraftAction[]) => Derivation<S>,
  /** The actions just dispatched. Omitted, the whole draft is revisited. */
  triggers?: readonly string[],
): Derivation<S> => {
  let current = derivation;
  const pending = triggers ?? templateActions(current).map((action) => action.id);
  // Newest first: a later action is the one that can undo an earlier one.
  for (const id of [...pending].reverse()) {
    current = cancel(definition, current, rederive, id, triggers !== undefined) ?? current;
  }
  return current;
};

/** Applied actions the template owns: the only ones whose effect the core can judge. */
const templateActions = <S>(derivation: Derivation<S>): readonly DraftAction[] => {
  return derivation.applied.filter((action) => !isElementAction(action));
};

const cancel = <S>(
  definition: TemplateDefinition<S>,
  current: Derivation<S>,
  rederive: (actions: readonly DraftAction[]) => Derivation<S>,
  triggerId: string,
  scanRuns: boolean,
): Derivation<S> | null => {
  const actions = templateActions(current);
  const index = actions.findIndex((action) => action.id === triggerId);
  const trigger = actions[index];
  if (trigger === undefined) return null;
  const earlier = actions.slice(0, index);
  const candidates = [
    ...(scanRuns ? closedRuns(definition, current.base, actions, index) : []),
    ...relatedSets(definition, earlier, trigger),
  ];
  const seen = new Set<string>();
  const ordered = candidates
    .filter((ids) => {
      const key = ids.join(' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.length - a.length);
  for (const ids of ordered) {
    const result = withoutActions(definition, current, rederive, ids);
    if (result !== null) return result;
  }
  return null;
};

/**
 * Runs `actions[start..index]` that end where they started: the state before
 * the run means the same as the state after the trigger. Applied actions
 * reproduce the derived state when replayed on the base in order.
 */
const closedRuns = <S>(
  definition: TemplateDefinition<S>,
  base: S,
  actions: readonly DraftAction[],
  index: number,
): string[][] => {
  const before: S[] = [];
  let state = base;
  for (const action of actions.slice(0, index + 1)) {
    before.push(state);
    state = definition.apply(state, action) ?? state;
  }
  return before.flatMap((candidate, start) =>
    sameState(definition, candidate, state) ? [actions.slice(start, index + 1).map((action) => action.id)] : [],
  );
};

/**
 * Earlier actions that name an entity the trigger names, as runs ending at the
 * trigger (all of them, or only those of the same mode, so a move and a move
 * back cancel even with a rename in between), pairs with the trigger, and on
 * their own (an edit the trigger made invisible, such as a rename before a
 * deletion).
 */
const relatedSets = <S>(
  definition: TemplateDefinition<S>,
  earlier: readonly DraftAction[],
  trigger: DraftAction,
): string[][] => {
  const refs = referencesOf(trigger);
  const related = earlier.filter((action) => referencesOf(action).some((ref) => refs.includes(ref)));
  const mode = modeOf(definition, trigger);
  const sameMode = related.filter((action) => modeOf(definition, action) === mode);
  const runs = (family: readonly DraftAction[]) =>
    family.map((_, start) => [...family.slice(start).map((action) => action.id), trigger.id]);
  return [
    ...runs(related),
    ...runs(sameMode),
    ...related.map((action) => [action.id, trigger.id]),
    ...related.map((action) => [action.id]),
  ];
};

/**
 * The entity ids an action names: its target (each segment of a path) and the
 * string values of its payload. Over-matching only adds candidates; each one is
 * still checked against the final state.
 */
const referencesOf = (action: DraftAction): readonly string[] => {
  const target = action.target.type === ARTIFACT_TARGET_TYPE ? [] : action.target.id.split('.');
  const payload =
    typeof action.payload === 'object' && action.payload !== null
      ? Object.values(action.payload).filter((value): value is string => typeof value === 'string' && value !== '')
      : [];
  return [...target, ...payload];
};

const modeOf = <S>(definition: TemplateDefinition<S>, action: DraftAction) => {
  return ownAction(definition.actions, action.type)?.mode;
};

/**
 * The draft without `ids`, and without the actions that lose their target once
 * those are gone, or `null` when that changes what the artifact means.
 */
const withoutActions = <S>(
  definition: TemplateDefinition<S>,
  current: Derivation<S>,
  rederive: (actions: readonly DraftAction[]) => Derivation<S>,
  ids: readonly string[],
): Derivation<S> | null => {
  const stale = new Set(current.stale.map((entry) => entry.action.id));
  const removed = new Set(ids);
  for (;;) {
    const next = rederive(current.actions.filter((action) => !removed.has(action.id)));
    const orphaned = next.stale.filter((entry) => !stale.has(entry.action.id)).map((entry) => entry.action);
    if (orphaned.length === 0) return sameState(definition, next.state, current.state) ? next : null;
    if (orphaned.some((action) => action.type === COMMENT_ACTION || isElementAction(action))) return null;
    for (const action of orphaned) removed.add(action.id);
  }
};
