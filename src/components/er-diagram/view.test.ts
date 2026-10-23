import { describe, expect, it } from 'vitest';

import { erDiagramMessages } from './messages';
import { parseErData, type ErTableDiff } from './model';
import {
  columnIcon,
  detourRoute,
  editorVerdict,
  fieldChanges,
  fieldDetail,
  highlightOf,
  relationPath,
  resumeEditor,
  roundedPath,
  typeMenu,
  typeSuggestions,
  type ColumnEditor,
} from './view';

const m = erDiagramMessages('en');

const data = parseErData({
  before: {
    tables: [
      {
        id: 'orders',
        name: 'Orders',
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'status', type: 'varchar' },
        ],
      },
    ],
  },
  after: {
    tables: [
      {
        id: 'orders',
        name: 'Orders',
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'status', type: 'order_status' },
          { id: 'paid_at', type: 'timestamptz', nullable: true },
        ],
      },
      {
        id: 'refunds',
        name: 'Refunds',
        fields: [
          { id: 'id', type: 'uuid', key: 'PK' },
          { id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id', label: 'refunds' },
        ],
      },
    ],
  },
});

const table = (id: string): ErTableDiff => {
  const found = data.nodes.find((node) => node.id === id);
  if (!found) throw new Error(`no table ${id}`);
  return found;
};

const fieldOf = (tableId: string, id: string) => {
  const found = table(tableId).fields.find((field) => field.id === id);
  if (!found) throw new Error(`no field ${id}`);
  return found;
};

describe('fieldDetail', () => {
  it('leaves the keys to the badge and says nothing for a plain column', () => {
    expect(fieldDetail(fieldOf('orders', 'id'), m)).toBe('uuid');
    expect(fieldDetail(fieldOf('orders', 'paid_at'), m)).toBe('timestamptz · nullable');
    expect(fieldDetail(fieldOf('refunds', 'order_id'), m)).toBe('uuid → orders.id · “refunds”');
  });

  it('names the keys when asked, for a change of keys', () => {
    expect(fieldDetail(fieldOf('orders', 'id'), m, true)).toBe('uuid · PK');
    expect(fieldDetail(fieldOf('orders', 'status'), m, true)).toBe('order_status');
  });
});

