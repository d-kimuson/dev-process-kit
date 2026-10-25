import * as v from 'valibot';

import type { ElementActionResult } from '../../core/element-actions';
import type { DraftAction } from '../../core/types';
import type { ChecklistMessages } from './messages';

import { elementRefSegments } from '../../core/board-model';

/**
 * Domain model of a checklist: items in reading order, each checked or not.
 *
 * Reviewers tick items from the page: each tick is a `SET_CHECKED` element
 * action replayed over the authored list (`reduceChecklistActions`), so the
 * agent receives "this item was checked / unchecked" in the hand-off.
 */

export const SET_CHECKED = 'SET_CHECKED';

const itemSchema = v.strictObject({
  id: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/)),
  label: v.pipe(v.string(), v.minLength(1)),
  checked: v.optional(v.boolean()),
  note: v.optional(v.string()),
});

const checklistSchema = v.strictObject({
  items: v.array(itemSchema),
});

export type ChecklistItem = {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly note: string | null;
  /** The reviewer changed this item from what the agent authored. */
  readonly changed: boolean;
};

export type ChecklistData = { readonly items: readonly ChecklistItem[] };

export const emptyChecklistData = (): ChecklistData => ({ items: [] });

export const parseChecklistData = (input: unknown): ChecklistData => {
  const parsed = v.parse(checklistSchema, input);
  const ids = new Set<string>();
  return {
    items: parsed.items.map((item): ChecklistItem => {
      if (ids.has(item.id)) throw new Error(`duplicate item id: ${item.id}`);
      ids.add(item.id);
      return {
        id: item.id,
        label: item.label,
        checked: item.checked ?? false,
        note: item.note ?? null,
        changed: false,
      };
    }),
  };
};

const checkedPayload = v.object({ checked: v.boolean() });

/** Replays `SET_CHECKED` actions in order over the authored list. Pure. */
export const reduceChecklistActions = (
  m: ChecklistMessages,
  data: ChecklistData,
  actions: readonly DraftAction[],
): { readonly data: ChecklistData; readonly results: readonly ElementActionResult[] } => {
  const authored = new Map(data.items.map((item) => [item.id, item.checked]));
  const current = new Map(authored);
  const results = actions.map((action): ElementActionResult => {
    if (action.type !== SET_CHECKED) return { id: action.id, title: action.type, stale: 'unsupported-action-type' };
    const segments = elementRefSegments(action.target.id);
    const itemId = segments?.[1] === 'item' ? segments[2] : undefined;
    const payload = v.safeParse(checkedPayload, action.payload);
    if (itemId === undefined || !current.has(itemId) || !payload.success) {
      return { id: action.id, title: m.actionTitle(itemId ?? action.target.id, true), stale: 'target-missing' };
    }
    current.set(itemId, payload.output.checked);
    const label = data.items.find((item) => item.id === itemId)?.label ?? itemId;
    return { id: action.id, title: m.actionTitle(label, payload.output.checked), tone: 'update' };
  });
  return {
    data: {
      items: data.items.map((item) => {
        const checked = current.get(item.id) ?? item.checked;
        return { ...item, checked, changed: checked !== authored.get(item.id) };
      }),
    },
    results,
  };
};

export const checklistProgress = (data: ChecklistData): { readonly done: number; readonly total: number } => ({
  done: data.items.filter((item) => item.checked).length,
  total: data.items.length,
});
