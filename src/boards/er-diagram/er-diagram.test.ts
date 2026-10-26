import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContextMenuRequest } from '../../core/context-menu/types';

import { DpkDialogPanel } from '../../components/dialog-panel/element';
import { EMPTY_CHECK_STATE, withEnabled } from '../../core/check-mode';
import { collectCheckBindings } from '../../core/shell/check-mode-badges';
import { parseTargetRef } from '../../core/target';
import { diagramMessages } from '../base/messages';
import { DpkBoardErDiagram } from './element';
import { defineErDiagram } from './index';
import { erDiagramMessages } from './messages';
import {
  ADD_FIELD,
  EDIT_FIELD,
  fanOffset,
  fieldOffset,
  fieldRelations,
  parseErData,
  reduceErActions,
  tableHeight,
} from './model';

defineErDiagram();

const m = erDiagramMessages('en');

const raw = {
  before: {
    tables: [
      {
        id: 'customers',
        name: '顧客',
        tags: ['顧客'],
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'email', type: 'varchar', key: 'UQ' },
        ],
      },
      {
        id: 'orders',
        name: '注文',
        tags: ['注文'],
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
          { id: 'status', type: 'varchar' },
          { id: 'total_amount', type: 'integer' },
        ],
      },
      {
        id: 'payment_attempts',
        name: '決済試行',
        tags: ['決済'],
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' },
        ],
      },
    ],
  },
  after: {
    tables: [
      {
        id: 'customers',
        name: '顧客',
        tags: ['顧客'],
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'email', type: 'varchar', key: 'UQ' },
        ],
      },
      {
        id: 'orders',
        name: '注文',
        tags: ['注文', '今回の設計'],
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
          { id: 'status', type: 'order_status' },
          { id: 'total_amount', type: 'bigint' },
          { id: 'currency', type: 'char(3)', nullable: true },
        ],
      },
      {
        id: 'inventory_reservations',
        name: '在庫予約',
        tags: ['在庫', '今回の設計'],
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' },
          { id: 'quantity', type: 'integer' },
        ],
      },
    ],
  },
};

const settle = async (element: DpkBoardErDiagram): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (lang?: string): Promise<DpkBoardErDiagram> => {
  const element = new DpkBoardErDiagram();
  if (lang !== undefined) element.setAttribute('lang', lang);
  element.data = parseErData(raw);
  document.body.append(element);
  await settle(element);
  return element;
};

const classes = (element: DpkBoardErDiagram, table: string): string[] => [
  ...(element.renderRoot.querySelector<HTMLElement>(`[data-er-table="${table}"]`)?.classList ?? []),
];

afterEach(() => {
  document.body.replaceChildren();
});

describe('er diagram data', () => {
  it('derives table, field and relation diffs from the two snapshots', () => {
    const data = parseErData(raw);
    expect(data.nodes.map((node) => [node.id, node.status])).toEqual([
      ['customers', 'same'],
      ['orders', 'changed'],
      ['payment_attempts', 'removed'],
      ['inventory_reservations', 'added'],
    ]);
    const orders = data.nodes.find((node) => node.id === 'orders');
    if (!orders) throw new Error('missing orders table');
    expect(orders?.fields.map((field) => [field.id, field.status])).toEqual([
      ['id', 'same'],
      ['customer_id', 'same'],
      ['status', 'changed'],
      ['total_amount', 'changed'],
      ['currency', 'added'],
    ]);
    expect(orders?.fields.find((field) => field.id === 'status')?.before).toMatchObject({ type: 'varchar' });
    expect(orders?.tags).toEqual(['注文', '今回の設計']);
    expect(orders.height).toBe(tableHeight(orders.fields));
    expect(data.edges.map((edge) => [edge.id, edge.status])).toEqual([
      ['customers:id>orders:customer_id', 'same'],
      ['orders:id>payment_attempts:order_id', 'removed'],
      ['orders:id>inventory_reservations:order_id', 'added'],
    ]);
    expect(data.edges[0]?.fromPort).toBe('customers:id>orders:customer_id:out');
    expect(
      data.nodes.find((node) => node.id === 'orders')?.ports?.['customers:id>orders:customer_id:in'],
    ).toBeDefined();
  });

  it('omitting `before` means "no diff"', () => {
    const data = parseErData({ after: raw.after });
    expect(data.nodes.every((node) => node.status === 'same')).toBe(true);
    expect(data.edges[0]?.status).toBe('same');
    expect(() =>
      parseErData({ after: { tables: [{ id: 'a', name: 'A', fields: [{ id: 'x', type: 't', ref: 'nope' }] }] } }),
    ).toThrow();
  });
});

describe('er diagram descriptions and constraints', () => {
  const actOn = (type: string, table: string, payload: Record<string, unknown>, n = 0) => ({
    id: `d${n}`,
    type,
    target: { type: 'element', id: `erd/node/${table}` },
    payload,
    createdAt: '2026-10-20T00:00:00.000Z',
  });

  it('surfaces a column description from the after snapshot, and null when absent', () => {
    const data = parseErData({
      before: { tables: [{ id: 't', name: 'T', fields: [{ id: 'x', type: 'text', description: 'old text' }] }] },
      after: { tables: [{ id: 't', name: 'T', fields: [{ id: 'x', type: 'text', description: 'new text' }] }] },
    });
    const field = data.nodes[0]?.fields[0];
    expect(field?.description).toBe('new text');
    expect(field?.status).toBe('same');

    const bare = parseErData({ after: { tables: [{ id: 't', name: 'T', fields: [{ id: 'x', type: 'text' }] }] } });
    expect(bare.nodes[0]?.fields[0]?.description).toBeNull();
  });

  it('parses table-level constraints of every kind, defaulting EXCLUDE’s index method to null', () => {
    const data = parseErData({
      after: {
        tables: [
          {
            id: 't',
            name: 'T',
            fields: [
              { id: 'a', type: 'uuid' },
              { id: 'b', type: 'uuid' },
            ],
            constraints: [
              { kind: 'unique', columns: ['a', 'b'] },
              { kind: 'primary-key', columns: ['a', 'b'] },
              { kind: 'check', expression: 'a > 0' },
              { kind: 'exclude', using: 'gist', elements: ['a WITH =', 'b WITH &&'] },
              { kind: 'exclude', elements: ['a WITH ='] },
            ],
          },
        ],
      },
    });
    expect(data.nodes[0]?.constraints).toEqual([
      { kind: 'unique', columns: ['a', 'b'] },
      { kind: 'primary-key', columns: ['a', 'b'] },
      { kind: 'check', expression: 'a > 0' },
      { kind: 'exclude', using: 'gist', elements: ['a WITH =', 'b WITH &&'] },
      { kind: 'exclude', using: null, elements: ['a WITH ='] },
    ]);
  });

  it('keeps constraints out of the diff, like name, and takes them from the after snapshot', () => {
    const data = parseErData({
      before: {
        tables: [
          {
            id: 't',
            name: 'T',
            fields: [{ id: 'a', type: 'uuid' }],
            constraints: [{ kind: 'unique', columns: ['a'] }],
          },
        ],
      },
      after: {
        tables: [
          {
            id: 't',
            name: 'T',
            fields: [{ id: 'a', type: 'uuid' }],
            constraints: [
              { kind: 'unique', columns: ['a'] },
              { kind: 'check', expression: 'a > 0' },
            ],
          },
        ],
      },
    });
    expect(data.nodes[0]?.status).toBe('same');
    expect(data.nodes[0]?.constraints).toEqual([
      { kind: 'unique', columns: ['a'] },
      { kind: 'check', expression: 'a > 0' },
    ]);
  });

  it("grows a table's estimated size for a column's description lines and a constraints section", () => {
    const plain = parseErData({ after: { tables: [{ id: 't', name: 'T', fields: [{ id: 'a', type: 'uuid' }] }] } });
    const withExtras = parseErData({
      after: {
        tables: [
          {
            id: 't',
            name: 'T',
            fields: [{ id: 'a', type: 'uuid', description: 'a short description' }],
            constraints: [{ kind: 'check', expression: 'a > 0' }],
          },
        ],
      },
    });
    const plainNode = plain.nodes[0];
    const extraNode = withExtras.nodes[0];
    if (!plainNode || !extraNode) throw new Error('missing table');
    expect(extraNode.height).toBeGreaterThan(plainNode.height);
    expect(extraNode.height).toBe(tableHeight(extraNode.fields, extraNode.constraints));
  });

  it('records a description through ADD_FIELD and EDIT_FIELD, keeping it out of status tracking', () => {
    const data = parseErData(raw);
    const added = reduceErActions(m, data, [
      actOn(ADD_FIELD, 'orders', { id: 'note', type: 'text', description: 'free-form note' }),
    ]);
    const note = added.data.nodes.find((node) => node.id === 'orders')?.fields.find((field) => field.id === 'note');
    expect(note).toMatchObject({ description: 'free-form note', status: 'added' });

    const edited = reduceErActions(m, added.data, [
      actOn(EDIT_FIELD, 'orders', { field: 'note', type: 'text', nullable: false, description: 'revised note' }, 1),
    ]);
    const revised = edited.data.nodes.find((node) => node.id === 'orders')?.fields.find((field) => field.id === 'note');
    expect(revised).toMatchObject({ description: 'revised note', status: 'added' });

    // Editing type without sending a description keeps the existing one.
    const keptDescription = reduceErActions(m, edited.data, [
      actOn(EDIT_FIELD, 'orders', { field: 'note', type: 'varchar', nullable: false }, 2),
    ]);
    const kept = keptDescription.data.nodes
      .find((node) => node.id === 'orders')
      ?.fields.find((field) => field.id === 'note');
    expect(kept).toMatchObject({ description: 'revised note', type: 'varchar' });

    // Editing only the description (type/nullable unchanged) does not flip an already-`same` field to `changed`.
    const described = reduceErActions(m, data, [
      actOn(
        EDIT_FIELD,
        'customers',
        { field: 'email', type: 'varchar', nullable: false, description: 'primary contact address' },
        3,
      ),
    ]);
    const email = described.data.nodes
      .find((node) => node.id === 'customers')
      ?.fields.find((field) => field.id === 'email');
    expect(email).toMatchObject({ description: 'primary contact address', status: 'same' });
  });
});

type RawField = { id: string; type: string } & Record<string, unknown>;

/** One referenced table plus one child table whose fields reference it. */
const schema = (fields: readonly RawField[], parentFields: readonly RawField[] = []) => ({
  tables: [
    { id: 'orders', name: 'Orders', fields: [{ id: 'id', type: 'uuid', key: 'PK' }, ...parentFields] },
    { id: 'child', name: 'Child', fields: [...fields] },
  ],
});

const relationOf = (fields: readonly RawField[], parentFields?: readonly RawField[]) => {
  const relations = parseErData({ after: schema(fields, parentFields) }).edges;
  expect(relations).toHaveLength(1);
  const relation = relations[0];
  if (!relation) throw new Error('missing relation');
  return relation;
};