describe('fieldChanges', () => {
  const changed = parseErData({
    before: {
      tables: [
        { id: 'customers', name: 'C', fields: [{ id: 'id', type: 'uuid', key: 'PK' }] },
        {
          id: 'profiles',
          name: 'P',
          fields: [
            { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
            { id: 'nickname', type: 'varchar' },
            { id: 'note', type: 'text' },
          ],
        },
      ],
    },
    after: {
      tables: [
        { id: 'customers', name: 'C', fields: [{ id: 'id', type: 'uuid', key: 'PK' }] },
        {
          id: 'profiles',
          name: 'P',
          fields: [
            { id: 'customer_id', type: 'uuid', key: ['FK', 'UQ'], ref: 'customers.id', label: 'owns' },
            { id: 'nickname', type: 'text', nullable: true },
            { id: 'note', type: 'text' },
          ],
        },
      ],
    },
  });
  const field = (id: string) => {
    const found = changed.nodes.find((node) => node.id === 'profiles')?.fields.find((item) => item.id === id);
    if (!found) throw new Error(`no field ${id}`);
    return found;
  };

  it('lists what changed, each with its previous and current value', () => {
    expect(fieldChanges(field('nickname'), m)).toEqual([
      { attribute: 'type', before: 'varchar', after: 'text' },
      { attribute: 'nullable', before: 'not null', after: 'nullable' },
    ]);
    expect(fieldChanges(field('customer_id'), m)).toEqual([
      { attribute: 'keys', before: 'FK', after: 'FK+UQ' },
      { attribute: 'label', before: '—', after: '“owns”' },
    ]);
  });

  it('lists nothing for an unchanged column', () => {
    expect(fieldChanges(field('note'), m)).toEqual([]);
  });
});

describe('typeSuggestions', () => {
  it('lists every type in the schema once, sorted', () => {
    expect(typeSuggestions(data)).toEqual(['order_status', 'timestamptz', 'uuid']);
  });
});

describe('typeMenu', () => {
  const types = ['bigint', 'int4', 'order_status', 'text', 'timestamptz', 'varchar'];
  const typesOf = (typed: string) => typeMenu(types, typed, null).options.map((option) => option.type);

  it('offers every type, the first highlighted, while nothing is typed yet', () => {
    expect(typeMenu(types, ' ', null)).toEqual({
      options: types.map((type) => ({ kind: 'schema', type })),
      active: 0,
    });
  });

  it('offers every type while the input names one, highlighting that one, so another can be picked', () => {
    const menu = typeMenu(types, 'VARCHAR', null);
    expect(menu.options.map((option) => option.type)).toEqual(types);
    expect(menu.active).toBe(5);
  });

  it('narrows to the types containing the input, those starting with it first, then offers it as a new type', () => {
    expect(typeMenu(types, 'T', null).options).toEqual([
      { kind: 'schema', type: 'text' },
      { kind: 'schema', type: 'timestamptz' },
      { kind: 'schema', type: 'bigint' },
      { kind: 'schema', type: 'int4' },
      { kind: 'schema', type: 'order_status' },
      { kind: 'new', type: 'T' },
    ]);
    expect(typesOf(' int ')).toEqual(['int4', 'bigint', 'int']);
  });

  it('offers only the new type when nothing in the schema matches', () => {
    expect(typeMenu(types, 'jsonb', null)).toEqual({ options: [{ kind: 'new', type: 'jsonb' }], active: 0 });
  });

  it('moves the highlight to the option chosen with the arrow keys, wrapping around the ends', () => {
    expect(typeMenu(types, 'int', 1).active).toBe(1);
    expect(typeMenu(types, 'int', 3).active).toBe(0);
    expect(typeMenu(types, 'int', -1).active).toBe(2);
  });

  it('highlights nothing when there is nothing to offer', () => {
    expect(typeMenu([], '', null)).toEqual({ options: [], active: -1 });
  });
});

describe('editorVerdict', () => {
  const add = (name: string, type: string, description = ''): ColumnEditor => ({
    kind: 'add',
    table: 'orders',
    name,
    type,
    nullable: false,
    description,
    failed: false,
  });
  const edit = (type: string, nullable: boolean, description = ''): ColumnEditor => ({
    kind: 'edit',
    table: 'orders',
    field: 'status',
    type,
    nullable,
    description,
    failed: false,
  });

  it('accepts a new column with a free name and a type', () => {
    expect(editorVerdict(add(' note ', 'text'), table('orders'))).toEqual({ ready: true, issue: null });
  });

  it('waits for both a name and a type', () => {
    expect(editorVerdict(add('', 'text'), table('orders'))).toEqual({ ready: false, issue: null });
    expect(editorVerdict(add('note', '  '), table('orders'))).toEqual({ ready: false, issue: null });
  });

  it('flags a name the table already uses', () => {
    expect(editorVerdict(add('status ', 'text'), table('orders'))).toEqual({ ready: false, issue: 'name-taken' });
  });

  it('accepts an edit only when it changes something', () => {
    expect(editorVerdict(edit('order_status', false), table('orders'))).toEqual({ ready: false, issue: null });
    expect(editorVerdict(edit('order_status', true), table('orders'))).toEqual({ ready: true, issue: null });
    expect(editorVerdict(edit('text', false), table('orders'))).toEqual({ ready: true, issue: null });
    expect(editorVerdict(edit('', true), table('orders'))).toEqual({ ready: false, issue: null });
  });

  it('accepts an edit when only the description changed', () => {
    expect(editorVerdict(edit('order_status', false), table('orders'))).toEqual({ ready: false, issue: null });
    expect(editorVerdict(edit('order_status', false, 'what the order is doing'), table('orders'))).toEqual({
      ready: true,
      issue: null,
    });
  });
});

describe('roundedPath', () => {
  it('draws a straight route as a plain line', () => {
    expect(
      roundedPath(
        [
          { x: 0, y: 0 },
          { x: 40, y: 0 },
        ],
        8,
      ),
    ).toBe('M0 0 L40 0');
  });

  it('rounds each corner of an orthogonal route', () => {
    expect(
      roundedPath(
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 40 },
          { x: 50, y: 40 },
        ],
        8,
      ),
    ).toBe('M0 0 L12 0 Q20 0 20 8 L20 32 Q20 40 28 40 L50 40');
  });

  it('shrinks the radius to fit a short segment', () => {
    expect(
      roundedPath(
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 6 },
          { x: 50, y: 6 },
        ],
        8,
      ),
    ).toBe('M0 0 L17 0 Q20 0 20 3 L20 3 Q20 6 23 6 L50 6');
  });

  it('draws nothing for an empty route', () => {
    expect(roundedPath([], 8)).toBe('');
  });
});

