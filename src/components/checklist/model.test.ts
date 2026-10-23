import { describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';

import { checklistMessages } from './messages';
import { checklistProgress, parseChecklistData, reduceChecklistActions, SET_CHECKED } from './model';

const m = checklistMessages('en');

const data = parseChecklistData({
  items: [
    { id: 'schema', label: 'Schema reviewed', checked: true },
    { id: 'perf', label: 'Load test', note: 'p95 < 200ms' },
  ],
});

const setChecked = (id: string, itemId: string, checked: unknown): DraftAction => ({
  id,
  type: SET_CHECKED,
  target: { type: 'element', id: `release/item/${itemId}` },
  payload: { checked },
  createdAt: '2026-10-22T00:00:00.000Z',
});

describe('parseChecklistData', () => {
  it('defaults checked to false and note to null', () => {
    expect(data.items[1]).toEqual({
      id: 'perf',
      label: 'Load test',
      checked: false,
      note: 'p95 < 200ms',
      changed: false,
    });
  });

  it('rejects duplicate ids and unknown keys', () => {
    expect(() =>
      parseChecklistData({
        items: [
          { id: 'a', label: 'A' },
          { id: 'a', label: 'B' },
        ],
      }),
    ).toThrow(/duplicate item id: a/);
    expect(() => parseChecklistData({ items: [{ id: 'a', label: 'A', done: true }] })).toThrow();
  });
});

describe('reduceChecklistActions', () => {
  it('replays ticks in order and marks items that differ from the authored list', () => {
    const replayed = reduceChecklistActions(m, data, [
      setChecked('a1', 'perf', true),
      setChecked('a2', 'schema', false),
      setChecked('a3', 'schema', true),
    ]);
    expect(replayed.data.items.map((item) => [item.id, item.checked, item.changed])).toEqual([
      ['schema', true, false],
      ['perf', true, true],
    ]);
    expect(replayed.results.map((result) => result.title)).toEqual([
      'Checked: Load test',
      'Unchecked: Schema reviewed',
      'Checked: Schema reviewed',
    ]);
  });

  it('reports actions it cannot apply as stale', () => {
    const replayed = reduceChecklistActions(m, data, [
      setChecked('a1', 'gone', true),
      setChecked('a2', 'perf', 'yes'),
      { ...setChecked('a3', 'perf', true), type: 'DELETE_ITEM' },
    ]);
    expect(replayed.results.map((result) => result.stale)).toEqual([
      'target-missing',
      'target-missing',
      'unsupported-action-type',
    ]);
    expect(replayed.data).toEqual(data);
  });
});

describe('checklistProgress', () => {
  it('counts checked items', () => {
    expect(checklistProgress(data)).toEqual({ done: 1, total: 2 });
  });
});
