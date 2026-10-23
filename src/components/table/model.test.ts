import { describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';

import { tableMessages } from './messages';
import {
  ADD_ROW,
  DELETE_ROW,
  parseTableData,
  reduceTableActions,
  REORDER_ROW,
  rowTarget,
  SET_CELL,
  tableRowsTarget,
  visibleGroups,
} from './model';

const m = tableMessages('en');

const base = () =>
  parseTableData({
    columns: [
      { id: 'name', label: 'Story', type: 'text' },
      { id: 'estimate', label: 'Est.', type: 'number' },
      { id: 'status', label: 'Status', type: 'status' },
      { id: 'labels', label: 'Labels', type: 'tag' },
      { id: 'assignee', label: 'Assignee', type: 'person' },
    ],
    rows: [
      {
        id: 's1',
        cells: {
          name: 'Login',
          estimate: 3,
          status: { label: 'Doing', tone: 'blue' },
          labels: ['auth'],
          assignee: 'kimura',
        },
      },
      { id: 's2', cells: { name: 'Checkout', estimate: 5 } },
    ],
  });

const action = (id: string, type: string, target: string, payload: unknown): DraftAction => ({
  id,
  type,
  target: { type: 'element', id: target },
  payload,
  createdAt: '2026-10-22T00:00:00.000Z',
});

describe('parseTableData', () => {
  it('fills missing cells with the empty value for their column type', () => {
    const data = base();
    expect(data.rows[1]?.cells).toEqual({
      name: { type: 'text', value: 'Checkout' },
      estimate: { type: 'number', value: 5 },
      status: { type: 'status', value: null },
      labels: { type: 'tag', value: [] },
      assignee: { type: 'person', value: null },
    });
  });

  it('rejects duplicate column ids, duplicate row ids, and unknown column keys', () => {
    expect(() =>
      parseTableData({
        columns: [
          { id: 'a', label: 'A', type: 'text' },
          { id: 'a', label: 'B', type: 'text' },
        ],
      }),
    ).toThrow(/duplicate column id: a/);
    expect(() =>
      parseTableData({
        columns: [{ id: 'a', label: 'A', type: 'text' }],
        rows: [
          { id: 'r1', cells: {} },
          { id: 'r1', cells: {} },
        ],
      }),
    ).toThrow(/duplicate row id: r1/);
    expect(() =>
      parseTableData({
        columns: [{ id: 'a', label: 'A', type: 'text' }],
        rows: [{ id: 'r1', cells: { b: 'x' } }],
      }),
    ).toThrow(/unknown column "b"/);
  });

  it('rejects a cell whose shape does not match its column type', () => {
    expect(() =>
      parseTableData({
        columns: [{ id: 'estimate', label: 'Est.', type: 'number' }],
        rows: [{ id: 'r1', cells: { estimate: 'three' } }],
      }),
    ).toThrow(/does not match its type "number"/);
  });
});

describe('visibleGroups', () => {
  it('filters rows by a case-insensitive substring over every cell', () => {
    const groups = visibleGroups(base(), { sort: null, groupBy: null, filter: 'auth' });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.rows.map((row) => row.id)).toEqual(['s1']);
  });

  it('sorts by a column, ascending or descending', () => {
    const asc = visibleGroups(base(), { sort: { column: 'estimate', direction: 'asc' }, groupBy: null, filter: '' });
    expect(asc[0]?.rows.map((row) => row.id)).toEqual(['s1', 's2']);
    const desc = visibleGroups(base(), { sort: { column: 'estimate', direction: 'desc' }, groupBy: null, filter: '' });
    expect(desc[0]?.rows.map((row) => row.id)).toEqual(['s2', 's1']);
  });

  it('groups rows by a column, in first-seen order, with a group for empty values', () => {
    const groups = visibleGroups(base(), { sort: null, groupBy: 'assignee', filter: '' });
    expect(groups.map((group) => [group.label, group.rows.map((row) => row.id)])).toEqual([
      ['kimura', ['s1']],
      ['', ['s2']],
    ]);
  });
});

describe('reduceTableActions', () => {
  it('appends a row targeting the row collection', () => {
    const replayed = reduceTableActions(m, base(), [
      action('a1', ADD_ROW, tableRowsTarget('tbl'), { id: 's3', cells: { name: 'Billing' } }),
    ]);
    expect(replayed.data.rows.map((row) => row.id)).toEqual(['s1', 's2', 's3']);
    expect(replayed.data.rows[2]?.cells['name']).toEqual({ type: 'text', value: 'Billing' });
    expect(replayed.results[0]).toMatchObject({ tone: 'create' });
  });

  it('edits a cell on an existing row', () => {
    const replayed = reduceTableActions(m, base(), [
      action('a1', SET_CELL, rowTarget('tbl', 's2'), { column: 'estimate', value: 8 }),
    ]);
    expect(replayed.data.rows.find((row) => row.id === 's2')?.cells['estimate']).toEqual({
      type: 'number',
      value: 8,
    });
    expect(replayed.results[0]).toMatchObject({ tone: 'update' });
  });

  it('deletes a row', () => {
    const replayed = reduceTableActions(m, base(), [action('a1', DELETE_ROW, rowTarget('tbl', 's1'), {})]);
    expect(replayed.data.rows.map((row) => row.id)).toEqual(['s2']);
    expect(replayed.results[0]).toMatchObject({ tone: 'delete' });
  });

  it('reorders a row before another, or to the end', () => {
    const toEnd = reduceTableActions(m, base(), [action('a1', REORDER_ROW, rowTarget('tbl', 's1'), { before: null })]);
    expect(toEnd.data.rows.map((row) => row.id)).toEqual(['s2', 's1']);

    const beforeOther = reduceTableActions(m, toEnd.data, [
      action('a2', REORDER_ROW, rowTarget('tbl', 's1'), { before: 's2' }),
    ]);
    expect(beforeOther.data.rows.map((row) => row.id)).toEqual(['s1', 's2']);
  });

  it('reports actions it cannot apply as stale', () => {
    const replayed = reduceTableActions(m, base(), [
      action('a1', ADD_ROW, tableRowsTarget('tbl'), { id: 's1', cells: {} }),
      action('a2', SET_CELL, rowTarget('tbl', 'gone'), { column: 'name', value: 'x' }),
      action('a3', SET_CELL, rowTarget('tbl', 's1'), { column: 'missing-column', value: 'x' }),
      action('a4', DELETE_ROW, rowTarget('tbl', 'gone'), {}),
      action('a5', REORDER_ROW, rowTarget('tbl', 's1'), { before: 's1' }),
      { ...action('a6', 'NOPE', rowTarget('tbl', 's1'), {}) },
    ]);
    expect(replayed.results.map((result) => result.stale)).toEqual([
      'constraint-violated',
      'target-missing',
      'constraint-violated',
      'target-missing',
      'constraint-violated',
      'unsupported-action-type',
    ]);
    expect(replayed.data).toEqual(base());
  });
});
