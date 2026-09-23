import { afterEach, describe, expect, it } from 'vitest';

import { ArtifactErDiagram } from './element';
import { defineErDiagram, ER_DIAGRAM_TAG } from './index';
import { parseErData, tableHeight } from './model';

defineErDiagram();

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

const settle = async (element: ArtifactErDiagram): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (): Promise<ArtifactErDiagram> => {
  const element = new ArtifactErDiagram();
  element.data = parseErData(raw);
  document.body.append(element);
  await settle(element);
  return element;
};

const classes = (element: ArtifactErDiagram, table: string): string[] => [
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
    expect(ER_DIAGRAM_TAG).toBe('artifact-er-diagram');
  });
});

const openComment = async (element: ArtifactErDiagram, kind: 'node' | 'edge', id: string) => {
  await settle(element);
  const button = [...element.renderRoot.querySelectorAll<HTMLButtonElement>('[data-comment-kind]')].find(
    (candidate) => candidate.dataset['commentKind'] === kind && candidate.dataset['commentId'] === id,
  );
  if (!button) throw new Error(`missing ${kind} comment trigger: ${id}`);
  button.click();
  await settle(element);
  expect(element.renderRoot.querySelector('.comment-pop')).not.toBeNull();
};

describe('artifact-er-diagram', () => {
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

  it.each(['.af-btn--accent', '.af-btn:not(.af-btn--accent)'])('dismisses with Escape from %s', async (selector) => {
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
    // No accepting artifact/consumer: do not discard user input.
    expect(element.renderRoot.querySelector('[role="alert"]')?.textContent).toContain('送信できませんでした');
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
    expect(element.renderRoot.querySelectorAll('.er-cardinality')).toHaveLength(6);
    expect(element.renderRoot.querySelector('.diagram-stats')?.textContent).toBe('4 テーブル · 3 関連');
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
    expect(element.renderRoot.querySelector('.diagram-empty')?.textContent).toContain('該当するテーブルはありません');
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
