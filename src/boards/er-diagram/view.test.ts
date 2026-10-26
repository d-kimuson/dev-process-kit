import { describe, expect, it } from 'vitest';

import { layeredLayout, type LayoutPoint } from '../../lib/layout/layered';
import { routeHugsOutline } from '../../lib/layout/metrics';
import { LAYOUT, LANE_MARGIN } from './element';
import { erDiagramMessages } from './messages';
import { erLayoutSpec, parseErData, type ErTableDiff } from './model';
import { END_GLYPH_REACH, endGlyph } from './notation';
import {
  columnIcon,
  detourRoute,
  type ErBox,
  editorVerdict,
  fieldChanges,
  fieldDetail,
  highlightOf,
  PORT_STRAIGHT,
  relationPath,
  relationRoute,
  relationRoutes,
  resumeEditor,
  roundedPath,
  typeMenu,
  typeSuggestions,
  type ColumnEditor,
} from './view';

/** Whether any segment of `points` passes through `box`'s open interior. */
const routeHitsBox = (points: readonly { readonly x: number; readonly y: number }[], box: ErBox): boolean =>
  points.some((p, i) => {
    const prev = points[i - 1];
    if (prev === undefined) return false;
    if (prev.x === p.x) {
      const top = Math.min(prev.y, p.y);
      const bottom = Math.max(prev.y, p.y);
      return (
        prev.x > box.x && prev.x < box.x + box.width && Math.max(box.y, top) < Math.min(box.y + box.height, bottom)
      );
    }
    const left = Math.min(prev.x, p.x);
    const right = Math.max(prev.x, p.x);
    return prev.y > box.y && prev.y < box.y + box.height && Math.max(box.x, left) < Math.min(box.x + box.width, right);
  });

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
    // `0`: the port straight run is exercised on its own below; this case is
    // about the rounding itself.
    expect(
      roundedPath(
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 40 },
          { x: 50, y: 40 },
        ],
        8,
        0,
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
        0,
      ),
    ).toBe('M0 0 L17 0 Q20 0 20 3 L20 3 Q20 6 23 6 L50 6');
  });

  it('keeps the run at each port straight, squaring a corner that would eat into it', () => {
    // The end glyphs are laid out along the port's own direction, so a corner
    // inside `PORT_STRAIGHT` of a port has to be left square — otherwise the
    // crow's foot and its "zero" circle are drawn beside the stroke.
    const route = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 40 },
      { x: 50, y: 40 },
    ];
    expect(roundedPath(route, 8, 20)).toBe('M0 0 L20 0 L20 32 Q20 40 28 40 L50 40');
    // The same route with a longer run at both ends keeps its rounded corners.
    expect(
      roundedPath(
        [
          { x: 0, y: 0 },
          { x: 60, y: 0 },
          { x: 60, y: 40 },
          { x: 100, y: 40 },
        ],
        8,
        20,
      ),
    ).toBe('M0 0 L52 0 Q60 0 60 8 L60 32 Q60 40 68 40 L100 40');
  });

  it('draws nothing for an empty route', () => {
    expect(roundedPath([], 8)).toBe('');
  });
});