describe('er diagram cardinality', () => {
  it('reads a plain required FK as one parent to zero or more children', () => {
    const relation = relationOf([
      { id: 'id', type: 'uuid', key: 'PK' },
      { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' },
    ]);
    expect(relation.cardinality).toEqual({ parent: '1', child: '0..N' });
    expect(relation.label).toBeNull();
  });

  it('reads a nullable FK as an optional parent', () => {
    expect(
      relationOf([{ id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id', nullable: true }]).cardinality,
    ).toEqual({ parent: '0..1', child: '0..N' });
  });

  it.each([
    ['a UQ key that references', { key: 'UQ' }],
    ['an FK that is also unique', { key: ['FK', 'UQ'] }],
    ['a whole primary key that is also the FK', { key: ['PK', 'FK'] }],
  ])('reads %s as at most one child per parent', (_, extra) => {
    expect(relationOf([{ id: 'order_id', type: 'uuid', ref: 'orders.id', ...extra }]).cardinality).toEqual({
      parent: '1',
      child: '0..1',
    });
  });

  it('keeps a column of a composite primary key many-valued', () => {
    const data = parseErData({
      after: {
        tables: [
          ...schema([]).tables.slice(0, 1),
          { id: 'products', name: 'Products', fields: [{ id: 'id', type: 'uuid', key: 'PK' }] },
          {
            id: 'order_items',
            name: 'Order items',
            fields: [
              { id: 'order_id', type: 'uuid', key: ['PK', 'FK'], ref: 'orders.id' },
              { id: 'product_id', type: 'uuid', key: ['PK', 'FK'], ref: 'products.id' },
            ],
          },
        ],
      },
    });
    expect(data.edges.map((edge) => edge.cardinality)).toEqual([
      { parent: '1', child: '0..N' },
      { parent: '1', child: '0..N' },
    ]);
    expect(data.nodes.find((node) => node.id === 'order_items')?.fields[0]?.keys).toEqual(['PK', 'FK']);
  });

  it('takes an explicitly declared cardinality and label over the derived one', () => {
    const relation = relationOf([
      { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id', cardinality: '1:1..N', label: 'contains' },
    ]);
    expect(relation.cardinality).toEqual({ parent: '1', child: '1..N' });
    expect(relation.label).toBe('contains');
    expect(
      relationOf([{ id: 'order_id', type: 'uuid', key: ['FK', 'UQ'], ref: 'orders.id', cardinality: '1:1' }])
        .cardinality,
    ).toEqual({ parent: '1', child: '1' });
  });

  it.each([
    ['a cardinality without a ref', { cardinality: '1:0..N' }],
    ['a label without a ref', { label: 'places' }],
    ['a required parent on a nullable FK', { ref: 'orders.id', nullable: true, cardinality: '1:0..N' }],
    ['an optional parent on a required FK', { ref: 'orders.id', cardinality: '0..1:0..N' }],
    ['many children on a unique FK', { ref: 'orders.id', key: ['FK', 'UQ'], cardinality: '1:0..N' }],
    ['an unknown cardinality', { ref: 'orders.id', cardinality: '1:N:M' }],
  ])('rejects %s', (_, extra) => {
    expect(() => parseErData({ after: schema([{ id: 'order_id', type: 'uuid', ...extra }]) })).toThrow();
  });

  it.each([
    ['the declared cardinality', { cardinality: '1:1..N' }],
    ['the label', { label: 'places' }],
    ['uniqueness', { key: ['FK', 'UQ'] }],
    ['nullability', { nullable: true }],
  ])('marks the FK field and its relation changed when %s changes', (_, extra) => {
    const fk = { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' };
    const data = parseErData({ before: schema([fk]), after: schema([{ ...fk, ...extra }]) });
    const field = data.nodes.find((node) => node.id === 'child')?.fields[0];
    expect(field?.status).toBe('changed');
    expect(data.edges[0]?.status).toBe('changed');
    expect(data.edges[0]?.before).toEqual({ cardinality: { parent: '1', child: '0..N' }, label: null });
  });

  it('leaves an untouched relation unchanged with no previous definition', () => {
    const fk = { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id', label: 'places' };
    const data = parseErData({ before: schema([fk]), after: schema([fk]) });
    expect(data.edges[0]?.status).toBe('same');
    expect(data.edges[0]?.before).toBeNull();
  });
});

describe('er diagram ports', () => {
  it('spreads relations that leave one referenced column so each end keeps its own symbol', () => {
    const data = parseErData({
      after: schema([
        { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' },
        { id: 'previous_id', type: 'uuid', key: 'FK', ref: 'orders.id', nullable: true },
      ]),
    });
    const orders = data.nodes.find((node) => node.id === 'orders');
    const child = data.nodes.find((node) => node.id === 'child');
    const centre = fieldOffset(orders?.fields ?? [], 'id');
    const out = data.edges.map((edge) => orders?.ports?.[edge.fromPort ?? '']?.y ?? Number.NaN);
    expect(out[0]).toBeLessThan(centre);
    expect(out[1]).toBeGreaterThan(centre);
    expect(((out[0] ?? 0) + (out[1] ?? 0)) / 2).toBe(centre);
    // Every FK column receives one relation: its end stays on the row's centre.
    expect(data.edges.map((edge) => child?.ports?.[edge.toPort ?? '']?.y)).toEqual([
      fieldOffset(child?.fields ?? [], 'order_id'),
      fieldOffset(child?.fields ?? [], 'previous_id'),
    ]);
  });

  it.each([
    [1, [0]],
    [2, [-7, 7]],
    [3, [-14, 0, 14]],
  ])('fans %i relations evenly around the row centre', (count, offsets) => {
    expect(Array.from({ length: count }, (_, index) => fanOffset(index, count))).toEqual(offsets);
  });
});

describe('er diagram grill questions', () => {
  /** The same schema on both sides, so only the authored `questions` differ. */
  const tables = (tableQuestions?: string, fieldQuestions?: string) => ({
    tables: [
      {
        id: 'inventory_reservations',
        name: '在庫予約',
        ...(tableQuestions === undefined ? {} : { questions: tableQuestions }),
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          {
            id: 'order_id',
            type: 'uuid',
            key: 'FK',
            ref: 'orders.id',
            ...(fieldQuestions === undefined ? {} : { questions: fieldQuestions }),
          },
        ],
      },
      { id: 'orders', name: '注文', fields: [{ id: 'id', type: 'uuid', key: 'PK' }] },
    ],
  });

  it('keeps a table’s and a column’s questions, taken from `after` and left out of the diff', () => {
    const data = parseErData({
      before: tables(),
      after: tables('Q1 Q4', 'Q1@billing'),
    });
    const table = data.nodes.find((node) => node.id === 'inventory_reservations');
    expect(table?.questions).toBe('Q1 Q4');
    expect(table?.status).toBe('same');
    expect(table?.fields.map((field) => [field.id, field.questions])).toEqual([
      ['id', null],
      ['order_id', 'Q1@billing'],
    ]);
    expect(table?.fields.every((field) => field.status === 'same')).toBe(true);
    // A table that names none carries no `questions` at all, so no badge is drawn.
    expect(data.nodes.find((node) => node.id === 'orders')?.questions).toBeUndefined();
  });

  it('marks the table and the column with data-grill-questions, and nothing on an unmarked one', async () => {
    const element = new DpkBoardErDiagram();
    element.data = parseErData({ after: tables('Q1 Q4', 'Q1@billing') });
    document.body.append(element);
    await settle(element);
    const root = element.renderRoot;
    const table = root.querySelector('[data-er-table="inventory_reservations"]');
    expect(table?.getAttribute('data-grill-questions')).toBe('Q1 Q4');
    expect(root.querySelector('[data-er-table="orders"]')?.hasAttribute('data-grill-questions')).toBe(false);
    expect(table?.querySelector('[data-field="order_id"]')?.getAttribute('data-grill-questions')).toBe('Q1@billing');
    expect(table?.querySelector('[data-field="id"]')?.hasAttribute('data-grill-questions')).toBe(false);
  });
});

/** Runs the right-click "Review comment" action for a node or an edge, assuming `element.id = 'schema'`. */
const openComment = async (element: DpkBoardErDiagram, kind: 'node' | 'edge', id: string): Promise<void> => {
  await settle(element);
  const ref = `element:schema/${kind}/${encodeURIComponent(id)}`;
  const request: ContextMenuRequest = { clientX: 0, clientY: 0, target: parseTargetRef(ref) };
  const entry = (element.getContextMenuItems(request) ?? [])
    .flatMap((group) => group.entries)
    .find((candidate) => candidate.id === 'review-comment');
  if (entry?.kind !== 'item') throw new Error(`missing "Review comment" entry for ${kind}/${id}`);
  entry.run();
  await settle(element);
  expect(element.renderRoot.querySelector('.comment-pop')).not.toBeNull();
};

describe('dpk-board-er-diagram', () => {
  it('lets long labels determine card and row heights instead of fixing them', async () => {
    const element = await mount();
    element.data = parseErData({
      after: {
        tables: [
          {
            id: 'UnbrokenInternationalCustomerAccountRegistrationHistory'.repeat(3),
            name: '長い日本語の顧客契約登録履歴管理テーブル'.repeat(3),
            fields: [{ id: '長いカラム識別子'.repeat(8), type: 'uuid', key: 'PK' }],
          },
        ],
      },
    });
    await settle(element);
    const card = element.renderRoot.querySelector<HTMLElement>('.er-table');
    const row = element.renderRoot.querySelector<HTMLElement>('.er-field');
    expect(card?.style.height).toBe('');
    expect(row?.style.height).toBe('');
    expect(element.renderRoot.querySelector('.er-name')?.textContent).toBe(element.data.nodes[0]?.id);
    expect(element.renderRoot.querySelector('.er-field-name')?.textContent).toBe(element.data.nodes[0]?.fields[0]?.id);
  });

  it('fits the whole schema on open instead of resetting to a literal 100%, which would clip wide tables and spaced-out aggregates', async () => {
    const fit = vi.spyOn(DpkDialogPanel.prototype, 'fit');
    const reset = vi.spyOn(DpkDialogPanel.prototype, 'reset');
    try {
      await mount();
      expect(fit).toHaveBeenCalled();
      expect(reset).not.toHaveBeenCalled();
    } finally {
      fit.mockRestore();
      reset.mockRestore();
    }
  });

  it('re-fits once real table sizes are measured, not just the layout-time estimate, so a card taller than estimated is not left clipped', async () => {
    // A table's layout height starts as a row-count estimate; real DOM geometry
    // (wrapped names, font metrics, borders) can come in noticeably taller —
    // simulate that gap with a measured card rect well past any estimate.
    const rect = (height: number) =>
      ({ width: 220, height, top: 0, left: 0, right: 220, bottom: height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const getRect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('er-table') ? rect(999) : rect(20);
      });
    const offsetWidth = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(220);
    const fit = vi.spyOn(DpkDialogPanel.prototype, 'fit');
    try {
      const element = await mount();
      for (let index = 0; index < 10; index++) await element.updateComplete;
      // Once on open (the estimate), once more after the real sizes land.
      expect(fit.mock.calls.length).toBeGreaterThanOrEqual(2);
    } finally {
      getRect.mockRestore();
      offsetWidth.mockRestore();
      fit.mockRestore();
    }
  });

  it('re-fits on entering or leaving fullscreen, whose canvas is a different shape than the one the last fit was for', async () => {
    const fit = vi.spyOn(DpkDialogPanel.prototype, 'fit');
    try {
      const element = await mount();
      const panel = element.renderRoot.querySelector<DpkDialogPanel>('dpk-dialog-panel');
      const maximize = panel?.shadowRoot?.querySelector<HTMLButtonElement>('.maximize');
      expect(maximize).not.toBeNull();
      const callsBeforeToggle = fit.mock.calls.length;

      maximize?.click();
      await settle(element);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(fit.mock.calls.length).toBeGreaterThan(callsBeforeToggle);

      const callsBeforeRestore = fit.mock.calls.length;
      maximize?.click();
      await settle(element);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(fit.mock.calls.length).toBeGreaterThan(callsBeforeRestore);
    } finally {
      fit.mockRestore();
    }
  });

  it('marks every table card with a data-dpk-target so Check Mode can offer it', async () => {
    const element = await mount();
    element.id = 'schema';
    await settle(element);
    const cards = [...element.renderRoot.querySelectorAll<HTMLElement>('[data-er-table]')];
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      const tableId = card.dataset['erTable'];
      expect(card.getAttribute('data-dpk-target')).toBe(`element:schema/node/${tableId}`);
    }
  });

  it('offers table cards as Check Mode targets, not just other board content', async () => {
    const element = await mount();
    element.id = 'schema';
    await settle(element);
    const state = withEnabled(EMPTY_CHECK_STATE, true);
    const bindings = collectCheckBindings(element, state, null);
    expect(bindings.map((binding) => binding.ref)).toContain('element:schema/node/orders');
  });

  it('leaves relation lines out of Check Mode: only the tables are checkable', async () => {
    const element = await mount();
    element.id = 'schema';
    await settle(element);
    expect(element.renderRoot.querySelectorAll('[data-relation]').length).toBeGreaterThan(0);
    const bindings = collectCheckBindings(element, withEnabled(EMPTY_CHECK_STATE, true), null);
    expect(bindings.length).toBeGreaterThan(0);
    expect(bindings.filter((binding) => binding.ref.includes('/edge/'))).toEqual([]);
    expect(bindings.filter((binding) => binding.target.matches('.er-edge'))).toEqual([]);
  });

  it('opens a comment only through "Review comment", never from selecting or focusing a table', async () => {
    const element = await mount();
    element.id = 'schema';
    await settle(element);
    const heading = element.renderRoot.querySelector<HTMLButtonElement>('[data-table="orders"]');
    heading?.focus();
    heading?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'node', id: 'orders' });
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    await openComment(element, 'node', 'orders');
  });

  it.each(['.dpk-btn--accent', '.dpk-btn:not(.dpk-btn--accent)'])('dismisses with Escape from %s', async (selector) => {
    const element = await mount();
    element.id = 'schema';
    await openComment(element, 'node', 'orders');
    element.renderRoot
      .querySelector(selector)
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
  });

  it('does not steal search focus when a filtered table reappears', async () => {
    const element = await mount();
    element.id = 'schema';
    await openComment(element, 'node', 'orders');
    const search = element.renderRoot.querySelector<HTMLInputElement>('.er-search input');
    if (!search) throw new Error('missing search');
    search.focus();
    search.value = 'no-matching-table';
    search.dispatchEvent(new Event('input'));
    await settle(element);
    // The composer is independent of the filter: it only closes on its own dismissal.
    expect(element.renderRoot.querySelector('.comment-pop')).not.toBeNull();
    search.value = 'orders';
    search.dispatchEvent(new Event('input'));
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-pop')).not.toBeNull();
    expect(element.shadowRoot?.activeElement).toBe(search);
  });

  it('preserves drafts per target and on rejected submission, and dismisses with Escape', async () => {
    const element = await mount();
    element.id = 'schema';
    await openComment(element, 'node', 'orders');
    const area = element.renderRoot.querySelector('textarea');
    if (!area) throw new Error('missing composer');
    area.value = 'Keep this draft';
    area.dispatchEvent(new Event('input'));
    await settle(element);
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
    await settle(element);
    // No accepting page/consumer: do not discard user input.
    expect(element.renderRoot.querySelector('[role="alert"]')?.textContent).toContain(diagramMessages('en').sendFailed);
    expect(element.renderRoot.querySelector('textarea')?.value).toBe('Keep this draft');
    await openComment(element, 'node', 'customers');
    expect(element.renderRoot.querySelector('textarea')?.value).toBe('');
    await openComment(element, 'node', 'orders');
    expect(element.renderRoot.querySelector('textarea')?.value).toBe('Keep this draft');
    element.renderRoot
      .querySelector('textarea')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
  });

  it('renders real SVG relations that can be selected for comments', async () => {
    const element = await mount();
    element.id = 'schema';
    await settle(element);
    const edge = element.renderRoot.querySelector('.d-edge-hit');
    expect(edge?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(element.renderRoot.querySelector('.er-end')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    // Crow's foot ends replace arrow heads.
    expect(element.renderRoot.querySelector('marker')).toBeNull();
    expect(element.renderRoot.querySelector('.er-cardinality')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    edge?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle(element);
    expect(element.selection?.kind).toBe('edge');
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    await openComment(element, 'edge', 'orders:id>inventory_reservations:order_id');
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
  });
  it('renders the always-on diff on tables, fields and relations', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelectorAll('[data-table]')).toHaveLength(4);
    expect(classes(element, 'orders')).toContain('is-changed');
    expect(classes(element, 'inventory_reservations')).toContain('is-added');
    expect(classes(element, 'payment_attempts')).toContain('is-removed');
    expect(element.renderRoot.querySelectorAll('.er-edge.is-added')).toHaveLength(1);
    expect(element.renderRoot.querySelectorAll('.er-edge.is-removed')).toHaveLength(1);
    expect(element.renderRoot.querySelectorAll('.er-cardinality')).toHaveLength(6);
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe(`4 ${m.node} · 3 ${m.edge}`);
    expect(
      element.renderRoot.querySelector('[data-er-table="orders"] .er-field.is-changed del')?.textContent,
    ).toContain('varchar');
    expect(
      element.renderRoot.querySelector('[data-er-table="orders"] .er-field.is-changed ins')?.textContent,
    ).toContain('order_status');
    expect(element.renderRoot.querySelector('[data-er-table="orders"] .er-field.is-added')?.textContent).toContain(
      'currency',
    );
  });

  it('draws each multiplicity in crow’s foot notation at its own end, and a changed one with its previous value', async () => {
    const element = await mount();
    const ends = (relation: string) =>
      [...element.renderRoot.querySelectorAll(`[data-relation="${relation}"] .er-cardinality`)].map((end) => [
        end.getAttribute('data-end'),
        end.textContent?.replace(/\s+/g, ' ').trim(),
      ]);
    const symbols = (relation: string) =>
      [...element.renderRoot.querySelectorAll(`[data-relation="${relation}"] .er-end`)].map((end) => [
        end.getAttribute('data-end'),
        end.getAttribute('data-multiplicity'),
      ]);
    expect(ends('customers:id>orders:customer_id')).toEqual([
      ['start', '1'],
      ['end', '0..N'],
    ]);
    expect(symbols('customers:id>orders:customer_id')).toEqual([
      ['start', '1'],
      ['end', '0..N'],
    ]);
    const fk = { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' };
    element.data = parseErData({
      before: schema([fk]),
      after: schema([{ ...fk, key: ['FK', 'UQ'], label: 'settles' }]),
    });
    await settle(element);
    const relation = 'orders:id>child:order_id';
    expect(element.renderRoot.querySelector(`[data-relation="${relation}"]`)?.classList).toContain('is-changed');
    expect(ends(relation)).toEqual([
      ['start', '1'],
      ['end', '0..N 0..1'],
    ]);
    expect(element.renderRoot.querySelector(`[data-relation="${relation}"] .er-was`)?.textContent).toBe('0..N');
    expect(element.renderRoot.querySelector(`[data-relation="${relation}"] .er-relation-label`)?.textContent).toBe(
      'settles',
    );
    // The row leads with the FK icon and names the key it cannot show; the rest of the change sits under it.
    const row = element.renderRoot.querySelector('[data-er-table="child"] .er-field[data-field="order_id"]');
    expect(row?.querySelector('.er-icon')?.getAttribute('data-icon')).toBe('foreign');
    expect([...(row?.querySelectorAll('.er-key') ?? [])].map((key) => key.textContent)).toEqual(['UQ']);
    expect(
      [...(row?.querySelectorAll('.er-delta') ?? [])].map((delta) => [
        delta.getAttribute('data-attribute'),
        delta.querySelector('del')?.textContent,
        delta.querySelector('ins')?.textContent,
      ]),
    ).toEqual([
      ['keys', 'FK', 'FK+UQ'],
      ['label', '—', '“settles”'],
    ]);
    expect(row?.querySelector('.er-field-type del')).toBeNull();
  });

  it('filters tables and fields by search text', async () => {
    const element = await mount();
    const input = element.renderRoot.querySelector<HTMLInputElement>('.er-search input');
    if (!input) throw new Error('missing search input');
    input.value = 'quantity';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await element.updateComplete;
    expect(
      [...element.renderRoot.querySelectorAll<HTMLElement>('[data-table]')].map((node) => node.dataset['table']),
    ).toEqual(['inventory_reservations']);
    expect(element.renderRoot.querySelectorAll('.er-field.is-match')).toHaveLength(1);
    input.value = 'nothing';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.diagram-empty')?.textContent).toContain(m.empty);
  });

  it('renders its stats in the element’s language', async () => {
    const ja = erDiagramMessages('ja');
    const element = await mount('ja');
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe(`4 ${ja.node} · 3 ${ja.edge}`);
  });

  it('highlights related tables without opening comments or bottom details', async () => {
    const element = await mount();
    element.id = 'schema';
    element.renderRoot.querySelector<HTMLButtonElement>('[data-table="orders"]')?.click();
    await element.updateComplete;
    expect(classes(element, 'orders')).toContain('is-selected');
    expect(classes(element, 'customers')).toContain('is-related');
    expect(classes(element, 'inventory_reservations')).toContain('is-related');
    // The removed relation still exists in the diff, so that table stays related.
    expect(classes(element, 'payment_attempts')).toContain('is-related');
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    await openComment(element, 'node', 'orders');
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('orders · 注文');
    expect(element.renderRoot.querySelector('[data-field-comment]')).toBeNull();
    expect(element.commentTargets.some((target) => target.value.includes('/field/'))).toBe(false);
  });

  const litOf = (element: DpkBoardErDiagram, selector: string) =>
    [...element.renderRoot.querySelectorAll<HTMLElement>(`${selector}.is-lit`)].map(
      (item) =>
        item.dataset['relation'] ??
        item.dataset['erTable'] ??
        `${item.closest<HTMLElement>('[data-er-table]')?.dataset['erTable']}.${item.dataset['field']}`,
    );

  it('lights a hovered table, its neighbours, their relations and the joined columns, fading only the other relations', async () => {
    const element = await mount();
    const card = element.renderRoot.querySelector('[data-er-table="customers"]');
    card?.dispatchEvent(new Event('pointerenter'));
    await element.updateComplete;
    expect(classes(element, 'customers')).toContain('is-lit');
    expect(classes(element, 'orders')).toContain('is-lit');
    expect(classes(element, 'inventory_reservations')).not.toContain('is-lit');
    expect(litOf(element, '.er-edge')).toEqual(['customers:id>orders:customer_id']);
    expect(litOf(element, '.er-field')).toEqual(['customers.id', 'orders.customer_id']);
    expect(element.renderRoot.querySelector('.is-dimmed')).toBeNull();
    expect(
      element.renderRoot.querySelector('[data-relation="orders:id>inventory_reservations:order_id"]')?.classList,
    ).toContain('is-faded');
    card?.dispatchEvent(new Event('pointerleave'));
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.is-lit')).toBeNull();
    expect(element.renderRoot.querySelector('.is-faded')).toBeNull();
  });

  it('traces one key from a hovered column row, and the whole table again once the pointer leaves the row', async () => {
    const element = await mount();
    const card = element.renderRoot.querySelector('[data-er-table="orders"]');
    const row = card?.querySelector('.er-field[data-field="customer_id"]');
    card?.dispatchEvent(new Event('pointerenter'));
    row?.dispatchEvent(new Event('pointerenter'));
    await element.updateComplete;
    expect(litOf(element, '.er-edge')).toEqual(['customers:id>orders:customer_id']);
    expect(litOf(element, '.er-field')).toEqual(['customers.id', 'orders.customer_id']);
    expect(litOf(element, '.er-table')).toEqual(['customers', 'orders']);
    row?.dispatchEvent(new Event('pointerleave'));
    await element.updateComplete;
    expect(litOf(element, '.er-edge')).toHaveLength(3);
  });

  it('lights the two columns a hovered relation joins', async () => {
    const element = await mount();
    element.renderRoot
      .querySelector('[data-relation="orders:id>inventory_reservations:order_id"]')
      ?.dispatchEvent(new Event('pointerenter'));
    await element.updateComplete;
    expect(litOf(element, '.er-field')).toEqual(['orders.id', 'inventory_reservations.order_id']);
    expect(litOf(element, '.er-table')).toEqual(['orders', 'inventory_reservations']);
  });

  it('keeps the hovered relation on the line under the pointer while it moves on top', async () => {
    const element = await mount();
    const hovered = element.renderRoot.querySelector('[data-relation="customers:id>orders:customer_id"]');
    hovered?.dispatchEvent(new Event('pointerenter'));
    await element.updateComplete;
    expect(hovered?.getAttribute('data-relation')).toBe('customers:id>orders:customer_id');
    expect(hovered?.classList).toContain('is-lit');
    hovered?.dispatchEvent(new Event('pointerleave'));
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.er-edge.is-lit')).toBeNull();
  });

  it('keeps unrelated tables undimmed while one is selected, and lights it like a hover', async () => {
    const element = await mount();
    element.renderRoot.querySelector<HTMLButtonElement>('[data-table="inventory_reservations"]')?.click();
    await element.updateComplete;
    expect(classes(element, 'inventory_reservations')).toEqual(expect.arrayContaining(['is-selected', 'is-lit']));
    expect(classes(element, 'orders')).toContain('is-lit');
    expect(classes(element, 'customers')).not.toContain('is-lit');
    expect(element.renderRoot.querySelector('.is-dimmed')).toBeNull();
  });

  it('forgets a hovered table the search removed, in the same update', async () => {
    const element = await mount();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    element.renderRoot.querySelector('[data-er-table="customers"]')?.dispatchEvent(new Event('pointerenter'));
    await element.updateComplete;
    const search = async (value: string) => {
      const input = element.renderRoot.querySelector<HTMLInputElement>('.er-search input');
      if (!input) throw new Error('missing search input');
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await settle(element);
    };
    await search('quantity');
    await search('');
    expect(element.renderRoot.querySelector('.is-lit')).toBeNull();
    // Lit warns when updated() schedules another update.
    expect(warn.mock.calls.flat().join(' ')).not.toContain('scheduled an update');
    warn.mockRestore();
  });

  it('opens the same contextual composer for a relationship', async () => {
    const element = await mount();
    element.id = 'schema';
    await openComment(element, 'edge', 'orders:id>inventory_reservations:order_id');
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe(
      'orders.id → inventory_reservations.order_id',
    );
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
  });

  describe('column actions', () => {
    const id = (n: number) => `a${n}`;
    const act = (type: string, table: string, payload: Record<string, unknown>, n = 0) => ({
      id: id(n),
      type,
      target: { type: 'element', id: `erd/node/${table}` },
      payload,
      createdAt: '2026-10-20T00:00:00.000Z',
    });
    const field = (data: ReturnType<typeof parseErData>, table: string, name: string) =>
      data.nodes.find((node) => node.id === table)?.fields.find((item) => item.id === name);

    it('adds a column as an added row and re-anchors the relations', () => {
      const data = parseErData(raw);
      const out = reduceErActions(m, data, [act('ADD_FIELD', 'orders', { id: 'note', type: 'text' })]);
      expect(field(out.data, 'orders', 'note')).toMatchObject({ status: 'added', type: 'text' });
      expect(out.results[0]?.stale).toBeUndefined();
      const orders = out.data.nodes.find((node) => node.id === 'orders');
      expect(orders?.height).toBe(tableHeight(orders?.fields ?? []));
    });

    it('rejects a duplicate column and an unknown table', () => {
      const data = parseErData(raw);
      const out = reduceErActions(m, data, [
        act('ADD_FIELD', 'orders', { id: 'status', type: 'text' }, 0),
        act('ADD_FIELD', 'nope', { id: 'x', type: 'text' }, 1),
        act('NOPE', 'orders', {}, 2),
      ]);
      expect(out.results.map((result) => result.stale)).toEqual([
        'constraint-violated',
        'target-missing',
        'unsupported-action-type',
      ]);
    });

    it('edits a column as a changed row that keeps its previous definition, and reverts to same', () => {
      const data = parseErData(raw);
      const edited = reduceErActions(m, data, [
        act('EDIT_FIELD', 'orders', { field: 'total_amount', type: 'bigint', nullable: false }),
      ]);
      expect(field(edited.data, 'orders', 'total_amount')).toMatchObject({
        status: 'changed',
        type: 'bigint',
        before: { type: 'integer' },
      });
      expect(edited.data.nodes.find((node) => node.id === 'orders')?.status).toBe('changed');
      const reverted = reduceErActions(m, data, [
        act('EDIT_FIELD', 'customers', { field: 'email', type: 'text', nullable: false }, 0),
        act('EDIT_FIELD', 'customers', { field: 'email', type: 'varchar', nullable: false }, 1),
      ]);
      expect(field(reverted.data, 'customers', 'email')?.status).toBe('same');
      expect(reverted.data.nodes.find((node) => node.id === 'customers')?.status).toBe('same');
    });

    it('does not edit a relation column', () => {
      const out = reduceErActions(m, parseErData(raw), [
        act('EDIT_FIELD', 'orders', { field: 'customer_id', type: 'text', nullable: true }),
      ]);
      expect(out.results[0]?.stale).toBe('constraint-violated');
    });

    it('deletes a column just added outright, and an existing one as a removed row', () => {
      const data = parseErData(raw);
      const added = reduceErActions(m, data, [
        act('ADD_FIELD', 'orders', { id: 'note', type: 'text' }, 0),
        act('DELETE_FIELD', 'orders', { field: 'note' }, 1),
      ]);
      expect(field(added.data, 'orders', 'note')).toBeUndefined();
      expect(added.results[1]?.stale).toBeUndefined();

      const removed = reduceErActions(m, data, [act('DELETE_FIELD', 'customers', { field: 'email' })]);
      expect(field(removed.data, 'customers', 'email')).toMatchObject({ status: 'removed' });
      expect(removed.results[0]?.tone).toBe('delete');
    });

    it('deletes an FK column and a column other tables reference, taking their relations down with them', () => {
      const data = parseErData(raw);
      const out = reduceErActions(m, data, [
        act('DELETE_FIELD', 'orders', { field: 'customer_id' }, 0),
        act('DELETE_FIELD', 'orders', { field: 'id' }, 1),
        act('DELETE_FIELD', 'orders', { field: 'nope' }, 2),
      ]);
      expect(out.results.map((result) => result.stale)).toEqual([undefined, undefined, 'target-missing']);
      expect(field(out.data, 'orders', 'customer_id')).toMatchObject({ status: 'removed' });
      expect(field(out.data, 'orders', 'id')).toMatchObject({ status: 'removed' });
      // Every relation either deleted column carried, on either end, is gone from the diagram too.
      const edgeIds = out.data.edges.map((edge) => edge.id);
      expect(edgeIds).not.toContain('customers:id>orders:customer_id');
      expect(edgeIds).not.toContain('orders:id>payment_attempts:order_id');
      expect(edgeIds).not.toContain('orders:id>inventory_reservations:order_id');
    });

    it('fieldRelations lists what a column carries, as either its own ref or one pointed at it', () => {
      const data = parseErData(raw);
      expect(fieldRelations(data, 'orders', 'customer_id').map((relation) => relation.id)).toEqual([
        'customers:id>orders:customer_id',
      ]);
      expect(
        fieldRelations(data, 'orders', 'id')
          .map((relation) => relation.id)
          .sort(),
      ).toEqual(['orders:id>inventory_reservations:order_id', 'orders:id>payment_attempts:order_id'].sort());
      expect(fieldRelations(data, 'orders', 'status')).toEqual([]);
    });

    it('still rejects deleting an already-removed column', () => {
      const data = parseErData(raw);
      const deleted = reduceErActions(m, data, [act('DELETE_FIELD', 'customers', { field: 'email' })]).data;
      const out = reduceErActions(m, deleted, [act('DELETE_FIELD', 'customers', { field: 'email' })]);
      expect(out.results[0]?.stale).toBe('constraint-violated');
    });

    it("edits a relation's cardinality as a changed edge that keeps its previous value, and reverts to same", () => {
      const data = parseErData(raw);
      const edgeId = 'customers:id>orders:customer_id';
      const actEdge = (cardinality: string, n = 0) => ({
        id: id(n),
        type: 'EDIT_CARDINALITY',
        target: { type: 'element', id: `erd/edge/${edgeId}` },
        payload: { cardinality },
        createdAt: '2026-10-20T00:00:00.000Z',
      });
      const edge = (schema: ReturnType<typeof parseErData>) => schema.edges.find((item) => item.id === edgeId);
      const original = edge(data)?.cardinality;
      const edited = reduceErActions(m, data, [actEdge('1:1')]);
      expect(edge(edited.data)).toMatchObject({ status: 'changed', cardinality: { parent: '1', child: '1' } });
      expect(edge(edited.data)?.before).toMatchObject({ cardinality: original });
      const reverted = reduceErActions(m, data, [
        actEdge('1:1', 0),
        actEdge(`${original?.parent}:${original?.child}`, 1),
      ]);
      expect(edge(reverted.data)?.status).toBe('same');
    });

    it('rejects an unknown cardinality and an unknown relation', () => {
      const data = parseErData(raw);
      const out = reduceErActions(m, data, [
        {
          id: id(0),
          type: 'EDIT_CARDINALITY',
          target: { type: 'element', id: 'erd/edge/customers:id>orders:customer_id' },
          payload: { cardinality: 'nope' },
          createdAt: '2026-10-20T00:00:00.000Z',
        },
        {
          id: id(1),
          type: 'EDIT_CARDINALITY',
          target: { type: 'element', id: 'erd/edge/nope' },
          payload: { cardinality: '1:1' },
          createdAt: '2026-10-20T00:00:00.000Z',
        },
      ]);
      expect(out.results.map((result) => result.stale)).toEqual(['constraint-violated', 'target-missing']);
    });

    it('records a typed column through the hosting template', async () => {
      const element = new DpkBoardErDiagram();
      element.id = 'erd';
      element.data = parseErData(raw);
      document.body.append(element);
      await settle(element);
      let seen: unknown = null;
      element.addEventListener('dpk-element-action', (event) => {
        if (!(event instanceof CustomEvent)) return;
        event.preventDefault();
        seen = event.detail;
      });
      element.renderRoot
        .querySelector<HTMLButtonElement>('[data-er-table="orders"] [data-action="add-field"]')
        ?.click();
      await settle(element);
      const name = element.renderRoot.querySelector<HTMLInputElement>('[data-input="add-name"]');
      const type = element.renderRoot.querySelector<HTMLInputElement>('[data-input="add-type"]');
      if (!name || !type) throw new Error('no inputs');
      name.value = 'note';
      name.dispatchEvent(new Event('input'));
      type.value = 'text';
      type.dispatchEvent(new Event('input'));
      type.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await settle(element);
      expect(seen).toMatchObject({
        type: 'ADD_FIELD',
        target: 'element:erd/node/orders',
        payload: { id: 'note', type: 'text' },
      });
    });

    it('offers no column editing without an id, which every recorded change is addressed by', async () => {
      const element = await mount();
      expect(element.renderRoot.querySelector('[data-er-table="orders"]')).not.toBeNull();
      expect(element.renderRoot.querySelector('[data-action="add-field"]')).toBeNull();
      expect(element.renderRoot.querySelector('[data-action="edit-field"]')).toBeNull();
    });

    it('shows an error and keeps the input when no template records it', async () => {
      const element = new DpkBoardErDiagram();
      element.id = 'erd';
      element.data = parseErData(raw);
      document.body.append(element);
      await settle(element);
      element.renderRoot
        .querySelector<HTMLButtonElement>('[data-er-table="orders"] [data-action="add-field"]')
        ?.click();
      await settle(element);
      const name = element.renderRoot.querySelector<HTMLInputElement>('[data-input="add-name"]');
      const type = element.renderRoot.querySelector<HTMLInputElement>('[data-input="add-type"]');
      if (!name || !type) throw new Error('no inputs');
      name.value = 'note';
      name.dispatchEvent(new Event('input'));
      type.value = 'text';
      type.dispatchEvent(new Event('input'));
      type.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await settle(element);
      expect(element.renderRoot.querySelector('.er-editor [role="alert"]')).not.toBeNull();
    });

    const options = (element: DpkBoardErDiagram) =>
      [...element.renderRoot.querySelectorAll('.er-editor [role="option"]')].map((option) =>
        option.getAttribute('data-type'),
      );

    const mountRecording = async () => {
      const element = new DpkBoardErDiagram();
      element.id = 'erd';
      element.data = parseErData(raw);
      document.body.append(element);
      await settle(element);
      const seen: unknown[] = [];
      element.addEventListener('dpk-element-action', (event) => {
        if (!(event instanceof CustomEvent)) return;
        event.preventDefault();
        seen.push(event.detail);
      });
      const query = <T extends Element>(selector: string): T => {
        const found = element.renderRoot.querySelector<T>(selector);
        if (!found) throw new Error(`no ${selector}`);
        return found;
      };
      const type = (input: HTMLInputElement, value: string) => {
        input.value = value;
        input.dispatchEvent(new Event('input'));
      };
      return { element, seen, query, type };
    };

    it('saves an edited type and nullability with the Save button, once something changed', async () => {
      const { element, seen, query, type } = await mountRecording();
      query<HTMLButtonElement>('[data-er-table="orders"] [data-action="edit-field"][data-field="status"]').click();
      await settle(element);
      const save = query<HTMLButtonElement>('.er-editor [data-action="submit-column"]');
      expect(element.shadowRoot?.activeElement).toBe(query('[data-input="edit-type"]'));
      expect(save.disabled).toBe(true);
      type(query('[data-input="edit-type"]'), 'order_status');
      const nullable = query<HTMLInputElement>('[data-input="nullable"]');
      nullable.checked = true;
      nullable.dispatchEvent(new Event('change'));
      await settle(element);
      expect(save.disabled).toBe(false);
      save.click();
      await settle(element);
      expect(seen).toMatchObject([
        {
          type: 'EDIT_FIELD',
          target: 'element:erd/node/orders',
          payload: { field: 'status', type: 'order_status', nullable: true },
        },
      ]);
      expect(element.renderRoot.querySelector('.er-editor')).toBeNull();
    });

    it('moves from the name to the type on Enter, and refuses a name the table already uses', async () => {
      const { element, seen, query, type } = await mountRecording();
      query<HTMLButtonElement>('[data-er-table="orders"] [data-action="add-field"]').click();
      await settle(element);
      const name = query<HTMLInputElement>('[data-input="add-name"]');
      expect(element.shadowRoot?.activeElement).toBe(name);
      type(name, 'status');
      name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await settle(element);
      expect(element.shadowRoot?.activeElement).toBe(query('[data-input="add-type"]'));
      type(query('[data-input="add-type"]'), 'text');
      await settle(element);
      expect(query('.er-editor [role="status"]').textContent).toContain(m.columnNameTaken);
      expect(query<HTMLButtonElement>('[data-action="submit-column"]').disabled).toBe(true);
      query<HTMLButtonElement>('[data-action="submit-column"]').click();
      await settle(element);
      expect(seen).toEqual([]);
    });

    it('closes on Cancel without recording, and gives focus back to the button that opened it', async () => {
      const { element, seen, query, type } = await mountRecording();
      query<HTMLButtonElement>('[data-er-table="orders"] [data-action="add-field"]').click();
      await settle(element);
      type(query('[data-input="add-name"]'), 'note');
      query<HTMLButtonElement>('[data-action="cancel-column"]').click();
      await settle(element);
      await settle(element);
      expect(element.renderRoot.querySelector('.er-editor')).toBeNull();
      expect(element.shadowRoot?.activeElement).toBe(query('[data-er-table="orders"] [data-action="add-field"]'));
      expect(seen).toEqual([]);
    });

    it('keeps the typed input after Escape, and discards it on Cancel', async () => {
      const { element, query, type } = await mountRecording();
      const open = async () => {
        query<HTMLButtonElement>('[data-er-table="orders"] [data-action="add-field"]').click();
        await settle(element);
      };
      await open();
      type(query('[data-input="add-name"]'), 'note');
      query('[data-input="add-name"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle(element);
      expect(element.renderRoot.querySelector('.er-editor')).toBeNull();
      await open();
      expect(query<HTMLInputElement>('[data-input="add-name"]').value).toBe('note');
      query<HTMLButtonElement>('[data-action="cancel-column"]').click();
      await settle(element);
      await open();
      expect(query<HTMLInputElement>('[data-input="add-name"]').value).toBe('');
    });

    it('floats the editor beside the row it edits, which stays in place and marked', async () => {
      const { element, query } = await mountRecording();
      const pencil = query<HTMLButtonElement>(
        '[data-er-table="orders"] [data-action="edit-field"][data-field="status"]',
      );
      expect(pencil.getAttribute('aria-expanded')).toBe('false');
      pencil.click();
      await settle(element);
      const editor = query<HTMLElement>('.er-editor');
      expect(editor.getAttribute('popover')).toBe('manual');
      expect(editor.closest('[data-er-table]')).toBeNull();
      expect(editor.querySelector('.er-editor-target')?.textContent).toBe('orders.status');
      const row = query<HTMLElement>('[data-er-table="orders"] .er-field[data-field="status"]');
      expect(row.classList).toContain('is-editing');
      expect(row.querySelector('.er-field-type')).not.toBeNull();
      expect(pencil.getAttribute('aria-expanded')).toBe('true');
      expect(editor.getAttribute('aria-label')).toContain('orders.status');
    });

    it('offers every type in the schema while the search hides other tables', async () => {
      const { element, query } = await mountRecording();
      const search = query<HTMLInputElement>('.er-search input');
      search.value = 'orders';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await settle(element);
      expect(element.renderRoot.querySelector('[data-er-table="customers"]')).toBeNull();
      query<HTMLButtonElement>('[data-er-table="orders"] [data-action="add-field"]').click();
      await settle(element);
      query<HTMLInputElement>('[data-input="add-type"]').click();
      await settle(element);
      expect(options(element)).toContain('varchar');
    });

    describe('type combobox', () => {
      const press = (input: HTMLInputElement, key: string, init: KeyboardEventInit = {}) =>
        input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
      const editStatus = async () => {
        const recording = await mountRecording();
        recording
          .query<HTMLButtonElement>('[data-er-table="orders"] [data-action="edit-field"][data-field="status"]')
          .click();
        await settle(recording.element);
        return { ...recording, input: recording.query<HTMLInputElement>('[data-input="edit-type"]') };
      };

      it('keeps its list closed until the input is clicked, then lists every type with the current one highlighted', async () => {
        const { element, input } = await editStatus();
        expect(input.getAttribute('role')).toBe('combobox');
        expect(element.shadowRoot?.activeElement).toBe(input);
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(options(element)).toEqual([]);
        input.click();
        await settle(element);
        expect(input.getAttribute('aria-expanded')).toBe('true');
        expect(options(element)).toEqual(['bigint', 'char(3)', 'integer', 'order_status', 'uuid', 'varchar']);
        const active = element.renderRoot.querySelector('.er-editor [role="option"][aria-selected="true"]');
        expect(active?.getAttribute('data-type')).toBe('order_status');
        expect(input.getAttribute('aria-activedescendant')).toBe(active?.id);
      });

      it('narrows while typing, offers what was typed as a new type, and takes the highlighted one on Enter', async () => {
        const { element, seen, input, type } = await editStatus();
        type(input, 'int');
        await settle(element);
        expect(options(element)).toEqual(['integer', 'bigint', 'int']);
        expect(element.renderRoot.querySelector('.er-editor [role="option"][data-kind="new"]')?.textContent).toContain(
          m.columnTypeNew,
        );
        press(input, 'ArrowDown');
        await settle(element);
        press(input, 'Enter');
        await settle(element);
        expect(input.value).toBe('bigint');
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(seen).toEqual([]);
        press(input, 'Enter');
        await settle(element);
        expect(seen).toMatchObject([{ type: 'EDIT_FIELD', payload: { field: 'status', type: 'bigint' } }]);
      });

      it('records a type the schema does not use yet with one Enter', async () => {
        const { element, seen, input, type } = await editStatus();
        type(input, 'jsonb');
        await settle(element);
        expect(options(element)).toEqual(['jsonb']);
        press(input, 'Enter');
        await settle(element);
        expect(seen).toMatchObject([{ type: 'EDIT_FIELD', payload: { field: 'status', type: 'jsonb' } }]);
      });

      it('takes a clicked type, keeping the focus in the input', async () => {
        const { element, query, input } = await editStatus();
        input.click();
        await settle(element);
        const option = query('.er-editor [role="option"][data-type="uuid"]');
        option.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await settle(element);
        expect(input.value).toBe('uuid');
        expect(element.shadowRoot?.activeElement).toBe(input);
        expect(options(element)).toEqual([]);
      });

      it('closes the list on Escape before the editor, and leaves Enter to the IME while it composes', async () => {
        const { element, input, type } = await editStatus();
        type(input, 'int');
        await settle(element);
        press(input, 'Enter', { isComposing: true });
        await settle(element);
        expect(input.value).toBe('int');
        press(input, 'Escape');
        await settle(element);
        expect(options(element)).toEqual([]);
        expect(element.renderRoot.querySelector('.er-editor')).not.toBeNull();
        press(input, 'ArrowDown');
        await settle(element);
        expect(options(element)).toEqual(['integer', 'bigint', 'int']);
        press(input, 'Escape');
        await settle(element);
        press(input, 'Escape');
        await settle(element);
        expect(element.renderRoot.querySelector('.er-editor')).toBeNull();
      });
    });

    it('closes with its trigger or a press outside, keeping the input, and moves to another column', async () => {
      const { element, query, type } = await mountRecording();
      const add = query<HTMLButtonElement>('[data-er-table="orders"] [data-action="add-field"]');
      add.click();
      await settle(element);
      type(query('[data-input="add-name"]'), 'note');
      add.click();
      await settle(element);
      expect(element.renderRoot.querySelector('.er-editor')).toBeNull();
      add.click();
      await settle(element);
      expect(query<HTMLInputElement>('[data-input="add-name"]').value).toBe('note');
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      await settle(element);
      expect(element.renderRoot.querySelector('.er-editor')).toBeNull();
      add.click();
      await settle(element);
      query<HTMLButtonElement>('[data-er-table="orders"] [data-action="edit-field"][data-field="status"]').click();
      await settle(element);
      expect(query('.er-editor').getAttribute('data-kind')).toBe('edit');
      add.click();
      await settle(element);
      expect(query<HTMLInputElement>('[data-input="add-name"]').value).toBe('note');
    });

    it("deletes any present column from its editor's danger button, warning first when relations will go too", async () => {
      const { element, seen, query } = await mountRecording();

      // customer_id is an FK column: it is still editable to reach Delete, but Save never activates
      // (a relation's multiplicities follow the column it is anchored to, see editorVerdict), and deleting
      // it warns that the one relation it carries goes with it.
      query<HTMLButtonElement>('[data-er-table="orders"] [data-action="edit-field"][data-field="customer_id"]').click();
      await settle(element);
      expect(query<HTMLButtonElement>('[data-action="submit-column"]').disabled).toBe(true);
      expect(query('.er-editor-note').textContent).toContain('1');
      query<HTMLButtonElement>('[data-action="cancel-column"]').click();
      await settle(element);

      // id is referenced by two relations (payment_attempts.order_id and inventory_reservations.order_id):
      // its editor warns both go with it, and deleting it records the one action.
      query<HTMLButtonElement>('[data-er-table="orders"] [data-action="edit-field"][data-field="id"]').click();
      await settle(element);
      expect(query('.er-editor-note').textContent).toContain('2');
      query<HTMLButtonElement>('.er-editor [data-action="delete-column"]').click();
      expect(seen).toMatchObject([{ type: 'DELETE_FIELD', payload: { field: 'id' } }]);
      await settle(element);
      expect(element.renderRoot.querySelector('.er-editor')).toBeNull();

      // status is a plain column with no relation: its editor offers the delete button with no note.
      query<HTMLButtonElement>('[data-er-table="orders"] [data-action="edit-field"][data-field="status"]').click();
      await settle(element);
      expect(element.renderRoot.querySelector('.er-editor-note')).toBeNull();
      query<HTMLButtonElement>('.er-editor [data-action="delete-column"]').click();
      expect(seen).toMatchObject([
        { type: 'DELETE_FIELD', payload: { field: 'id' } },
        { type: 'DELETE_FIELD', payload: { field: 'status' } },
      ]);
      await settle(element);
      expect(element.renderRoot.querySelector('.er-editor')).toBeNull();
    });

    it('opens a cardinality editor for the selected relation and commits a picked multiplicity at once, with no Save', async () => {
      const { element, seen, query } = await mountRecording();
      const edgeId = 'customers:id>orders:customer_id';
      query<SVGElement>(`[data-relation="${edgeId}"] .d-edge-hit`).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await settle(element);
      const editor = query<HTMLElement>('.er-cardinality-editor');
      expect(editor.getAttribute('aria-label')).toContain('customers.id');
      expect(editor.querySelector('.er-editor-foot')).toBeNull();
      const trigger = query<HTMLButtonElement>('.er-cardinality-editor .dpk-rich-select');
      expect(trigger.textContent).toContain('1 : 0..N');
      trigger.click();
      await settle(element);
      query<HTMLElement>('.dpk-rich-select-option[data-value="1:1"]').click();
      await settle(element);
      expect(seen).toMatchObject([
        {
          type: 'EDIT_CARDINALITY',
          target: `element:erd/edge/${encodeURIComponent(edgeId)}`,
          payload: { cardinality: '1:1' },
        },
      ]);
      // Still open: a pick commits but does not deselect the edge.
      expect(query<HTMLElement>('.er-cardinality-editor')).not.toBeNull();
      element.select(null);
      await settle(element);
      expect(element.renderRoot.querySelector('.er-cardinality-editor')).toBeNull();
    });

    it('leads each row with the icon of its strongest role', async () => {
      const element = await mount();
      const icons = [...element.renderRoot.querySelectorAll('[data-er-table="orders"] .er-field .er-icon')].map(
        (icon) => [icon.getAttribute('data-icon'), icon.getAttribute('aria-label')],
      );
      expect(icons).toEqual([
        ['primary', m.columnRole('primary')],
        ['foreign', m.columnRole('foreign')],
        ['not-null', m.columnRole('not-null')],
        ['not-null', m.columnRole('not-null')],
        ['nullable', m.columnRole('nullable')],
      ]);
    });
  });

  describe('design attributes', () => {
    const raw2 = {
      after: {
        tables: [
          {
            id: 'customers',
            name: '顧客',
            tags: ['顧客'],
            boundedContext: '認証',
            aggregate: '顧客集約',
            pattern: 'immutable',
            fields: [
              { id: 'id', type: 'uuid', key: 'PK' },
              { id: 'email', type: 'varchar', key: 'UQ' },
              { id: 'note', type: 'text' },
            ],
          },
          {
            id: 'profiles',
            name: 'プロフィール',
            tags: [],
            aggregate: '顧客集約',
            fields: [
              { id: 'id', type: 'uuid', key: 'PK' },
              { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
            ],
          },
        ],
      },
    };

    const mount2 = async (): Promise<DpkBoardErDiagram> => {
      const element = new DpkBoardErDiagram();
      element.data = parseErData(raw2);
      document.body.append(element);
      await settle(element);
      return element;
    };

    it('folds the Bounded Context into the tag filter, shows a pattern badge only where declared, and labels the aggregate group', async () => {
      const element = await mount2();
      const filter = element.renderRoot.querySelector('dpk-tag-filter') as unknown as {
        tags: readonly (string | { readonly tag: string; readonly count?: number })[];
      } | null;
      expect(filter).not.toBeNull();
      const tags = (filter?.tags ?? []).map((option) => (typeof option === 'string' ? option : option.tag));
      expect(tags).toContain('BC:認証');

      const badge = element.renderRoot.querySelector('[data-er-table="customers"] .er-pattern-badge');
      expect(badge?.getAttribute('data-pattern')).toBe('immutable');
      expect(element.renderRoot.querySelector('[data-er-table="profiles"] .er-pattern-badge')).toBeNull();

      const label = element.renderRoot.querySelector('.er-aggregate-label');
      expect(label?.textContent).toContain('顧客集約');
    });

    it("folds each table into the layout's generic group by its aggregate, and leaves it unset outside one", () => {
      const data = parseErData({
        after: {
          tables: [
            { id: 'customers', name: '顧客', tags: [], aggregate: '顧客集約', fields: [] },
            { id: 'profiles', name: 'プロフィール', tags: [], aggregate: '顧客集約', fields: [] },
            { id: 'logs', name: 'ログ', tags: [], fields: [] },
          ],
        },
      });
      const byId = new Map(data.nodes.map((node) => [node.id, node]));
      expect(byId.get('customers')?.group).toBe('顧客集約');
      expect(byId.get('profiles')?.group).toBe('顧客集約');
      expect(byId.get('logs')?.group).toBeUndefined();
    });

    it('never overlaps two aggregates’ frames, each drawn around its own member tables only', async () => {
      const element = new DpkBoardErDiagram();
      element.data = parseErData({
        after: {
          tables: [
            {
              id: 'customers',
              name: '顧客',
              tags: [],
              aggregate: '顧客集約',
              fields: [
                { id: 'id', type: 'uuid', key: 'PK' },
                { id: 'email', type: 'varchar' },
              ],
            },
            {
              id: 'profiles',
              name: 'プロフィール',
              tags: [],
              aggregate: '顧客集約',
              fields: [
                { id: 'id', type: 'uuid', key: 'PK' },
                { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
                { id: 'display_name', type: 'varchar' },
                { id: 'bio', type: 'text' },
              ],
            },
            {
              id: 'orders',
              name: '注文',
              tags: [],
              aggregate: '注文集約',
              fields: [
                { id: 'id', type: 'uuid', key: 'PK' },
                { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
              ],
            },
            {
              id: 'order_items',
              name: '注文明細',
              tags: [],
              aggregate: '注文集約',
              fields: [
                { id: 'id', type: 'uuid', key: 'PK' },
                { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' },
              ],
            },
          ],
        },
      });
      document.body.append(element);
      await settle(element);

      const frames = [...element.renderRoot.querySelectorAll<HTMLElement>('.er-aggregate')];
      expect(frames).toHaveLength(2);
      const boxOf = (frame: HTMLElement) => ({
        left: Number.parseFloat(frame.style.left),
        top: Number.parseFloat(frame.style.top),
        width: Number.parseFloat(frame.style.width),
        height: Number.parseFloat(frame.style.height),
      });
      const [a, b] = frames.map(boxOf) as [ReturnType<typeof boxOf>, ReturnType<typeof boxOf>];
      const overlapsX = a.left < b.left + b.width && b.left < a.left + a.width;
      const overlapsY = a.top < b.top + b.height && b.top < a.top + a.height;
      expect(overlapsX && overlapsY).toBe(false);
    });

    describe('Bounded Context layout and filter', () => {
      const boxOf = (frame: Element) => {
        const style = (frame as HTMLElement).style;
        return {
          left: Number.parseFloat(style.left),
          top: Number.parseFloat(style.top),
          width: Number.parseFloat(style.width),
          height: Number.parseFloat(style.height),
        };
      };
      const contains = (outer: ReturnType<typeof boxOf>, inner: ReturnType<typeof boxOf>): boolean =>
        inner.left >= outer.left - 0.5 &&
        inner.top >= outer.top - 0.5 &&
        inner.left + inner.width <= outer.left + outer.width + 0.5 &&
        inner.top + inner.height <= outer.top + outer.height + 0.5;
      const overlaps = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>): boolean =>
        a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
      // A table's rendered style carries only left/top/width (its height is auto, from
      // content, which jsdom never lays out), so a table's containment can only check
      // its left edge, top edge and right edge — never its bottom.
      const containsTableEdges = (outer: ReturnType<typeof boxOf>, inner: ReturnType<typeof boxOf>): boolean =>
        inner.left >= outer.left - 0.5 &&
        inner.top >= outer.top - 0.5 &&
        inner.left + inner.width <= outer.left + outer.width + 0.5;

      const twoBcData = () =>
        parseErData({
          after: {
            tables: [
              {
                id: 'customers',
                name: '顧客',
                tags: [],
                boundedContext: '認証',
                aggregate: '顧客集約',
                fields: [{ id: 'id', type: 'uuid', key: 'PK' }],
              },
              {
                id: 'profiles',
                name: 'プロフィール',
                tags: [],
                boundedContext: '認証',
                aggregate: '顧客集約',
                fields: [
                  { id: 'id', type: 'uuid', key: 'PK' },
                  { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
                ],
              },
              {
                id: 'sessions',
                name: 'セッション',
                tags: [],
                boundedContext: '認証',
                fields: [{ id: 'id', type: 'uuid', key: 'PK' }],
              },
              {
                id: 'orders',
                name: '注文',
                tags: [],
                boundedContext: '注文',
                aggregate: '注文集約',
                fields: [
                  { id: 'id', type: 'uuid', key: 'PK' },
                  { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
                ],
              },
              {
                id: 'order_items',
                name: '注文明細',
                tags: [],
                boundedContext: '注文',
                aggregate: '注文集約',
                fields: [
                  { id: 'id', type: 'uuid', key: 'PK' },
                  { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' },
                ],
              },
            ],
          },
        });

      it("keeps each Bounded Context's tables and aggregates nested inside its own frame, and never overlaps another BC's frame", async () => {
        const element = new DpkBoardErDiagram();
        element.data = twoBcData();
        document.body.append(element);
        await settle(element);

        const bcFrames = new Map(
          [...element.renderRoot.querySelectorAll<HTMLElement>('.er-bc')].map((frame) => [
            frame.querySelector('.er-bc-label')?.textContent,
            boxOf(frame),
          ]),
        );
        expect([...bcFrames.keys()].sort((a, b) => (a ?? '').localeCompare(b ?? ''))).toEqual(['注文', '認証']);
        const [auth, order] = [...bcFrames.values()] as [ReturnType<typeof boxOf>, ReturnType<typeof boxOf>];
        expect(overlaps(auth, order)).toBe(false);

        const byTable: Record<string, string> = {
          customers: '認証',
          profiles: '認証',
          sessions: '認証',
          orders: '注文',
          order_items: '注文',
        };
        for (const [id, bc] of Object.entries(byTable)) {
          const table = element.renderRoot.querySelector<HTMLElement>(`[data-er-table="${id}"]`);
          if (!table) throw new Error(`missing table ${id}`);
          const bcBox = bcFrames.get(bc);
          if (!bcBox) throw new Error(`missing BC frame ${bc}`);
          expect(containsTableEdges(bcBox, boxOf(table))).toBe(true);
        }

        const aggFrames = [...element.renderRoot.querySelectorAll<HTMLElement>('.er-aggregate')];
        expect(aggFrames).toHaveLength(2);
        for (const frame of aggFrames) {
          const label = frame.querySelector('.er-aggregate-label')?.textContent;
          const parentBc = label === '顧客集約' ? '認証' : '注文集約' === label ? '注文' : null;
          if (parentBc === null) throw new Error(`unexpected aggregate label ${label}`);
          const bcBox = bcFrames.get(parentBc);
          if (!bcBox) throw new Error(`missing BC frame ${parentBc}`);
          expect(contains(bcBox, boxOf(frame))).toBe(true);
        }
      });

      it('lays out the same data into the same positions every time (deterministic)', async () => {
        const positionsOf = async () => {
          const element = new DpkBoardErDiagram();
          element.data = twoBcData();
          document.body.append(element);
          await settle(element);
          const positions = [...element.renderRoot.querySelectorAll<HTMLElement>('[data-er-table]')]
            .map((table) => [table.getAttribute('data-er-table'), table.style.left, table.style.top] as const)
            .sort(([a], [b]) => (a ?? '').localeCompare(b ?? ''));
          element.remove();
          return positions;
        };
        const first = await positionsOf();
        const second = await positionsOf();
        expect(second).toEqual(first);
      });

      it("dims tables, relations and frames outside the picked Bounded Context instead of hiding them, focuses the view, and never moves a table's position", async () => {
        const element = new DpkBoardErDiagram();
        element.data = twoBcData();
        document.body.append(element);
        await settle(element);

        const positionOf = (id: string) => {
          const table = element.renderRoot.querySelector<HTMLElement>(`[data-er-table="${id}"]`);
          if (!table) throw new Error(`missing table ${id}`);
          return { left: table.style.left, top: table.style.top };
        };
        const before = {
          customers: positionOf('customers'),
          orders: positionOf('orders'),
        };

        element.tagFilter = { active: ['BC:認証'], match: 'single' };
        await settle(element);

        // Still present (dimmed, not hidden), and no table moved because of the filter.
        expect(element.renderRoot.querySelector('[data-er-table="orders"]')).not.toBeNull();
        expect(element.renderRoot.querySelector('[data-er-table="orders"]')?.classList.contains('is-bc-dimmed')).toBe(
          true,
        );
        expect(
          element.renderRoot.querySelector('[data-er-table="customers"]')?.classList.contains('is-bc-dimmed'),
        ).toBe(false);
        const orderBcFrame = [...element.renderRoot.querySelectorAll<HTMLElement>('.er-bc')].find(
          (frame) => frame.querySelector('.er-bc-label')?.textContent === '注文',
        );
        expect(orderBcFrame?.classList.contains('is-bc-dimmed')).toBe(true);
        const relation = element.renderRoot.querySelector('[data-relation="customers:id>orders:customer_id"]');
        expect(relation?.classList.contains('is-bc-dimmed')).toBe(true);

        expect(positionOf('customers')).toEqual(before.customers);
        expect(positionOf('orders')).toEqual(before.orders);

        element.tagFilter = { active: [], match: 'single' };
        await settle(element);
        expect(element.renderRoot.querySelector('[data-er-table="orders"]')?.classList.contains('is-bc-dimmed')).toBe(
          false,
        );
        expect(positionOf('customers')).toEqual(before.customers);
        expect(positionOf('orders')).toEqual(before.orders);
      });

      it('does not keep re-fitting a focused Bounded Context while harmless remeasurement nudges a card size by a sub-pixel (regression for #149)', async () => {
        // In the browser, `.er-table`'s ResizeObserver (re-armed on every render,
        // see `updated()`) fires a guaranteed notification each time it is
        // (re-)observed, even when nothing actually resized — jsdom/happy-dom's
        // ResizeObserver never fires at all, so the forced `requestUpdate()`
        // loop below stands in for that real-browser notification cascade.
        // Picking a Bounded Context pans/zooms to it (`focusBounds`), which
        // changes the live transform scale a measured card is read back
        // through, so every one of those extra renders re-measures at a
        // slightly different sub-pixel offset: `rect` below models that noise,
        // tied to the fit count the way a real scale change would be.
        // Call-through by default (no `mockImplementation`): only observes.
        const fitTo = vi.spyOn(DpkDialogPanel.prototype, 'fitTo');
        const rect = (height: number) =>
          ({
            width: 220,
            height,
            top: 0,
            left: 0,
            right: 220,
            bottom: height,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          }) as DOMRect;
        const getRect = vi
          .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
          .mockImplementation(function (this: HTMLElement) {
            return this.classList.contains('er-table') ? rect(100 + (fitTo.mock.calls.length % 2) * 0.02) : rect(20);
          });
        const offsetWidth = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(220);

        try {
          const element = new DpkBoardErDiagram();
          element.data = twoBcData();
          document.body.append(element);
          await settle(element);

          element.tagFilter = { active: ['BC:認証'], match: 'single' };
          await settle(element);
          const callsAfterFocusing = fitTo.mock.calls.length;
          expect(callsAfterFocusing).toBeGreaterThan(0); // the focus itself does pan/zoom once

          // Twenty further renders that measure nothing new on purpose (standing
          // in for the browser's own ResizeObserver-driven remeasurement passes):
          // none of them should re-open the view the reader already focused.
          for (let index = 0; index < 20; index++) {
            element.requestUpdate();
            await element.updateComplete;
          }

          expect(fitTo.mock.calls.length).toBe(callsAfterFocusing);
        } finally {
          fitTo.mockRestore();
          getRect.mockRestore();
          offsetWidth.mockRestore();
        }
      });

      it('re-observes only newly rendered tables/fields instead of disconnecting and re-observing every one on every render (regression for #148 round 3)', async () => {
        // A render that touches nothing about the tables themselves (here, a
        // hover) used to disconnect and re-observe every `.er-table`/`.er-field`
        // regardless, and `ResizeObserver.observe()` always schedules a
        // notification for a newly watched target even when nothing resized —
        // so every such render guaranteed another measurement pass in a real
        // browser. `observe`/`unobserve`/`disconnect` call counts below are the
        // ResizeObserver API's own visible contract, independent of whether
        // happy-dom's stub RO ever actually fires a callback.
        class CountingResizeObserver {
          static observeCalls = 0;
          static unobserveCalls = 0;
          static disconnectCalls = 0;
          constructor(_callback: ResizeObserverCallback) {}
          observe(_target: Element): void {
            CountingResizeObserver.observeCalls++;
          }
          unobserve(_target: Element): void {
            CountingResizeObserver.unobserveCalls++;
          }
          disconnect(): void {
            CountingResizeObserver.disconnectCalls++;
          }
        }
        vi.stubGlobal('ResizeObserver', CountingResizeObserver);

        try {
          const element = new DpkBoardErDiagram();
          element.data = parseErData(raw);
          document.body.append(element);
          await settle(element);

          const observedAfterMount = CountingResizeObserver.observeCalls;
          expect(observedAfterMount).toBeGreaterThan(0); // every table and field got observed once
          expect(CountingResizeObserver.disconnectCalls).toBe(0);

          // A render that adds and removes nothing: hovering a table.
          const customersTable = element.renderRoot.querySelector('[data-er-table="customers"]');
          customersTable?.dispatchEvent(new Event('pointerenter', { bubbles: true }));
          await settle(element);

          expect(CountingResizeObserver.observeCalls).toBe(observedAfterMount); // nothing new to observe
          expect(CountingResizeObserver.unobserveCalls).toBe(0); // nothing removed
          expect(CountingResizeObserver.disconnectCalls).toBe(0); // never a blanket disconnect

          element.remove();
        } finally {
          vi.unstubAllGlobals();
        }
      });

      it('does not request another update for a remeasured table whose size moved less than the epsilon, but does for a real size change', async () => {
        const rect = (height: number) =>
          ({
            width: 220,
            height,
            top: 0,
            left: 0,
            right: 220,
            bottom: height,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          }) as DOMRect;
        let tableHeightNow = 100;
        const getRect = vi
          .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
          .mockImplementation(function (this: HTMLElement) {
            return this.classList.contains('er-table') ? rect(tableHeightNow) : rect(20);
          });
        const offsetWidth = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(220);

        try {
          const element = new DpkBoardErDiagram();
          element.data = parseErData(raw);
          document.body.append(element);
          await settle(element);

          const requestUpdateSpy = vi.spyOn(element, 'requestUpdate');

          // Sub-pixel jitter, well under the epsilon: no real size change.
          tableHeightNow = 100.3;
          element.requestUpdate();
          await element.updateComplete;
          expect(requestUpdateSpy).toHaveBeenCalledTimes(1); // only the manual call above, none from `#measureTables`

          requestUpdateSpy.mockClear();

          // A real change, well past the epsilon: must still be picked up.
          tableHeightNow = 140;
          element.requestUpdate();
          await element.updateComplete;
          expect(requestUpdateSpy.mock.calls.length).toBeGreaterThan(1); // the manual call plus `#measureTables`'s own

          element.remove();
        } finally {
          getRect.mockRestore();
          offsetWidth.mockRestore();
        }
      });

      // A hub Bounded Context (Identity) referenced by the other three, the same
      // shape as the complex sample: enough Bounded Contexts, each with its own
      // aggregate, that a single rank axis would collapse them into one tall,
      // narrow column instead of a box near the viewport's own aspect ratio.
      const fourBcData = () =>
        parseErData({
          after: {
            tables: [
              {
                id: 'users',
                name: 'ユーザー',
                tags: [],
                boundedContext: 'Identity',
                aggregate: 'account',
                fields: [{ id: 'id', type: 'uuid', key: 'PK' }],
              },
              {
                id: 'roles',
                name: 'ロール',
                tags: [],
                boundedContext: 'Identity',
                aggregate: 'account',
                fields: [
                  { id: 'id', type: 'uuid', key: 'PK' },
                  { id: 'user_id', type: 'uuid', key: 'FK', ref: 'users.id' },
                ],
              },
              {
                id: 'products',
                name: '商品',
                tags: [],
                boundedContext: 'Catalog',
                aggregate: 'product',
                fields: [
                  { id: 'id', type: 'uuid', key: 'PK' },
                  { id: 'owner_id', type: 'uuid', key: 'FK', ref: 'users.id' },
                ],
              },
              {
                id: 'categories',
                name: 'カテゴリ',
                tags: [],
                boundedContext: 'Catalog',
                aggregate: 'product',
                fields: [{ id: 'id', type: 'uuid', key: 'PK' }],
              },
              {
                id: 'orders',
                name: '注文',
                tags: [],
                boundedContext: 'Ordering',
                aggregate: 'order',
                fields: [
                  { id: 'id', type: 'uuid', key: 'PK' },
                  { id: 'user_id', type: 'uuid', key: 'FK', ref: 'users.id' },
                ],
              },
              {
                id: 'order_items',
                name: '注文明細',
                tags: [],
                boundedContext: 'Ordering',
                aggregate: 'order',
                fields: [
                  { id: 'id', type: 'uuid', key: 'PK' },
                  { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' },
                  { id: 'product_id', type: 'uuid', key: 'FK', ref: 'products.id' },
                ],
              },
              {
                id: 'invoices',
                name: '請求書',
                tags: [],
                boundedContext: 'Billing',
                aggregate: 'invoice',
                fields: [
                  { id: 'id', type: 'uuid', key: 'PK' },
                  { id: 'user_id', type: 'uuid', key: 'FK', ref: 'users.id' },
                  { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' },
                ],
              },
              {
                id: 'payments',
                name: '支払い',
                tags: [],
                boundedContext: 'Billing',
                aggregate: 'invoice',
                fields: [
                  { id: 'id', type: 'uuid', key: 'PK' },
                  { id: 'invoice_id', type: 'uuid', key: 'FK', ref: 'invoices.id' },
                ],
              },
            ],
          },
        });

      it('packs four Bounded Contexts (one a hub every other one references) into a box between 1:1 and 2:1, not one tall strip', async () => {
        const element = new DpkBoardErDiagram();
        element.data = fourBcData();
        document.body.append(element);
        await settle(element);

        const layout = element.layout;
        if (layout === null) throw new Error('missing layout');
        const ratio = layout.width / layout.height;
        // `arrangeBoxes` (#148 round 3) picks the order and row split that
        // minimises estimated crossings and edge length first, aspect only as
        // a tie-break — a deliberate change from the old `shelfPack`, which
        // optimised aspect alone. For this hub topology that can land a
        // little under 1:1 even for the best (crossing- and length-minimal)
        // arrangement; 0.85 still firmly rejects the old single tall column
        // (well under 0.5) while allowing that trade-off.
        expect(ratio).toBeGreaterThanOrEqual(0.85);
        expect(ratio).toBeLessThanOrEqual(2);
      });

      it("keeps each Bounded Context's tables contiguous even across four contexts and a hub referenced by all of them", async () => {
        const element = new DpkBoardErDiagram();
        element.data = fourBcData();
        document.body.append(element);
        await settle(element);

        const bcFrames = new Map(
          [...element.renderRoot.querySelectorAll<HTMLElement>('.er-bc')].map((frame) => [
            frame.querySelector('.er-bc-label')?.textContent,
            boxOf(frame),
          ]),
        );
        expect([...bcFrames.keys()].sort((a, b) => (a ?? '').localeCompare(b ?? ''))).toEqual([
          'Billing',
          'Catalog',
          'Identity',
          'Ordering',
        ]);
        const boxes = [...bcFrames.values()];
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            expect(overlaps(boxes[i]!, boxes[j]!)).toBe(false);
          }
        }

        const byTable: Record<string, string> = {
          users: 'Identity',
          roles: 'Identity',
          products: 'Catalog',
          categories: 'Catalog',
          orders: 'Ordering',
          order_items: 'Ordering',
          invoices: 'Billing',
          payments: 'Billing',
        };
        for (const [id, bc] of Object.entries(byTable)) {
          const table = element.renderRoot.querySelector<HTMLElement>(`[data-er-table="${id}"]`);
          if (!table) throw new Error(`missing table ${id}`);
          const bcBox = bcFrames.get(bc);
          if (!bcBox) throw new Error(`missing BC frame ${bc}`);
          expect(containsTableEdges(bcBox, boxOf(table))).toBe(true);
        }
      });
    });

    describe('dragging a table inside an aggregate', () => {
      beforeEach(() => {
        // jsdom has no pointer capture; every browser the kit targets does.
        if (!('setPointerCapture' in HTMLElement.prototype)) {
          Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: () => {} });
        }
      });

      const pointer = (target: HTMLElement, type: string, clientX: number, clientY: number): void => {
        target.dispatchEvent(new PointerEvent(type, { pointerId: 1, button: 0, clientX, clientY, bubbles: true }));
      };

      it('moves only the grabbed table, never the whole aggregate, even though the frame sits under it', async () => {
        const element = new DpkBoardErDiagram();
        element.data = parseErData({
          after: {
            tables: [
              {
                id: 'customers',
                name: '顧客',
                tags: [],
                aggregate: '顧客集約',
                fields: [{ id: 'id', type: 'uuid', key: 'PK' }],
              },
              {
                id: 'profiles',
                name: 'プロフィール',
                tags: [],
                aggregate: '顧客集約',
                fields: [{ id: 'id', type: 'uuid', key: 'PK' }],
              },
            ],
          },
        });
        document.body.append(element);
        await settle(element);

        const table = element.renderRoot.querySelector<HTMLElement>('[data-er-table="customers"]');
        const other = element.renderRoot.querySelector<HTMLElement>('[data-er-table="profiles"]');
        const frame = element.renderRoot.querySelector<HTMLElement>('.er-aggregate');
        if (!table || !other || !frame) throw new Error('missing table or frame');
        const otherBefore = { left: other.style.left, top: other.style.top };

        // A real press on a member table hits the table, not the frame beneath it:
        // dispatch the gesture on the table element itself, as the browser would.
        pointer(table, 'pointerdown', 10, 10);
        pointer(table, 'pointermove', 60, 50);
        await element.updateComplete;

        expect(table.classList.contains('is-dragging')).toBe(true);
        expect(frame.classList.contains('is-dragging')).toBe(false);

        pointer(table, 'pointerup', 60, 50);
        await element.updateComplete;

        expect(table.classList.contains('is-dragging')).toBe(false);
        expect(frame.classList.contains('is-dragging')).toBe(false);
        // The other member never moved: this was a node drag, not a group drag.
        expect(other.style.left).toBe(otherBefore.left);
        expect(other.style.top).toBe(otherBefore.top);
      });
    });

    it('filters columns with the three-way All / Keys / Tables-only control', async () => {
      const element = await mount2();
      const fieldsOf = (table: string) =>
        [...element.renderRoot.querySelectorAll(`[data-er-table="${table}"] .er-field`)].map((row) =>
          row.getAttribute('data-field'),
        );
      const option = (value: 'all' | 'keys' | 'tables-only'): HTMLButtonElement => {
        const group = element.renderRoot.querySelector('.er-column-filter');
        const button = [...(group?.querySelectorAll('button') ?? [])].find(
          (_candidate, index) => ['all', 'keys', 'tables-only'][index] === value,
        );
        if (!(button instanceof HTMLButtonElement)) throw new Error(`no option for ${value}`);
        return button;
      };
      expect(fieldsOf('customers')).toEqual(['id', 'email', 'note']);
      expect(option('all').getAttribute('aria-pressed')).toBe('true');

      option('keys').click();
      await settle(element);
      expect(fieldsOf('customers')).toEqual(['id', 'email']);
      expect(fieldsOf('profiles')).toEqual(['id', 'customer_id']);
      expect(option('keys').getAttribute('aria-pressed')).toBe('true');

      option('tables-only').click();
      await settle(element);
      expect(fieldsOf('customers')).toEqual([]);
      expect(element.renderRoot.querySelector('[data-er-table="customers"] .er-fields')).toBeNull();

      option('all').click();
      await settle(element);
      expect(fieldsOf('customers')).toEqual(['id', 'email', 'note']);
    });

    it('toggles the Bounded Context and aggregate frames independently from the bottom controls bar, without moving any table', async () => {
      const element = await mount2();
      const group = (): HTMLElement => {
        const node = element.renderRoot.querySelector('.er-grouping-filter');
        if (!(node instanceof HTMLElement)) throw new Error('no grouping control');
        return node;
      };
      const toggle = (label: string): HTMLButtonElement => {
        const button = [...group().querySelectorAll('button')].find(
          (candidate) => candidate.textContent?.trim() === label,
        );
        if (!(button instanceof HTMLButtonElement)) throw new Error(`no toggle for ${label}`);
        return button;
      };
      const positionsOf = (id: string) => {
        const table = element.renderRoot.querySelector<HTMLElement>(`[data-er-table="${id}"]`);
        return { left: table?.style.left, top: table?.style.top };
      };
      const before = { customers: positionsOf('customers'), profiles: positionsOf('profiles') };

      // Both frames show by default, and both toggles report pressed.
      expect(element.renderRoot.querySelector('.er-bc')).not.toBeNull();
      expect(element.renderRoot.querySelector('.er-aggregate')).not.toBeNull();
      expect(toggle(m.boundedContextLabel).getAttribute('aria-pressed')).toBe('true');
      expect(toggle(m.aggregateLabel).getAttribute('aria-pressed')).toBe('true');

      toggle(m.boundedContextLabel).click();
      await settle(element);
      expect(element.renderRoot.querySelector('.er-bc')).toBeNull();
      expect(element.renderRoot.querySelector('.er-aggregate')).not.toBeNull();
      expect(toggle(m.boundedContextLabel).getAttribute('aria-pressed')).toBe('false');

      toggle(m.aggregateLabel).click();
      await settle(element);
      expect(element.renderRoot.querySelector('.er-bc')).toBeNull();
      expect(element.renderRoot.querySelector('.er-aggregate')).toBeNull();
      expect(toggle(m.aggregateLabel).getAttribute('aria-pressed')).toBe('false');

      // Hiding the frames is purely visual: no table moved.
      expect(positionsOf('customers')).toEqual(before.customers);
      expect(positionsOf('profiles')).toEqual(before.profiles);

      toggle(m.boundedContextLabel).click();
      toggle(m.aggregateLabel).click();
      await settle(element);
      expect(element.renderRoot.querySelector('.er-bc')).not.toBeNull();
      expect(element.renderRoot.querySelector('.er-aggregate')).not.toBeNull();
    });
  });

  describe('whole-table drag', () => {
    beforeEach(() => {
      // jsdom has no pointer capture; every browser the kit targets does.
      if (!('setPointerCapture' in HTMLElement.prototype)) {
        Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: () => {} });
      }
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    const pointer = (target: HTMLElement, type: string, clientX: number, clientY: number): void => {
      target.dispatchEvent(new PointerEvent(type, { pointerId: 1, button: 0, clientX, clientY, bubbles: true }));
    };

    it('moves the whole table when the drag starts on its body, not a nested control', async () => {
      const element = await mount();
      const card = element.renderRoot.querySelector<HTMLElement>('[data-er-table="customers"]');
      if (!card) throw new Error('missing table');
      const before = card.style.left;
      pointer(card, 'pointerdown', 10, 10);
      pointer(card, 'pointermove', 60, 40);
      await settle(element);
      expect(card.classList.contains('is-dragging')).toBe(true);
      pointer(card, 'pointerup', 60, 40);
      await settle(element);
      expect(card.style.left).not.toBe(before);
      expect(card.classList.contains('is-dragging')).toBe(false);
    });

    it('also drags the whole table when the drag starts on the header select button', async () => {
      const element = await mount();
      const card = element.renderRoot.querySelector<HTMLElement>('[data-er-table="customers"]');
      const head = element.renderRoot.querySelector<HTMLButtonElement>('[data-table="customers"]');
      if (!card || !head) throw new Error('missing table or header button');
      const before = card.style.left;
      pointer(head, 'pointerdown', 10, 10);
      pointer(head, 'pointermove', 60, 40);
      await settle(element);
      expect(card.classList.contains('is-dragging')).toBe(true);
      pointer(head, 'pointerup', 60, 40);
      head.click(); // the release still synthesizes a click; a real drag must swallow it
      await settle(element);
      expect(card.style.left).not.toBe(before);
      expect(card.classList.contains('is-dragging')).toBe(false);
      expect(element.selection).toBe(null);
    });

    it('still selects on a plain click (press and release without crossing the drag threshold) on the header select button', async () => {
      const element = await mount();
      const card = element.renderRoot.querySelector<HTMLElement>('[data-er-table="customers"]');
      const head = element.renderRoot.querySelector<HTMLButtonElement>('[data-table="customers"]');
      if (!card || !head) throw new Error('missing table or header button');
      const before = card.style.left;
      pointer(head, 'pointerdown', 10, 10);
      pointer(head, 'pointerup', 10, 10);
      head.click();
      await settle(element);
      expect(card.style.left).toBe(before);
      expect(element.selection).toEqual({ kind: 'node', id: 'customers' });
    });

    it('never starts a drag from a field row edit/delete button or the add-field button', async () => {
      const element = await mount();
      // Edit/delete/add-field controls only render once the diagram has an id to record changes against.
      element.id = 'schema';
      await settle(element);
      const card = element.renderRoot.querySelector<HTMLElement>('[data-er-table="orders"]');
      const editButton = element.renderRoot.querySelector<HTMLButtonElement>(
        '[data-er-table="orders"] [data-action="edit-field"][data-field="status"]',
      );
      const addButton = element.renderRoot.querySelector<HTMLButtonElement>(
        '[data-er-table="orders"] [data-action="add-field"]',
      );
      if (!card || !editButton || !addButton) throw new Error('missing table controls');
      const before = card.style.left;

      pointer(editButton, 'pointerdown', 10, 10);
      pointer(editButton, 'pointermove', 60, 40);
      await settle(element);
      expect(card.classList.contains('is-dragging')).toBe(false);
      pointer(editButton, 'pointerup', 60, 40);
      await settle(element);

      pointer(addButton, 'pointerdown', 10, 10);
      pointer(addButton, 'pointermove', 60, 40);
      await settle(element);
      expect(card.classList.contains('is-dragging')).toBe(false);
      pointer(addButton, 'pointerup', 60, 40);
      await settle(element);

      expect(card.style.left).toBe(before);
    });
  });
});
