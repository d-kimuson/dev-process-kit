import { afterEach, describe, expect, it } from 'vitest';

import type { MatrixColumn, MatrixRow } from './model';

import { DpkMatrix } from './element';
import { defineMatrix } from './index';

defineMatrix();

afterEach(() => {
  document.body.replaceChildren();
});

const settle = async (element: DpkMatrix): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const rows: readonly MatrixRow[] = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3', draggable: false }];
const columns: readonly MatrixColumn[] = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3', draggable: false }];

const twoLevelColumns: readonly MatrixColumn[] = [
  { id: 'a1', subColumns: [{ id: 's1' }, { id: 's2' }] },
  { id: 'a2', subColumns: [{ id: 's3' }] },
];

/** A banded header mixing a plain column between two-level ones, the way USM's trailing "+ Activity" or the catalog's "search"/"checkout" sit beside a sub-columned one. */
const mixedColumns: readonly MatrixColumn[] = [
  { id: 'plain1' },
  { id: 'banded', subColumns: [{ id: 's1' }, { id: 's2' }] },
  { id: 'plain2' },
];

const mount = async (
  theRows: readonly MatrixRow[],
  theColumns: readonly MatrixColumn[],
  fill: (element: DpkMatrix) => void = () => {},
): Promise<DpkMatrix> => {
  const element = document.createElement('dpk-matrix');
  if (!(element instanceof DpkMatrix)) throw new Error('did not upgrade');
  element.rows = theRows;
  element.columns = theColumns;
  fill(element);
  document.body.append(element);
  await settle(element);
  return element;
};

/** Light-DOM slotted content standing in for a host's own head/cell markup. */
const slotted = (slot: string, text: string): HTMLElement => {
  const span = document.createElement('span');
  span.slot = slot;
  span.textContent = text;
  span.dataset['slotted'] = slot;
  return span;
};

const drag = (target: Element, type: string, clientY = 0): void => {
  const event = new Event(type, { bubbles: true, cancelable: true, composed: true });
  Object.assign(event, { clientY, dataTransfer: null });
  target.dispatchEvent(event);
};

const recordReorders = (element: DpkMatrix, type: string): unknown[] => {
  const events: unknown[] = [];
  element.addEventListener(type, (event) => {
    if (event instanceof CustomEvent) events.push(event.detail);
  });
  return events;
};

const rowHead = (element: DpkMatrix, rowId: string): HTMLElement => {
  const found = element.renderRoot.querySelector<HTMLElement>(`.matrix-row[data-row="${rowId}"] .matrix-row-head`);
  if (!found) throw new Error(`no row head ${rowId}`);
  return found;
};

const rowEl = (element: DpkMatrix, rowId: string): HTMLElement => {
  const found = element.renderRoot.querySelector<HTMLElement>(`.matrix-row[data-row="${rowId}"]`);
  if (!found) throw new Error(`no row ${rowId}`);
  return found;
};

const colHead = (element: DpkMatrix, columnId: string): HTMLElement => {
  const found = element.renderRoot.querySelector<HTMLElement>(`.matrix-col-head[data-column="${columnId}"]`);
  if (!found) throw new Error(`no column head ${columnId}`);
  return found;
};

const subHead = (element: DpkMatrix, columnId: string, subColumnId: string): HTMLElement => {
  const found = element.renderRoot.querySelector<HTMLElement>(
    `.matrix-sub-head[data-column="${columnId}"][data-sub-column="${subColumnId}"]`,
  );
  if (!found) throw new Error(`no sub head ${columnId}/${subColumnId}`);
  return found;
};