describe('relationPath', () => {
  it('curves a route that runs forward, leaving and entering its tables level', () => {
    // `0` here isolates the curving; see `roundedPath`'s port-run case and
    // "relation end glyphs sit on the drawn line" below for the reserved run.
    expect(
      relationPath(
        [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 40 },
          { x: 100, y: 40 },
        ],
        68,
        0,
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

  it('starts its first curve after the straight run out of the port, not across it', () => {
    // Runs of exactly `PORT_STRAIGHT` on both sides: nothing is left to curve,
    // so both jogs stay square and the line leaves/enters level for the whole
    // glyph — this is the shape a `0..N` end needs.
    expect(
      relationPath(
        [
          { x: 0, y: 0 },
          { x: PORT_STRAIGHT, y: 0 },
          { x: PORT_STRAIGHT, y: 40 },
          { x: PORT_STRAIGHT * 2, y: 40 },
        ],
        68,
      ),
    ).toBe(`M0 0 L${PORT_STRAIGHT} 0 L${PORT_STRAIGHT} 40 L${PORT_STRAIGHT * 2} 40`);
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

  // Behavioural assertions, not exact coordinates: `detourRoute` delegates to
  // the general router in `lib/layout` (see `orthogonal-router.test.ts` for
  // its own, thorough coverage), so this only has to prove the delegation —
  // the result never clips a table and always starts/ends at the given ports.

  it('reaches a port not level with the start without crossing anything, when nothing is in the way', () => {
    const route = detourRoute(start, { x: 200, y: 160 }, [], 20);
    expect(route[0]).toEqual(start);
    expect(route.at(-1)).toEqual({ x: 200, y: 160 });
  });

  it('runs straight when both ends are level and nothing is in the way', () => {
    const box = { x: 300, y: 0, width: 100, height: 40 };
    expect(detourRoute(start, { x: 800, y: 100 }, [box], 20)).toEqual([start, { x: 800, y: 100 }]);
  });

  it('detours around a table in the way instead of crossing it', () => {
    const box = { x: 300, y: 40, width: 200, height: 220 };
    const route = detourRoute(start, { x: 800, y: 40 }, [box], 20);
    expect(route[0]).toEqual(start);
    expect(route.at(-1)).toEqual({ x: 800, y: 40 });
    expect(routeHitsBox(route, box)).toBe(false);
  });

  it('keeps clear of every table stacked in the way', () => {
    const upper = { x: 300, y: 0, width: 200, height: 90 };
    const lower = { x: 300, y: 130, width: 200, height: 200 };
    const route = detourRoute(start, { x: 800, y: 100 }, [upper, lower], 20);
    expect(routeHitsBox(route, upper)).toBe(false);
    expect(routeHitsBox(route, lower)).toBe(false);
  });

  it('detours around a table even when the ports are not left-to-right (the compound-layout case)', () => {
    // A table placed squarely between a port below it and one above and to the
    // side: the case the old column-based detour (which assumed start.x <=
    // end.x) had no answer for, and the one that let relation lines cut
    // through unrelated tables in the 2D Bounded Context pack.
    const box = { x: 100, y: 100, width: 200, height: 200 };
    const route = detourRoute({ x: 150, y: 350 }, { x: 250, y: 50 }, [box], 10);
    expect(routeHitsBox(route, box)).toBe(false);
  });
});

describe('relationRoute', () => {
  const tables = [
    { id: 'a', box: { x: 0, y: 0, width: 100, height: 40 } },
    { id: 'b', box: { x: 300, y: 0, width: 100, height: 40 } },
    { id: 'c', box: { x: 150, y: 0, width: 80, height: 200 } }, // sits between a and b
  ];

  it('detours the route between two tables around any other visible table', () => {
    const points = [
      { x: 100, y: 20 },
      { x: 300, y: 20 },
    ];
    const route = relationRoute({ from: 'a', to: 'b' }, points, tables, 20);
    expect(routeHitsBox(route, tables[2]!.box)).toBe(false);
  });

  it('treats a frame it does not belong to as a soft outline, not a wall', () => {
    const d = { id: 'd', box: { x: 400, y: 0, width: 100, height: 40 } };
    const points = [
      { x: 100, y: 20 },
      { x: 400, y: 20 },
    ];
    // A frame is a semantic grouping, not an obstacle: a cross-context relation
    // has to be able to cross it. A tall frame around `c` would force a hard
    // detour far above/below under the old "frame = wall" model.
    const frame = { box: { x: 200, y: -200, width: 100, height: 400 }, members: ['c'] };
    const route = relationRoute({ from: 'a', to: 'd' }, points, [tables[0]!, d], 20, [frame]);
    // The frame spans the whole vertical area; a hard obstacle would force the
    // route far outside it. Crossing it near y = 20 proves it is permeable.
    expect(Math.max(...route.map((point) => Math.abs(point.y - 20)))).toBeLessThan(100);
  });

  it('does not detour around a frame that contains one of the relation’s own endpoints', () => {
    const points = [
      { x: 100, y: 20 },
      { x: 150, y: 20 },
    ];
    // The frame spans both endpoints' tables (a, c), so it must not be
    // charged as an obstacle even though the direct route crosses its box.
    const frame = { box: { x: 50, y: 0, width: 150, height: 40 }, members: ['a', 'c'] };
    expect(relationRoute({ from: 'a', to: 'c' }, points, [tables[0]!, tables[2]!], 20, [frame])).toEqual(points);
  });

  it('never treats the relation’s own endpoint tables as obstacles', () => {
    const points = [
      { x: 100, y: 20 },
      { x: 150, y: 20 },
    ];
    // a and c would collide with each other if either were passed through as an obstacle;
    // excluding both endpoints means the direct route is returned untouched.
    expect(relationRoute({ from: 'a', to: 'c' }, points, tables, 20)).toEqual(points);
  });

  it('keeps a self-reference loop outside its own card', () => {
    const points = [
      { x: 100, y: 10 },
      { x: 120, y: 10 },
      { x: 120, y: 30 },
      { x: 10, y: 30 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
    ];
    const route = relationRoute({ from: 'a', to: 'a' }, points, tables, 20);
    expect(route).not.toBe(points);
    const box = tables[0]!.box;
    const inside = route
      .slice(1, -1)
      .filter(
        (point) => point.x > box.x && point.x < box.x + box.width && point.y > box.y && point.y < box.y + box.height,
      );
    expect(inside).toEqual([]);
  });

  it('returns the raw points unchanged when there is no start or end to route between', () => {
    expect(relationRoute({ from: 'a', to: 'b' }, [], tables, 20)).toEqual([]);
  });
});

describe('relationRoutes (direction-aware ports)', () => {
  // The old model always left through a card's right edge and arrived at its
  // left edge, so a relation whose target was left/above had to detour around
  // its own card (and its cardinality label sat opposite the visible line).
  // `relationRoute` now picks the side that faces the other end and escapes
  // straight out of it, so the plain case leaves through the right edge —
  // because `b` really is to the right — and never hugs either border.
  const a = { id: 'a', box: { x: 0, y: 0, width: 160, height: 120 } };
  const b = { id: 'b', box: { x: 400, y: 280, width: 160, height: 40 } };
  const relations = [{ id: 'a-b', from: 'a', to: 'b' }];
  const pointsById = new Map([
    [
      'a-b',
      [
        { x: 0, y: 60 }, // the layout's nominal left-edge port, no longer used as-is
        { x: 400, y: 300 }, // b's field-row port
      ],
    ],
  ]);

  it('leaves through the card side facing the other end, without hugging', () => {
    const routed = relationRoutes(relations, pointsById, [a, b], 10);
    const route = routed.get('a-b')!;
    expect(route[0]).toEqual({ x: 160, y: 60 });
    expect(routeHugsOutline(route, [a.box, b.box])).toBe(false);
    // Same shape `relationRoute` alone produces: `relationRoutes` orders and
    // nudges, it does not pick a different port behind its back.
    const naive = relationRoute({ from: 'a', to: 'b' }, pointsById.get('a-b')!, [a, b], 10);
    expect(route).toEqual(naive);
  });

  it('keeps the plain field-row exit for an edge whose default route never hugs anything', () => {
    const c = { id: 'c', box: { x: 0, y: 0, width: 100, height: 40 } };
    const d = { id: 'd', box: { x: 300, y: 0, width: 100, height: 40 } };
    const relations2 = [{ id: 'c-d', from: 'c', to: 'd' }];
    const points2 = new Map([
      [
        'c-d',
        [
          { x: 100, y: 20 },
          { x: 300, y: 20 },
        ],
      ],
    ]);
    const routed = relationRoutes(relations2, points2, [c, d], 10);
    expect(routed.get('c-d')).toEqual(points2.get('c-d'));
  });
});

describe('relation end glyphs sit on the drawn line', () => {
  // The reader's report: "a relation line begins at a point that is separate
  // from the source-side circle/marker … it should start at the circle/marker
  // on the table edge". `notation.ts` lays the crow's foot, its bars and its
  // "zero" circle out along the port's outgoing direction only; when the
  // route bent sooner than the glyph was long, the glyph was drawn beside the
  // stroke instead of on it. These assertions are geometric (they read the
  // drawn `d`, not the DOM): each glyph element has to touch the stroke, and
  // the stroke has to leave each port straight for the whole glyph.
  const STROKE_TOLERANCE = 0.75;

  /** Every point of an SVG path's `M`/`L`/`Q`/`C` commands, with curves sampled between their endpoints. */
  const strokeOf = (d: string, steps = 24): readonly LayoutPoint[] => {
    const tokens = d.match(/[MLQC]|-?\d+(?:\.\d+)?/gu) ?? [];
    const out: LayoutPoint[] = [];
    let at: LayoutPoint = { x: 0, y: 0 };
    let index = 0;
    while (index < tokens.length) {
      const command = tokens[index];
      if (command === undefined) break;
      index += 1;
      const take = (count: number): readonly number[] => {
        const values = tokens.slice(index, index + count).map(Number);
        index += count;
        return values;
      };
      if (command === 'M' || command === 'L') {
        const [x, y] = take(2) as [number, number];
        at = { x, y };
        out.push(at);
        continue;
      }
      const points =
        command === 'Q'
          ? (() => {
              const [cx, cy, x, y] = take(4) as [number, number, number, number];
              return { control: [{ x: cx, y: cy }], end: { x, y } };
            })()
          : (() => {
              const [c1x, c1y, c2x, c2y, x, y] = take(6) as [number, number, number, number, number, number];
              return {
                control: [
                  { x: c1x, y: c1y },
                  { x: c2x, y: c2y },
                ],
                end: { x, y },
              };
            })();
      const from = at;
      for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        const u = 1 - t;
        const controls = points.control;
        out.push(
          controls.length === 1
            ? {
                x: u * u * from.x + 2 * u * t * controls[0]!.x + t * t * points.end.x,
                y: u * u * from.y + 2 * u * t * controls[0]!.y + t * t * points.end.y,
              }
            : {
                x:
                  u ** 3 * from.x +
                  3 * u * u * t * controls[0]!.x +
                  3 * u * t * t * controls[1]!.x +
                  t ** 3 * points.end.x,
                y:
                  u ** 3 * from.y +
                  3 * u * u * t * controls[0]!.y +
                  3 * u * t * t * controls[1]!.y +
                  t ** 3 * points.end.y,
              },
        );
      }
      at = points.end;
    }
    return out;
  };

  const distanceToStroke = (stroke: readonly LayoutPoint[], point: LayoutPoint): number => {
    let best = Number.POSITIVE_INFINITY;
    for (let index = 1; index < stroke.length; index++) {
      const a = stroke[index - 1]!;
      const b = stroke[index]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = dx * dx + dy * dy;
      const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
      best = Math.min(best, Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t)));
    }
    return best;
  };

  /**
   * Everything one end glyph draws, as the segments and circle it is made of:
   * a bar's midpoints and a foot's apex are meant to lie *on* the stroke, and
   * the "zero" circle is meant to be centred there, so each element only has
   * to come within the stroke's tolerance somewhere along itself.
   */
  const glyphDistance = (
    stroke: readonly LayoutPoint[],
    points: readonly LayoutPoint[],
    end: 'start' | 'end',
    multiplicity: string,
  ): number => {
    const glyph = endGlyph(points, end, multiplicity as never);
    const elements: readonly (readonly LayoutPoint[])[] = [
      ...glyph.segments.map(([a, b]) =>
        Array.from({ length: 9 }, (_, step) => ({
          x: a.x + ((b.x - a.x) * step) / 8,
          y: a.y + ((b.y - a.y) * step) / 8,
        })),
      ),
      ...(glyph.circle === null ? [] : [[glyph.circle]]),
    ];
    return Math.min(...elements.map((element) => Math.min(...element.map((point) => distanceToStroke(stroke, point)))));
  };

  /**
   * Asserts the invariant for one relation: the drawn path starts and ends at
   * the ports the glyphs are anchored on, stays straight for the glyph's whole
   * length there, and each glyph element touches the stroke.
   */
  const expectGlyphsOnStroke = (
    points: readonly LayoutPoint[],
    cardinality: { parent: string; child: string },
  ): void => {
    const d = relationPath(points, LAYOUT.layerSpacing / 2);
    const stroke = strokeOf(d);
    const start = points[0]!;
    const end = points.at(-1)!;
    // The path's own `M` is the port, exactly where the glyph's tip sits.
    expect(stroke[0]).toEqual(start);
    expect(stroke.at(-1)).toEqual(end);
    for (const side of ['start', 'end'] as const) {
      const tip = side === 'start' ? start : end;
      const next = side === 'start' ? points[1]! : points[points.length - 2]!;
      const length = Math.hypot(next.x - tip.x, next.y - tip.y);
      const direction = { x: (next.x - tip.x) / length, y: (next.y - tip.y) / length };
      // Straight for the glyph's whole reach: every stroke sample within it
      // stays on the port's own row/column.
      for (const point of stroke) {
        const along = (point.x - tip.x) * direction.x + (point.y - tip.y) * direction.y;
        const across = Math.abs((point.x - tip.x) * direction.y - (point.y - tip.y) * direction.x);
        if (along > 0 && along < END_GLYPH_REACH) expect(across).toBeLessThanOrEqual(STROKE_TOLERANCE);
      }
      expect(length).toBeGreaterThanOrEqual(END_GLYPH_REACH);
      expect(
        glyphDistance(stroke, points, side, side === 'start' ? cardinality.parent : cardinality.child),
      ).toBeLessThanOrEqual(STROKE_TOLERANCE);
    }
  };

  it('keeps the port run long enough for the glyph, and the escape inside the lane margin', () => {
    // `PORT_STRAIGHT` is the router's port escape *and* the straight run the
    // path reserves; a longer one would land the route's first point inside
    // the margin-inflated box of the card across the nearest gap.
    expect(PORT_STRAIGHT).toBe(END_GLYPH_REACH);
    expect(PORT_STRAIGHT).toBeLessThanOrEqual(LANE_MARGIN);
  });

  it('draws a `0..N` end on the stroke even when the route bends right after the port', () => {
    // The reported shape: the source leaves sideways and the FK end arrives
    // level, one port-escape from a corner. The old 12px escape put the
    // "zero" circle (21px out) past that corner, in empty space.
    const tables = [
      { id: 'tenants', box: { x: 0, y: 0, width: 160, height: 120 } },
      { id: 'retry_policies', box: { x: 400, y: 400, width: 160, height: 100 } },
    ];
    const points = [
      { x: 160, y: 60 },
      { x: 400, y: 450 },
    ];
    const route = relationRoute({ from: 'tenants', to: 'retry_policies' }, points, tables, LANE_MARGIN);
    // The bend sits exactly one port-escape out, so the glyph's own reach is
    // all the straight run there is — the case that used to put the circle past
    // the corner.
    expect(Math.hypot(route[1]!.x - route[0]!.x, route[1]!.y - route[0]!.y)).toBe(PORT_STRAIGHT);
    expectGlyphsOnStroke(route, { parent: '1', child: '0..N' });
    expectGlyphsOnStroke(route, { parent: '0..1', child: '1..N' });
  });

  it('holds for every relation of a laid-out schema, before and after the change', () => {
    const schema = parseErData({
      before: {
        tables: [
          {
            id: 'tenants',
            name: 'Tenants',
            fields: [
              { id: 'id', type: 'uuid', key: 'PK' },
              { id: 'name', type: 'varchar' },
            ],
          },
          {
            id: 'customers',
            name: 'Customers',
            fields: [
              { id: 'id', type: 'uuid', key: 'PK' },
              { id: 'tenant_id', type: 'uuid', key: 'FK', ref: 'tenants.id' },
            ],
          },
        ],
      },
      after: {
        tables: [
          {
            id: 'tenants',
            name: 'Tenants',
            fields: [
              { id: 'id', type: 'uuid', key: 'PK' },
              { id: 'name', type: 'varchar' },
            ],
          },
          {
            id: 'customers',
            name: 'Customers',
            fields: [
              { id: 'id', type: 'uuid', key: 'PK' },
              { id: 'tenant_id', type: 'uuid', key: 'FK', ref: 'tenants.id' },
            ],
          },
          {
            id: 'invoices',
            name: 'Invoices',
            fields: [
              { id: 'id', type: 'uuid', key: 'PK' },
              { id: 'customer_id', type: 'uuid', key: 'FK', ref: 'customers.id' },
            ],
          },
          {
            id: 'retry_policies',
            name: 'Retry policies',
            fields: [
              { id: 'id', type: 'uuid', key: 'PK' },
              { id: 'tenant_id', type: 'uuid', key: 'FK', ref: 'tenants.id' },
            ],
          },
          {
            id: 'payments',
            name: 'Payments',
            fields: [
              { id: 'id', type: 'uuid', key: 'PK' },
              { id: 'invoice_id', type: 'uuid', key: 'FK', ref: 'invoices.id' },
              { id: 'retry_policy_id', type: 'uuid', key: 'FK', ref: 'retry_policies.id' },
            ],
          },
        ],
      },
    });
    expect(schema.edges.length).toBeGreaterThan(3);
    expect(schema.edges.some((relation) => relation.status !== 'same')).toBe(true);

    const { nodes, edges } = erLayoutSpec(schema);
    const placed = layeredLayout(nodes, edges, LAYOUT);
    const boxes = placed.nodes.map((node) => ({ id: node.id, box: node }));
    const pointsById = new Map(placed.routes.map((route) => [route.id, route.points] as const));
    const routed = relationRoutes(edges, pointsById, boxes, LANE_MARGIN);
    for (const relation of schema.edges) {
      const points = routed.get(relation.id);
      expect(points?.length ?? 0).toBeGreaterThan(1);
      expectGlyphsOnStroke(points!, relation.cardinality);
    }
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
