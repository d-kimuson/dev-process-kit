import type { ElementActionResult } from '../../core/element-actions';
import type { ActionTarget, ActionTone, DraftAction } from '../../core/types';
import type { EventStormingMessages } from './messages';
import type { EventStormingState } from './model';

import { elementRefSegments } from '../diagram/model';
import { eventStormingActions } from './actions';
import { applyEventStormingAction } from './apply';
import { describeEventStormingAction } from './present';

/**
 * `describeEventStormingAction` answers the general `ActionDescription`
 * contract (which allows a `'comment'` tone for comment-type actions), but
 * the event storming vocabulary never includes one — so this narrows to the
 * `ElementActionResult` tone without ever actually mapping a real
 * `'comment'` tone to something else.
 */
const elementToneOf = (tone: ActionTone): 'create' | 'update' | 'delete' | 'move' | 'meta' => {
  return tone === 'comment' ? 'meta' : tone;
};

/**
 * `<provider-id>/<kind>/<id>` → `{type: kind, id}`, the native target every
 * domain function (`applyEventStormingAction`, `describeEventStormingAction`)
 * already expects — the same shape the template-era actions carried before
 * they became element actions (ADR 20261023_diagram-as-board).
 */
const nativeTargetOf = (targetId: string): ActionTarget | null => {
  const segments = elementRefSegments(targetId);
  if (segments === null || segments.length !== 3) return null;
  const [, kind, id] = segments;
  return kind === undefined || id === undefined || kind === '' || id === '' ? null : { type: kind, id };
};

/**
 * Replays the draft's element actions over the authored board, in order,
 * reusing the domain's own `apply`/`describe` (unchanged since the template
 * days — only how a target is addressed changed). Each action is reported
 * on: applied, or why it is stale. Pure.
 */
export const reduceEventStormingActions = (
  m: EventStormingMessages,
  data: EventStormingState,
  actions: readonly DraftAction[],
): { readonly data: EventStormingState; readonly results: readonly ElementActionResult[] } => {
  let state = data;
  const results: ElementActionResult[] = [];
  for (const action of actions) {
    const title = describeEventStormingAction(m, action, state).title;
    if (!(action.type in eventStormingActions)) {
      results.push({ id: action.id, title, stale: 'unsupported-action-type' });
      continue;
    }
    const target = nativeTargetOf(action.target.id);
    if (target === null) {
      results.push({ id: action.id, title, stale: 'target-missing' });
      continue;
    }
    const native: DraftAction = { ...action, target };
    const next = applyEventStormingAction(state, native);
    if (next === null) {
      results.push({ id: action.id, title, stale: 'constraint-violated' });
      continue;
    }
    const description = describeEventStormingAction(m, native, next, state);
    results.push({
      id: action.id,
      title: description.title,
      tone: elementToneOf(description.tone),
      ...(description.summary === undefined ? {} : { summary: description.summary }),
    });
    state = next;
  }
  return { data: state, results };
};