describe('<dpk-matrix>', () => {
  it('projects every head and cell through its named slot', async () => {
    const element = await mount(rows, columns, (el) => {
      el.append(slotted('corner', 'Corner'));
      el.append(slotted('row-head:r1', 'Row 1'));
      el.append(slotted('col-head:c1', 'Col 1'));
      el.append(slotted('cell:r1:c1', 'R1xC1'));
    });
    expect(element.renderRoot.querySelector('slot[name="corner"]')).not.toBeNull();
    const cornerSlot = element.renderRoot.querySelector<HTMLSlotElement>('slot[name="corner"]');
    expect(cornerSlot?.assignedNodes().length).toBe(1);
    const cellSlot = element.renderRoot.querySelector<HTMLSlotElement>('slot[name="cell:r1:c1"]');
    expect(cellSlot?.assignedNodes().length).toBe(1);
  });

  it('renders one header row for plain columns and two for columns with sub-columns', async () => {
    const plain = await mount(rows, columns);
    expect(plain.renderRoot.querySelectorAll('.matrix-head .matrix-row').length).toBe(1);

    const twoLevel = await mount(rows, twoLevelColumns);
    expect(twoLevel.renderRoot.querySelectorAll('.matrix-head .matrix-row').length).toBe(2);
    expect(twoLevel.renderRoot.querySelectorAll('.matrix-sub-head').length).toBe(3);
  });

  it('drags a row onto another and fires a row reorder with the landing anchor', async () => {
    const element = await mount(rows, columns);
    const events = recordReorders(element, 'dpk-matrix-reorder-row');
    drag(rowHead(element, 'r1'), 'dragstart');
    await settle(element);
    expect(rowEl(element, 'r1').dataset['rowDragging']).toBe('true');
    // happy-dom lays every box at (0, 0): clientY below the midpoint reads as "after".
    drag(rowEl(element, 'r2'), 'dragover', 100);
    await settle(element);
    expect(rowEl(element, 'r2').dataset['rowDrop']).toBe('true');
    drag(rowEl(element, 'r2'), 'drop', 100);
    await settle(element);
    expect(events).toEqual([{ rowId: 'r1', after: 'r2' }]);
    expect(rowEl(element, 'r1').dataset['rowDragging']).toBe('false');
  });

  it('never drags or targets a row marked `draggable: false`', async () => {
    const element = await mount(rows, columns);
    const events = recordReorders(element, 'dpk-matrix-reorder-row');
    const head = element.renderRoot.querySelector<HTMLElement>('.matrix-row[data-row="r3"] .matrix-row-head');
    expect(head?.getAttribute('draggable')).toBe('false');
    drag(rowHead(element, 'r1'), 'dragstart');
    drag(rowEl(element, 'r3'), 'dragover', 100);
    await settle(element);
    // r3 never becomes a highlighted drop target, since it refuses the drag.
    expect(rowEl(element, 'r3').dataset['rowDrop']).toBe('false');
    drag(rowEl(element, 'r3'), 'drop', 100);
    await settle(element);
    expect(events).toEqual([]);
  });

  it('drags a column onto another and fires a column reorder', async () => {
    const element = await mount(rows, columns);
    const events = recordReorders(element, 'dpk-matrix-reorder-column');
    drag(colHead(element, 'c1'), 'dragstart');
    await settle(element);
    expect(colHead(element, 'c1').dataset['colDragging']).toBe('true');
    drag(colHead(element, 'c2'), 'dragover', 100);
    await settle(element);
    expect(colHead(element, 'c2').dataset['colDrop']).toBe('column');
    drag(colHead(element, 'c2'), 'drop', 100);
    await settle(element);
    expect(events).toEqual([{ columnId: 'c1', after: 'c2' }]);
  });

  it('never drags or targets a column marked `draggable: false`', async () => {
    const element = await mount(rows, columns);
    const events = recordReorders(element, 'dpk-matrix-reorder-column');
    expect(colHead(element, 'c3').getAttribute('draggable')).toBe('false');
    drag(colHead(element, 'c1'), 'dragstart');
    drag(colHead(element, 'c3'), 'dragover', 100);
    await settle(element);
    expect(colHead(element, 'c3').dataset['colDrop']).toBe('none');
    drag(colHead(element, 'c3'), 'drop', 100);
    await settle(element);
    expect(events).toEqual([]);
  });

  it('drags a sub-column within its own column and fires a sub-column reorder', async () => {
    const element = await mount(rows, twoLevelColumns);
    const events = recordReorders(element, 'dpk-matrix-reorder-sub-column');
    drag(subHead(element, 'a1', 's1'), 'dragstart');
    drag(subHead(element, 'a1', 's2'), 'dragover', 100);
    await settle(element);
    expect(subHead(element, 'a1', 's2').dataset['colDrop']).toBe('subColumn');
    drag(subHead(element, 'a1', 's2'), 'drop', 100);
    await settle(element);
    expect(events).toEqual([{ columnId: 'a1', subColumnId: 's1', after: 's2' }]);
  });

  it('refuses a sub-column drop onto a different column', async () => {
    const element = await mount(rows, twoLevelColumns);
    const events = recordReorders(element, 'dpk-matrix-reorder-sub-column');
    drag(subHead(element, 'a1', 's1'), 'dragstart');
    drag(subHead(element, 'a2', 's3'), 'dragover', 100);
    await settle(element);
    expect(subHead(element, 'a2', 's3').dataset['colDrop']).toBe('none');
    drag(subHead(element, 'a2', 's3'), 'drop', 100);
    await settle(element);
    expect(events).toEqual([]);
  });

  it('keeps a row drag from lighting up column drop state and vice versa, without any suspend flag', async () => {
    const element = await mount(rows, columns);
    drag(rowHead(element, 'r1'), 'dragstart');
    drag(colHead(element, 'c1'), 'dragover', 100);
    await settle(element);
    expect(colHead(element, 'c1').dataset['colDrop']).toBe('none');
    drag(rowEl(element, 'r1'), 'dragend');
    await settle(element);

    drag(colHead(element, 'c1'), 'dragstart');
    drag(rowEl(element, 'r2'), 'dragover', 100);
    await settle(element);
    expect(rowEl(element, 'r2').dataset['rowDrop']).toBe('false');
  });

  it("keeps a plain column's own leaf-wide cell in the sub-head row, so a banded column's sub-heads land under their own column instead of shifting into it", async () => {
    const element = await mount(rows, mixedColumns);
    const subRow = element.renderRoot.querySelectorAll('.matrix-head .matrix-row')[1];
    if (!subRow) throw new Error('no sub-head row');
    // One cell per leaf column (plain1, banded:s1, banded:s2, plain2), in leaf order, not one per
    // declared sub-column: without a spacer for each plain column, CSS Grid auto-placement would pack
    // "s1"/"s2" into the grid cells "plain1" and "banded" actually occupy.
    const cells = [...subRow.children].filter((child) => child !== subRow.firstElementChild);
    expect(cells.map((cell) => cell.getAttribute('data-column'))).toEqual(['plain1', 'banded', 'banded', 'plain2']);
    expect(cells.map((cell) => cell.getAttribute('data-sub-column'))).toEqual([null, 's1', 's2', null]);
    expect(cells[0]?.classList.contains('matrix-sub-head-spacer')).toBe(true);
    expect(cells[3]?.classList.contains('matrix-sub-head-spacer')).toBe(true);
  });

  it("mirrors a row's, column's and sub-column's own draggable state onto its slotted content, since native drag-and-drop never looks through a slot into the shadow root for its nearest draggable ancestor", async () => {
    const element = await mount(rows, twoLevelColumns, (el) => {
      el.append(slotted('row-head:r1', 'Row 1'));
      el.append(slotted('row-head:r3', 'Row 3')); // r3: draggable === false
      el.append(slotted('col-head:a1', 'A1'));
      el.append(slotted('sub-head:a1:s1', 'S1'));
    });
    const bySlot = (slot: string): HTMLElement => {
      const found = element.querySelector<HTMLElement>(`[data-slotted="${slot}"]`);
      if (!found) throw new Error(`no slotted content for ${slot}`);
      return found;
    };
    expect(bySlot('row-head:r1').draggable).toBe(true);
    expect(bySlot('row-head:r3').draggable).toBe(false);
    expect(bySlot('col-head:a1').draggable).toBe(true);
    expect(bySlot('sub-head:a1:s1').draggable).toBe(true);

    // Content the host slots in later (a `slotchange`, not a `rows`/`columns` change) is synced too.
    const lateRow2 = slotted('row-head:r2', 'Row 2');
    element.append(lateRow2);
    await settle(element);
    expect(lateRow2.draggable).toBe(true);
  });

  it('drops the stale drag state when the dragged row disappears from `rows`', async () => {
    const element = await mount(rows, columns);
    drag(rowHead(element, 'r1'), 'dragstart');
    await settle(element);
    expect(rowEl(element, 'r1').dataset['rowDragging']).toBe('true');
    element.rows = rows.filter((row) => row.id !== 'r1');
    await settle(element);
    expect(element.renderRoot.querySelector('[data-row-dragging="true"]')).toBeNull();
  });
});