describe('relationPath', () => {
  it('curves a route that runs forward, leaving and entering its tables level', () => {
    expect(
      relationPath(
        [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 40 },
          { x: 100, y: 40 },
        ],
        68,
      ),
    ).toBe('M0 0 C50 0 50 40 100 40');
  });

  it('turns each jog of a longer route into a curve no wider than the gap it sits in', () => {
    expect(
      relationPath(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 80 },
          { x: 400, y: 80 },
          { x: 400, y: 20 },
          { x: 500, y: 20 },
        ],
        40,
      ),
    ).toBe('M0 0 L60 0 C100 0 100 80 140 80 L360 80 C400 80 400 20 440 20 L500 20');
  });

  it('draws a level route as a straight line', () => {
    expect(
      relationPath(
        [
          { x: 0, y: 10 },
          { x: 90, y: 10 },
        ],
        40,
      ),
    ).toBe('M0 10 L90 10');
  });

  it('keeps a route that turns back on its corners, rounded', () => {
    const back = [
      { x: 100, y: 0 },
      { x: 100, y: 60 },
      { x: 0, y: 60 },
      { x: 0, y: 10 },
    ];
    expect(relationPath(back, 40)).toBe(roundedPath(back, 10));
  });
});

describe('detourRoute', () => {
  const start = { x: 0, y: 100 };

  it('steps once, halfway, between two neighbouring tables', () => {
    expect(detourRoute(start, { x: 200, y: 160 }, [], 20)).toEqual([
      start,
      { x: 100, y: 100 },
      { x: 100, y: 160 },
      { x: 200, y: 160 },
    ]);
  });

  it('runs straight when both ends are level and nothing is in the way', () => {
    const box = { x: 300, y: 0, width: 100, height: 40 };
    expect(detourRoute(start, { x: 800, y: 100 }, [box], 20)).toEqual([start, { x: 800, y: 100 }]);
  });

  it('passes a table in a layer between, through the gap nearest its way', () => {
    // The table spans y 40–260 in the layer between x 300 and 500.
    const box = { x: 300, y: 40, width: 200, height: 220 };
    expect(detourRoute(start, { x: 800, y: 40 }, [box], 20)).toEqual([
      start,
      { x: 150, y: 100 },
      { x: 150, y: 20 },
      { x: 650, y: 20 },
      { x: 650, y: 40 },
      { x: 800, y: 40 },
    ]);
  });

  it('keeps clear of every table stacked in that layer', () => {
    const upper = { x: 300, y: 0, width: 200, height: 90 };
    const lower = { x: 300, y: 130, width: 200, height: 200 };
    // The gap between them (90–130) is the nearest free lane, 20 from each.
    expect(detourRoute(start, { x: 800, y: 100 }, [upper, lower], 20)).toEqual([
      start,
      { x: 150, y: 100 },
      { x: 150, y: 110 },
      { x: 650, y: 110 },
      { x: 650, y: 100 },
      { x: 800, y: 100 },
    ]);
  });
});

