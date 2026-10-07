import { afterEach, describe, expect, it } from 'vitest';

import { diagramMessages } from '../diagram/messages';
import { DpkComponentErDiagram } from './element';
import { defineErDiagram } from './index';
import { erDiagramMessages } from './messages';
import { parseErData, tableHeight } from './model';

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

const settle = async (element: DpkComponentErDiagram): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (lang?: string): Promise<DpkComponentErDiagram> => {
  const element = new DpkComponentErDiagram();
  if (lang !== undefined) element.setAttribute('lang', lang);
  element.data = parseErData(raw);
  document.body.append(element);
  await settle(element);
  return element;
};

const classes = (element: DpkComponentErDiagram, table: string): string[] => [
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

const openComment = async (element: DpkComponentErDiagram, kind: 'node' | 'edge', id: string) => {
  await settle(element);
  const button = [...element.renderRoot.querySelectorAll<HTMLButtonElement>('[data-comment-kind]')].find(
    (candidate) => candidate.dataset['commentKind'] === kind && candidate.dataset['commentId'] === id,
  );
  if (!button) throw new Error(`missing ${kind} comment trigger: ${id}`);
  button.click();
  await settle(element);
  expect(element.renderRoot.querySelector('.comment-pop')).not.toBeNull();
};

describe('dpk-component-er-diagram', () => {
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

  it('requires the comment icon even after selecting or refocusing a table', async () => {
    const element = await mount();
    element.id = 'schema';
    await settle(element);
    const heading = element.renderRoot.querySelector<HTMLButtonElement>('[data-table="orders"]');
    heading?.focus();
    heading?.click();
    await settle(element);
    expect(element.selection).toEqual({ kind: 'node', id: 'orders' });
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    const trigger = element.renderRoot.querySelector<HTMLButtonElement>('[data-comment-id="orders"]');
    expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
    trigger?.focus();
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    await openComment(element, 'node', 'orders');
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    element.select({ kind: 'node', id: 'customers' });
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    element.select({ kind: 'node', id: 'orders' });
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
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

  it('does not steal search focus when a filtered selection reappears', async () => {
    const element = await mount();
    element.id = 'schema';
    await openComment(element, 'node', 'orders');
    const search = element.renderRoot.querySelector<HTMLInputElement>('.er-search input');
    if (!search) throw new Error('missing search');
    search.focus();
    search.value = 'no-matching-table';
    search.dispatchEvent(new Event('input'));
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
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
    expect(element.selection).toBeNull();
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
  });

  it('renders real SVG relations that can be selected for comments', async () => {
    const element = await mount();
    element.id = 'schema';
    await settle(element);
    const edge = element.renderRoot.querySelector('.d-edge-hit');
    expect(edge?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(element.renderRoot.querySelector('marker')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(element.renderRoot.querySelector('.er-cardinality')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    edge?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle(element);
    expect(element.selection?.kind).toBe('edge');
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    const trigger = element.renderRoot.querySelector<HTMLButtonElement>('[data-comment-kind="edge"]');
    expect(trigger?.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    expect(trigger?.closest('foreignObject')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    trigger?.click();
    await settle(element);
    expect(element.renderRoot.querySelector('.comment-pop')).not.toBeNull();
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
    expect(element.renderRoot.querySelectorAll('.er-cardinality')).toHaveLength(3);
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

  it('labels each relation at its FK end with both multiplicities, and a changed one with its previous value', async () => {
    const element = await mount();
    const ends = (relation: string) =>
      [...element.renderRoot.querySelectorAll(`[data-relation="${relation}"] .er-cardinality`)].map((end) =>
        end.textContent?.replace(/\s+/g, ' ').trim(),
      );
    expect(ends('customers:id>orders:customer_id')).toEqual(['1 : 0..N']);
    const fk = { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' };
    element.data = parseErData({
      before: schema([fk]),
      after: schema([{ ...fk, key: ['FK', 'UQ'], label: 'settles' }]),
    });
    await settle(element);
    const relation = 'orders:id>child:order_id';
    expect(element.renderRoot.querySelector(`[data-relation="${relation}"]`)?.classList).toContain('is-changed');
    expect(ends(relation)).toEqual(['1 : 0..N 1 : 0..1']);
    expect(element.renderRoot.querySelector(`[data-relation="${relation}"] .er-was`)?.textContent).toBe('1 : 0..N');
    expect(element.renderRoot.querySelector(`[data-relation="${relation}"] .er-relation-label`)?.textContent).toBe(
      'settles',
    );
    expect(
      [...element.renderRoot.querySelectorAll('[data-er-table="child"] .er-key span')].map((key) => key.textContent),
    ).toEqual(['FK', 'UQ']);
    expect(element.renderRoot.querySelector('[data-er-table="child"] .er-change ins')?.textContent).toContain(
      'FK+UQ · orders.id · “settles”',
    );
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

  it('opens the same contextual composer for a relationship', async () => {
    const element = await mount();
    element.id = 'schema';
    await openComment(element, 'edge', 'orders:id>inventory_reservations:order_id');
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe(
      'orders.id → inventory_reservations.order_id',
    );
    expect(element.renderRoot.querySelector('.diagram-details')).toBeNull();
  });
});
