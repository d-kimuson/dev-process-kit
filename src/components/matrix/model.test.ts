import { describe, expect, it } from 'vitest';

import {
  allLeaves,
  cellSlot,
  columnHeadSlot,
  hasSubColumns,
  leafDraggable,
  leavesOf,
  rowHeadSlot,
  spanOf,
  subColumnEdgeOf,
  subColumnHeadSlot,
  type MatrixColumn,
} from './model';

describe('hasSubColumns', () => {
  it('is false when no column declares sub-columns', () => {
    expect(hasSubColumns([{ id: 'a' }, { id: 'b', subColumns: [] }])).toBe(false);
  });

  it('is true once one column declares sub-columns', () => {
    expect(hasSubColumns([{ id: 'a' }, { id: 'b', subColumns: [{ id: 'b1' }] }])).toBe(true);
  });
});

describe('spanOf', () => {
  it('is 1 for a plain column', () => {
    expect(spanOf({ id: 'a' })).toBe(1);
  });

  it('is its sub-column count', () => {
    expect(spanOf({ id: 'a', subColumns: [{ id: 'a1' }, { id: 'a2' }] })).toBe(2);
  });

  it('is never 0, even with an empty sub-column list', () => {
    expect(spanOf({ id: 'a', subColumns: [] })).toBe(1);
  });
});

describe('leavesOf / allLeaves', () => {
  it('is the column itself when it has no sub-columns', () => {
    expect(leavesOf({ id: 'a' })).toEqual([{ columnId: 'a' }]);
  });

  it('is one leaf per sub-column', () => {
    expect(leavesOf({ id: 'a', subColumns: [{ id: 'a1' }, { id: 'a2' }] })).toEqual([
      { columnId: 'a', subColumnId: 'a1' },
      { columnId: 'a', subColumnId: 'a2' },
    ]);
  });

  it('flattens every column in order', () => {
    const columns: readonly MatrixColumn[] = [{ id: 'a', subColumns: [{ id: 'a1' }] }, { id: 'b' }];
    expect(allLeaves(columns)).toEqual([{ columnId: 'a', subColumnId: 'a1' }, { columnId: 'b' }]);
  });
});

describe('leafDraggable', () => {
  it('reads the column flag for a plain leaf', () => {
    expect(leafDraggable({ id: 'a', draggable: false }, { columnId: 'a' })).toBe(false);
    expect(leafDraggable({ id: 'a' }, { columnId: 'a' })).toBe(true);
  });

  it('reads the sub-column flag for a sub-column leaf', () => {
    const column: MatrixColumn = { id: 'a', subColumns: [{ id: 'a1', draggable: false }, { id: 'a2' }] };
    expect(leafDraggable(column, { columnId: 'a', subColumnId: 'a1' })).toBe(false);
    expect(leafDraggable(column, { columnId: 'a', subColumnId: 'a2' })).toBe(true);
  });
});

describe('subColumnEdgeOf', () => {
  it('marks the only sub-column both first and last', () => {
    const column: MatrixColumn = { id: 'a', subColumns: [{ id: 'a1' }] };
    expect(subColumnEdgeOf(column, 'a1')).toBe('first last');
  });

  it('marks the outer sub-columns, leaving the middle one unmarked', () => {
    const column: MatrixColumn = { id: 'a', subColumns: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }] };
    expect(subColumnEdgeOf(column, 'a1')).toBe('first');
    expect(subColumnEdgeOf(column, 'a2')).toBe('');
    expect(subColumnEdgeOf(column, 'a3')).toBe('last');
  });
});

describe('slot names', () => {
  it('never collide between kinds, since ids never contain the `:` delimiter', () => {
    expect(rowHeadSlot('r1')).toBe('row-head:r1');
    expect(columnHeadSlot('c1')).toBe('col-head:c1');
    expect(subColumnHeadSlot('c1', 's1')).toBe('sub-head:c1:s1');
    expect(cellSlot('r1', { columnId: 'c1' })).toBe('cell:r1:c1');
    expect(cellSlot('r1', { columnId: 'c1', subColumnId: 's1' })).toBe('cell:r1:c1:s1');
  });
});
