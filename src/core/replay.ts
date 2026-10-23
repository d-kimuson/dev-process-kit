/**
 * Folds a sequence of actions into the state they produce, exactly as
 * `derive()` does for a template's own draft — but local to one component,
 * over actions it was handed rather than ones it owns. An embedded component
 * (ADR 20260924_component-element-actions, ADR 20261023_diagram-as-board)
 * has no draft of its own to read a derived state from: its enclosing
 * template stores its actions uninterpreted, and the component must compute
 * what they mean for itself, the same way its own `apply` would have if it
 * owned the draft.
 */
import type { ApplyResult, DraftAction } from './types';

export const replayActions = <S>(
  base: S,
  actions: readonly DraftAction[],
  apply: (state: S, action: DraftAction) => ApplyResult<S>,
): S => actions.reduce((state, action) => apply(state, action) ?? state, base);
