/**
 * Check Mode: a reader-only tally of which targets (a template's cards, an ER
 * table, ...) have been looked over. Entirely local to the reader — nothing
 * here is an action, so none of it is ever written into the draft or handed
 * back to the agent. Pure state and transitions; the shell
 * (`shell/check-mode-badges.ts`) collects which elements are checkable from
 * the existing `data-dpk-target` marker, renders the per-element badges, and
 * owns storage (`shell/check-mode-controller.ts`), exactly as the change
 * notices' own seen record does.
 *
 * A checked target goes stale, not simply "still checked", once the change
 * log (`./changes`) records an entry about it in a later version than the one
 * the reader checked it at — reusing the same `target: "type:id"` references
 * the change log already carries, rather than a second notion of "changed".
 */
import * as v from 'valibot';

import { revisionsOf, type ChangeLog } from './changes';

export type CheckStatus = 'unchecked' | 'checked' | 'stale';

const checkRecordSchema = v.strictObject({
  /** The revision current when the reader checked it off; `null` when the page carries no change log at all. */
  revision: v.union([v.string(), v.null()]),
});

const checkStateSchema = v.strictObject({
  v: v.literal(1),
  enabled: v.boolean(),
  /** Keyed by target ref (`"type:id"`). */
  checked: v.record(v.string(), checkRecordSchema),
});

export type CheckRecord = v.InferOutput<typeof checkRecordSchema>;
export type CheckState = v.InferOutput<typeof checkStateSchema>;

export const EMPTY_CHECK_STATE: CheckState = { v: 1, enabled: false, checked: {} };

export const parseCheckState = (input: unknown): CheckState | null => {
  const result = v.safeParse(checkStateSchema, input);
  return result.success ? result.output : null;
};

/**
 * Turning Check Mode on or off. Turning it off also clears every mark: the
 * reader confirms this first (a confirm dialog, owned by the shell), so by
 * the time this runs, resetting is already the agreed outcome.
 */
export const withEnabled = (state: CheckState, enabled: boolean): CheckState =>
  enabled ? { ...state, enabled: true } : { ...EMPTY_CHECK_STATE, enabled: false };

/** The log's own current version, or `null` when the page carries no change log. */
export const currentRevisionOf = (log: ChangeLog | null): string | null => (log === null ? null : log.latest.revision);

/**
 * Unmarked, checked, or checked-but-changed-since: a target goes stale when
 * the change log records an entry whose `target` is this ref in a revision
 * after the one the reader checked it at. A ref the log can no longer place
 * (an old revision that has since dropped out of history) is treated as
 * stale if the target appears anywhere in the kept log, since there is no
 * way left to tell whether the reader already saw that change.
 */
export const statusOf = (state: CheckState, ref: string, log: ChangeLog | null): CheckStatus => {
  const record = state.checked[ref];
  if (!record) return 'unchecked';
  if (log === null || record.revision === null) return 'checked';
  const revisions = revisionsOf(log);
  const at = revisions.findIndex((revision) => revision.revision === record.revision);
  const after = at === -1 ? revisions : revisions.slice(at + 1);
  const changed = after.some((revision) => revision.entries.some((entry) => entry.target === ref));
  return changed ? 'stale' : 'checked';
};

/**
 * Whether turning Check Mode off would discard any mark. The shell uses this
 * to decide whether exiting needs the reader's confirmation at all: with
 * nothing checked, `withEnabled(state, false)` is a no-op on the reader's
 * behalf, so there is nothing to confirm.
 */
export const hasCheckedTargets = (state: CheckState): boolean => Object.keys(state.checked).length > 0;

/**
 * Applies one click on a ref's badge, given its status just before the
 * click: unchecked or stale both become checked at the page's current
 * revision (stale is an outdated "checked", so one click re-affirms it);
 * checked is removed.
 */
export const withToggled = (
  state: CheckState,
  ref: string,
  status: CheckStatus,
  currentRevision: string | null,
): CheckState => {
  if (status === 'checked') {
    const { [ref]: _removed, ...checked } = state.checked;
    return { ...state, checked };
  }
  return { ...state, checked: { ...state.checked, [ref]: { revision: currentRevision } } };
};