describe('columnIcon', () => {
  it('shows the primary key first, then a reference, then nullability', () => {
    expect(columnIcon(fieldOf('orders', 'id'))).toBe('primary');
    expect(columnIcon(fieldOf('refunds', 'order_id'))).toBe('foreign');
    expect(columnIcon(fieldOf('orders', 'status'))).toBe('not-null');
    expect(columnIcon(fieldOf('orders', 'paid_at'))).toBe('nullable');
  });
});

describe('highlightOf', () => {
  const chain = parseErData({
    after: {
      tables: [
        { id: 'customers', name: 'Customers', fields: [{ id: 'id', type: 'uuid', key: 'PK' }] },
        {
          id: 'orders',
          name: 'Orders',
          fields: [
            { id: 'id', type: 'uuid', key: 'PK' },
            { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
            { id: 'note', type: 'text' },
          ],
        },
        {
          id: 'refunds',
          name: 'Refunds',
          fields: [{ id: 'order_id', type: 'uuid', key: 'FK', ref: 'orders.id' }],
        },
      ],
    },
  });
  const sorted = (set: ReadonlySet<string>) => [...set].sort();

  it('lights a focused table, the tables it relates to, the relations and both joined columns', () => {
    const lit = highlightOf(chain.edges, [{ kind: 'table', id: 'orders' }]);
    expect(sorted(lit.tables)).toEqual(['customers', 'orders', 'refunds']);
    expect(sorted(lit.edges)).toEqual(['customers:id>orders:customer_id', 'orders:id>refunds:order_id']);
    expect(sorted(lit.columns)).toEqual(['customers.id', 'orders.customer_id', 'orders.id', 'refunds.order_id']);
  });

  it('traces one key from a focused column: only its relations and the columns at their other end', () => {
    const lit = highlightOf(chain.edges, [{ kind: 'column', table: 'orders', field: 'customer_id' }]);
    expect(sorted(lit.tables)).toEqual(['customers', 'orders']);
    expect(sorted(lit.edges)).toEqual(['customers:id>orders:customer_id']);
    expect(sorted(lit.columns)).toEqual(['customers.id', 'orders.customer_id']);
  });

  it('falls back to the table of a focused column that joins nothing', () => {
    const lit = highlightOf(chain.edges, [{ kind: 'column', table: 'orders', field: 'note' }]);
    expect(lit).toEqual(highlightOf(chain.edges, [{ kind: 'table', id: 'orders' }]));
  });

  it('lights a focused relation, its two tables and the two columns it joins', () => {
    const lit = highlightOf(chain.edges, [{ kind: 'relation', id: 'orders:id>refunds:order_id' }]);
    expect(sorted(lit.tables)).toEqual(['orders', 'refunds']);
    expect(sorted(lit.edges)).toEqual(['orders:id>refunds:order_id']);
    expect(sorted(lit.columns)).toEqual(['orders.id', 'refunds.order_id']);
  });

  it('lights nothing without a focus', () => {
    const lit = highlightOf(chain.edges, []);
    expect(lit.tables.size + lit.edges.size + lit.columns.size).toBe(0);
  });
});

describe('resumeEditor', () => {
  const fresh: ColumnEditor = {
    kind: 'edit',
    table: 'orders',
    field: 'status',
    type: 'text',
    nullable: false,
    description: '',
    failed: false,
  };
  const draft: ColumnEditor = { ...fresh, type: 'varchar(20)' };

  it('brings back a parked draft opened over the same column', () => {
    expect(resumeEditor({ draft, base: fresh }, fresh)).toEqual(draft);
  });

  it('drops a parked draft once the column changed under it, so a stale value is never saved back', () => {
    expect(resumeEditor({ draft, base: fresh }, { ...fresh, type: 'order_status' })).toEqual({
      ...fresh,
      type: 'order_status',
    });
  });

  it('opens the fresh editor without a parked draft', () => {
    expect(resumeEditor(undefined, fresh)).toEqual(fresh);
  });
});
