// @vitest-environment jsdom
// happy-dom (the project's default) mis-parses a template rooted at <tbody>/<tr>
// (table-section elements need a <table> ancestor within the very same parse):
// it drops the second of two listener attributes on <tbody> before Lit's own
// dev-mode check ever sees it. jsdom parses the same markup correctly, matching
// real browsers, so this suite runs under jsdom instead.
import { afterEach, describe, expect, it } from 'vitest';

import { DpkTable } from './element';
import { defineTable } from './index';
import { tableMessages } from './messages';

const m = tableMessages('en');

defineTable();

const raw = {
  columns: [
    { id: 'name', label: 'Story', type: 'text' },
    { id: 'estimate', label: 'Est.', type: 'number' },
    { id: 'status', label: 'Status', type: 'status' },
    { id: 'labels', label: 'Labels', type: 'tag', sortable: false },
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
    { id: 's2', cells: { name: 'Checkout', estimate: 5 }, questions: 'Q1' },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

const settle = async (element: DpkTable): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (lang?: string): Promise<DpkTable> => {
  const element = document.createElement('dpk-table');
  if (!(element instanceof DpkTable)) throw new Error('did not upgrade');
  element.id = 'tbl';
  if (lang !== undefined) element.setAttribute('lang', lang);
  element.innerHTML = `<script type="application/json">${JSON.stringify(raw)}</script>`;
  document.body.append(element);
  await settle(element);
  return element;
};

/** Stand-in for the page: accept each action, then hand the recorded draft back. */
const acceptActions = (element: DpkTable): void => {
  element.addEventListener('dpk-element-action', (event) => {
    if (!(event instanceof CustomEvent)) return;
    event.preventDefault();
    const detail: { type: string; target: string; payload: unknown } = event.detail;
    element.elementActions = [
      ...element.elementActions,
      {
        id: `a${element.elementActions.length}`,
        type: detail.type,
        target: { type: 'element', id: detail.target.slice('element:'.length) },
        payload: detail.payload,
        createdAt: '2026-10-22T00:00:00.000Z',
      },
    ];
  });
};

const rowIds = (element: DpkTable): (string | undefined)[] =>
  [...element.renderRoot.querySelectorAll<HTMLElement>('[data-row]')].map((row) => row.dataset['row']);

const row = (element: DpkTable, id: string): HTMLElement => {
  const found = element.renderRoot.querySelector<HTMLElement>(`[data-row="${id}"]`);
  if (!found) throw new Error(`no row ${id}`);
  return found;
};

describe('<dpk-table>', () => {
  it('renders the columns and rows, filling missing cells with empty values', async () => {
    const element = await mount();
    expect(rowIds(element)).toEqual(['s1', 's2']);
    expect(row(element, 's1').textContent).toContain('Login');
    expect(row(element, 's1').textContent).toContain('kimura');
    expect(row(element, 's1').querySelector('.tag')?.textContent).toBe('auth');
    expect(row(element, 's2').querySelector('.person')).toBeNull();
  });

  it('marks a row with its question references, for the shell’s grill badges', async () => {
    const element = await mount();
    expect(row(element, 's2').dataset['grillQuestions']).toBe('Q1');
    expect(row(element, 's1').dataset['grillQuestions']).toBeUndefined();
  });

  it('filters rows by a case-insensitive substring over every cell', async () => {
    const element = await mount();
    const filter = element.renderRoot.querySelector<HTMLInputElement>('.filter');
    if (!filter) throw new Error('no filter input');
    filter.value = 'checkout';
    filter.dispatchEvent(new Event('input'));
    await settle(element);
    expect(rowIds(element)).toEqual(['s2']);
  });

  it('sorts a sortable column ascending, then descending, then back to unsorted', async () => {
    const element = await mount();
    const sortButton = (label: string) =>
      [...element.renderRoot.querySelectorAll<HTMLButtonElement>('.sort')].find((btn) =>
        btn.textContent?.includes(label),
      );
    sortButton('Est.')?.click();
    await settle(element);
    expect(rowIds(element)).toEqual(['s1', 's2']);
    sortButton('Est.')?.click();
    await settle(element);
    expect(rowIds(element)).toEqual(['s2', 's1']);
    sortButton('Est.')?.click();
    await settle(element);
    expect(rowIds(element)).toEqual(['s1', 's2']);
  });

  it('does not offer a sort button on a column marked unsortable', async () => {
    const element = await mount();
    const labelsHead = [...element.renderRoot.querySelectorAll('th')].find((th) => th.textContent?.includes('Labels'));
    expect(labelsHead?.querySelector('.sort')).toBeNull();
  });

  it('groups rows by a column, with a group heading for each key', async () => {
    const element = await mount();
    const trigger = element.renderRoot.querySelector<HTMLButtonElement>('.group-by .dpk-rich-select');
    if (!trigger) throw new Error('no group-by select');
    trigger.click();
    await settle(element);
    const option = element.renderRoot.querySelector<HTMLElement>('.group-by [role="option"][data-value="assignee"]');
    if (!option) throw new Error('no assignee option');
    option.click();
    await settle(element);
    const heads = [...element.renderRoot.querySelectorAll('.group-head')].map((head) => head.textContent?.trim());
    expect(heads).toEqual([expect.stringContaining('kimura'), expect.stringContaining('1')]);
  });

  it('selects a row by click or keyboard, and dispatches dpk-table-select', async () => {
    const element = await mount();
    const selected: string[] = [];
    element.addEventListener('dpk-table-select', (event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail: { id: string } = event.detail;
      selected.push(detail.id);
    });
    row(element, 's2').click();
    await settle(element);
    expect(element.selection).toBe('s2');
    expect(row(element, 's2').getAttribute('aria-pressed')).toBe('true');
    row(element, 's1').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(element);
    expect(element.selection).toBe('s1');
    expect(selected).toEqual(['s2', 's1']);
  });

  it('offers every row as a comment target, and asks for a comment on one', async () => {
    const element = await mount();
    expect(element.commentTargets.map((target) => [target.value, target.label])).toEqual([
      ['element:tbl/table/rows', m.heading],
      ['element:tbl/row/s1', 'Login'],
      ['element:tbl/row/s2', 'Checkout'],
    ]);
    const requests: string[] = [];
    element.addEventListener('dpk-comment-request', (event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail: { target: string } = event.detail;
      requests.push(detail.target);
    });
    element.renderRoot.querySelector<HTMLButtonElement>('[data-row="s2"] .comment')?.click();
    expect(requests).toEqual(['element:tbl/row/s2']);
  });

  it('adds a row through the hosting template, and selects it', async () => {
    const element = await mount();
    acceptActions(element);
    element.renderRoot.querySelector<HTMLButtonElement>('.add-row')?.click();
    await settle(element);
    expect(rowIds(element)).toHaveLength(3);
    expect(element.elementActions[0]).toMatchObject({ type: 'ADD_ROW', target: { id: 'tbl/table/rows' } });
    expect(element.selection).not.toBeNull();
  });

  it('adds a row through a template that only records actions targeting a known comment target', async () => {
    // Regression: a real `ViewElement` only records a component element action whose
    // `target` is one of the component's own `commentTargets` (`#onElementAction` in
    // `src/core/element.ts`). `ADD_ROW` must target something that is *already* addressable —
    // a new row has none yet — so the table itself must be one of `commentTargets`, the same way
    // `dpk-board-kanban` lists its columns so `ADD_CARD` can target one. Without that, every `+ Row`
    // click is silently dropped on the next sync, even though nothing ever throws or logs.
    const element = await mount();
    element.addEventListener('dpk-element-action', (event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail: { type: string; target: string; payload: unknown } = event.detail;
      if (!element.commentTargets.some((target) => target.value === detail.target)) return;
      event.preventDefault();
      element.elementActions = [
        ...element.elementActions,
        {
          id: `a${element.elementActions.length}`,
          type: detail.type,
          target: { type: 'element', id: detail.target.slice('element:'.length) },
          payload: detail.payload,
          createdAt: '2026-10-22T00:00:00.000Z',
        },
      ];
    });
    element.renderRoot.querySelector<HTMLButtonElement>('.add-row')?.click();
    await settle(element);
    expect(rowIds(element)).toHaveLength(3);
    expect(element.renderRoot.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows an error and keeps the row count when no template records the add', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('.add-row')?.click();
    await settle(element);
    expect(rowIds(element)).toHaveLength(2);
    expect(element.renderRoot.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('edits a text cell on double-click, through the hosting template', async () => {
    const element = await mount();
    acceptActions(element);
    // the row's first <td> is the drag handle (reorderable by default); find the name cell by its text.
    const cell = [...row(element, 's2').querySelectorAll('td')].find((td) => td.textContent?.includes('Checkout'));
    cell?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(element);
    const input = element.renderRoot.querySelector<HTMLInputElement>('.cell-input');
    if (!input) throw new Error('no cell input');
    input.value = 'Checkout flow';
    input.dispatchEvent(new Event('blur'));
    await settle(element);
    expect(element.elementActions[0]).toMatchObject({
      type: 'SET_CELL',
      target: { id: 'tbl/row/s2' },
      payload: { column: 'name', value: 'Checkout flow' },
    });
    expect(row(element, 's2').textContent).toContain('Checkout flow');
  });

  it('deletes a row through the hosting template', async () => {
    const element = await mount();
    acceptActions(element);
    row(element, 's1').click();
    await settle(element);
    element.renderRoot.querySelector<HTMLButtonElement>('[data-row="s1"] .delete')?.click();
    await settle(element);
    expect(element.elementActions[0]).toMatchObject({ type: 'DELETE_ROW', target: { id: 'tbl/row/s1' } });
    expect(rowIds(element)).toEqual(['s2']);
    expect(element.selection).toBeNull();
  });

  it('reorders a row by dragging it before another, through the hosting template', async () => {
    const element = await mount();
    acceptActions(element);
    const drag = (target: Element, type: string, clientY = 0): void => {
      const event = new Event(type, { bubbles: true, cancelable: true, composed: true });
      Object.assign(event, { clientY, dataTransfer: { setData: () => undefined } });
      target.dispatchEvent(event);
    };
    const handle = row(element, 's2').querySelector('.handle');
    if (!handle) throw new Error('no drag handle');
    drag(handle, 'dragstart');
    // jsdom lays nothing out: every row's box is at 0, so a pointer above 0 means "before".
    drag(row(element, 's1'), 'dragover', -1);
    drag(row(element, 's1'), 'drop', -1);
    await settle(element);
    expect(element.elementActions[0]).toMatchObject({
      type: 'REORDER_ROW',
      target: { id: 'tbl/row/s2' },
      payload: { before: 's1' },
    });
    expect(rowIds(element)).toEqual(['s2', 's1']);
  });

  it('reports a stale action instead of applying it', async () => {
    const element = await mount();
    element.elementActions = [
      {
        id: 'a1',
        type: 'SET_CELL',
        target: { type: 'element', id: 'tbl/row/gone' },
        payload: { column: 'name', value: 'x' },
        createdAt: '2026-10-22T00:00:00.000Z',
      },
    ];
    await settle(element);
    expect(element.elementActionResults).toEqual([{ id: 'a1', title: m.setCellTitle, stale: 'target-missing' }]);
  });

  it('hides add, delete, edit and drag controls while readonly, but keeps the comment button', async () => {
    const element = await mount();
    element.readonly = true;
    await settle(element);
    expect(element.renderRoot.querySelector('.add-row')).toBeNull();
    expect(element.renderRoot.querySelector('[data-row="s1"] .delete')).toBeNull();
    expect(element.renderRoot.querySelector('[data-row="s1"] .handle')).toBeNull();
    expect(element.renderRoot.querySelector('[data-row="s1"] .comment')).not.toBeNull();
    const cell = row(element, 's2').querySelector('td');
    cell?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(element);
    expect(element.renderRoot.querySelector('.cell-input')).toBeNull();
  });

  it('renders its kit text in the element’s language', async () => {
    const ja = tableMessages('ja');
    const element = await mount('ja');
    expect(element.renderRoot.querySelector('.add-row')?.textContent?.trim()).toBe(ja.addRowButton);
    expect(element.renderRoot.querySelector('.filter')?.getAttribute('placeholder')).toBe(ja.filterPlaceholder);
  });

  it('renders its kit text in English by default', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('.add-row')?.textContent?.trim()).toBe(m.addRowButton);
  });
});
