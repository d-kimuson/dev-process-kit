import type { ElementActionResult } from '../../core/element-actions';
import type { ActionTarget, ActionTone, DraftAction } from '../../core/types';
import type { ExampleMappingMessages } from './messages';
import type { ExampleMappingState } from './model';

import { elementRefSegments } from '../diagram/model';
import { exampleMappingActions } from './actions';
import { applyExampleMappingAction } from './apply';
import { describeExampleMappingAction } from './present';

/**
 * `describeExampleMappingAction` answers the general `ActionDescription`
 * contract (which allows a `'comment'` tone for comment-type actions), but
 * Example Mapping's own action vocabulary never includes one — so this
 * narrows to the `ElementActionResult` tone without ever actually mapping
 * a real `'comment'` tone to something else.
 */
const elementToneOf = (tone: ActionTone): 'create' | 'update' | 'delete' | 'move' | 'meta' => {
  return tone === 'comment' ? 'meta' : tone;
};

/**
 * `<provider-id>/<kind>/<id>` → `{type: kind, id}`, the native target every
 * domain function (`applyExampleMappingAction`, `describeExampleMappingAction`)
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
 * Replays the draft's element actions over the authored map, in order,
 * reusing the domain's own `apply`/`describe` (unchanged since the template
 * days — only how a target is addressed changed). Each action is reported
 * on: applied, or why it is stale. Pure.
 */
export const reduceExampleMappingActions = (
  m: ExampleMappingMessages,
  data: ExampleMappingState,
  actions: readonly DraftAction[],
): { readonly data: ExampleMappingState; readonly results: readonly ElementActionResult[] } => {
  let state = data;
  const results: ElementActionResult[] = [];
  for (const action of actions) {
    const title = describeExampleMappingAction(m, action, state).title;
    if (!(action.type in exampleMappingActions)) {
      results.push({ id: action.id, title, stale: 'unsupported-action-type' });
      continue;
    }
    const target = nativeTargetOf(action.target.id);
    if (target === null) {
      results.push({ id: action.id, title, stale: 'target-missing' });
      continue;
    }
    const native: DraftAction = { ...action, target };
    const next = applyExampleMappingAction(state, native);
    if (next === null) {
      results.push({ id: action.id, title, stale: 'constraint-violated' });
      continue;
    }
    const description = describeExampleMappingAction(m, native, next, state);
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
