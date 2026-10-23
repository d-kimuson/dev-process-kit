import { describe, expect, it } from 'vitest';

import { parseChangeLog, type ChangeLog } from './changes';
import {
  currentRevisionOf,
  EMPTY_CHECK_STATE,
  hasCheckedTargets,
  parseCheckState,
  statusOf,
  withEnabled,
  withToggled,
  type CheckState,
} from './check-mode';

const logOf = (input: unknown): ChangeLog => {
  const result = parseChangeLog(input);
  if (!result.ok) throw new Error(result.error);
  return result.log;
};

describe('withEnabled', () => {
  it('turns on without disturbing any mark', () => {
    const state: CheckState = { v: 1, enabled: false, checked: { 'card:a': { revision: 'r1' } } };
    expect(withEnabled(state, true)).toEqual({ ...state, enabled: true });
  });

  it('turning off clears every mark', () => {
    const state: CheckState = { v: 1, enabled: true, checked: { 'card:a': { revision: 'r1' } } };
    expect(withEnabled(state, false)).toEqual(EMPTY_CHECK_STATE);
  });
});

describe('withToggled', () => {
  it('marks an unchecked ref as checked at the current revision', () => {
    const next = withToggled(EMPTY_CHECK_STATE, 'card:a', 'unchecked', 'r2');
    expect(next.checked['card:a']).toEqual({ revision: 'r2' });
  });

  it('removes the mark from a checked ref', () => {
    const state: CheckState = { v: 1, enabled: true, checked: { 'card:a': { revision: 'r1' } } };
    const next = withToggled(state, 'card:a', 'checked', 'r2');
    expect(next.checked['card:a']).toBeUndefined();
  });

  it('re-affirms a stale ref at the current revision instead of clearing it', () => {
    const state: CheckState = { v: 1, enabled: true, checked: { 'card:a': { revision: 'r1' } } };
    const next = withToggled(state, 'card:a', 'stale', 'r3');
    expect(next.checked['card:a']).toEqual({ revision: 'r3' });
  });
});

describe('statusOf', () => {
  const log = logOf({
    revisions: [
      { revision: 'r1', changes: [{ id: 'a', title: 'first' }] },
      { revision: 'r2', changes: [{ id: 'b', title: 'touched card:a', target: 'card:a' }] },
      { revision: 'r3', changes: [{ id: 'c', title: 'unrelated', target: 'card:b' }] },
    ],
  });

  it('is unchecked when there is no mark at all', () => {
    expect(statusOf(EMPTY_CHECK_STATE, 'card:a', log)).toBe('unchecked');
  });

  it('is checked when marked and nothing has touched it since', () => {
    const state: CheckState = { v: 1, enabled: true, checked: { 'card:b': { revision: 'r3' } } };
    expect(statusOf(state, 'card:b', log)).toBe('checked');
  });

  it('is stale when a later revision names it as a target', () => {
    const state: CheckState = { v: 1, enabled: true, checked: { 'card:a': { revision: 'r1' } } };
    expect(statusOf(state, 'card:a', log)).toBe('stale');
  });

  it('is checked, not stale, once marked after the change that touched it', () => {
    const state: CheckState = { v: 1, enabled: true, checked: { 'card:a': { revision: 'r2' } } };
    expect(statusOf(state, 'card:a', log)).toBe('checked');
  });

  it('stays checked forever without a change log to compare against', () => {
    const state: CheckState = { v: 1, enabled: true, checked: { 'card:a': { revision: null } } };
    expect(statusOf(state, 'card:a', null)).toBe('checked');
  });

  it('treats an unplaceable checkpoint as stale when the target appears anywhere in the kept log', () => {
    const state: CheckState = { v: 1, enabled: true, checked: { 'card:a': { revision: 'gone' } } };
    expect(statusOf(state, 'card:a', log)).toBe('stale');
  });
});

describe('currentRevisionOf', () => {
  it('is the log’s latest revision, or null without one', () => {
    const log = logOf({ revision: 'r9', changes: [] });
    expect(currentRevisionOf(log)).toBe('r9');
    expect(currentRevisionOf(null)).toBeNull();
  });
});

describe('hasCheckedTargets', () => {
  it('is false with nothing checked', () => {
    expect(hasCheckedTargets(EMPTY_CHECK_STATE)).toBe(false);
  });

  it('is true once at least one target is checked', () => {
    const state: CheckState = { v: 1, enabled: true, checked: { 'card:a': { revision: 'r1' } } };
    expect(hasCheckedTargets(state)).toBe(true);
  });
});

describe('parseCheckState', () => {
  it('round-trips a valid record', () => {
    const state: CheckState = { v: 1, enabled: true, checked: { 'card:a': { revision: 'r1' } } };
    expect(parseCheckState(state)).toEqual(state);
  });

  it('rejects anything else', () => {
    expect(parseCheckState({ v: 2 })).toBeNull();
    expect(parseCheckState(null)).toBeNull();
    expect(parseCheckState('nope')).toBeNull();
  });
});
