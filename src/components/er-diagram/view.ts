import type { LayoutPoint } from '../../lib/layout/layered';
import type { ErDiagramMessages } from './messages';
import type { ErCardinality, ErData, ErField, ErFieldDiff, ErRelation, ErTableDiff } from './model';

/**
 * Presentation of a table card's rows and of the column editor, apart from
 * how the element renders them.
 */

/** The one column editor open in the diagram: a new column, or an existing one's type, nullability and description. */
export type ColumnEditor =
  | {
      readonly kind: 'add';
      readonly table: string;
      readonly name: string;
      readonly type: string;
      readonly nullable: boolean;
      readonly description: string;
      /** No template recorded the last submission. */
      readonly failed: boolean;
    }
  | {
      readonly kind: 'edit';
      readonly table: string;
      readonly field: string;
      readonly type: string;
      readonly nullable: boolean;
      readonly description: string;
      readonly failed: boolean;
    };

/**
 * A row's detail line: type, reference, declared relation and nullability.
 * The keys already sit in the row's badge, so they are named only where a
 * change of keys has to be read from the text.
 */
export const fieldDetail = (field: ErField, m: ErDiagramMessages, withKeys = false): string =>
  [
    [field.type, field.ref === null ? null : `→ ${field.ref}`].filter(Boolean).join(' '),
    withKeys && field.keys.length > 0 ? field.keys.join('+') : null,
    field.cardinality,
    field.label === null ? null : `“${field.label}”`,
    field.nullable ? m.nullable : null,
  ]
    .filter(Boolean)
    .join(' · ');

/** One attribute of a changed column, as text for each side. */
export type FieldChange = {
  readonly attribute: 'type' | 'keys' | 'ref' | 'nullable' | 'cardinality' | 'label';
  readonly before: string;
  readonly after: string;
};

const NONE = '—';

/** What a changed column changed, attribute by attribute, in reading order. */
export const fieldChanges = (field: ErFieldDiff, m: ErDiagramMessages): readonly FieldChange[] => {
  const previous = field.before;
  if (previous === null) return [];
  const sides: readonly [FieldChange['attribute'], (column: ErField) => string][] = [
    ['type', (column) => column.type],
    ['keys', (column) => (column.keys.length === 0 ? NONE : column.keys.join('+'))],
    ['ref', (column) => column.ref ?? NONE],
    ['nullable', (column) => (column.nullable ? m.nullable : m.notNull)],
    ['cardinality', (column) => column.cardinality ?? NONE],
    ['label', (column) => (column.label === null ? NONE : `“${column.label}”`)],
  ];
  return sides.flatMap(([attribute, text]) =>
    text(previous) === text(field) ? [] : [{ attribute, before: text(previous), after: text(field) }],
  );
};

/** An editor closed with Escape: what was typed, and the editor it was opened as. */
export type ParkedEditor = { readonly draft: ColumnEditor; readonly base: ColumnEditor };

/**
 * The editor to open: the parked draft while the column still reads as it did
 * when the draft was started, else the fresh one, so a value the column no
 * longer has is never offered for saving back.
 */
export const resumeEditor = (parked: ParkedEditor | undefined, fresh: ColumnEditor): ColumnEditor =>
  parked !== undefined && JSON.stringify(parked.base) === JSON.stringify(fresh) ? parked.draft : fresh;

/** Every column type in the schema, offered while typing one. */
export const typeSuggestions = (data: ErData): readonly string[] =>
  [...new Set(data.nodes.flatMap((table) => table.fields.map((field) => field.type)))].sort();

/** An entry in the type input's list: a type the schema uses, or what was typed, as a new one. */
export type TypeOption =
  | { readonly kind: 'schema'; readonly type: string }
  | { readonly kind: 'new'; readonly type: string };

export type TypeMenu = {
  readonly options: readonly TypeOption[];
  /** The highlighted option, which Enter takes; -1 when there is none. */
  readonly active: number;
};

/**
 * The type input's list. While it is empty or names a type already, every type
 * (so another can be picked), with that one highlighted. Otherwise the types
 * containing what was typed, those starting with it first, and then what was
 * typed itself as a new type. `moved` is where the arrow keys took the
 * highlight, wrapping around the ends; null keeps it on the default.
 */
export const typeMenu = (types: readonly string[], typed: string, moved: number | null): TypeMenu => {
  const query = typed.trim();
  const lower = query.toLowerCase();
  const named = types.findIndex((type) => type.toLowerCase() === lower);
  const options: readonly TypeOption[] =
    lower === '' || named !== -1
      ? types.map((type) => ({ kind: 'schema', type }))
      : [
          ...types.filter((type) => type.toLowerCase().startsWith(lower)),
          ...types.filter((type) => !type.toLowerCase().startsWith(lower) && type.toLowerCase().includes(lower)),
        ]
          .map((type): TypeOption => ({ kind: 'schema', type }))
          .concat({ kind: 'new', type: query });
  if (options.length === 0) return { options, active: -1 };
  const active = moved ?? Math.max(0, named);
  return { options, active: ((active % options.length) + options.length) % options.length };
};

export type EditorVerdict = {
  /** The editor holds something worth recording. */
  readonly ready: boolean;
  readonly issue: 'name-taken' | null;
};

/** Whether the editor can be submitted, and what to tell the reader when it cannot. */
export const editorVerdict = (editor: ColumnEditor, table: ErTableDiff): EditorVerdict => {
  const type = editor.type.trim();
  if (editor.kind === 'add') {
    const name = editor.name.trim();
    if (table.fields.some((field) => field.id === name)) return { ready: false, issue: 'name-taken' };
    return { ready: name !== '' && type !== '', issue: null };
  }
  const field = table.fields.find((item) => item.id === editor.field);
  const description = editor.description.trim();
  const changed =
    field === undefined ||
    type !== field.type ||
    editor.nullable !== field.nullable ||
    description !== (field.description ?? '');
  return { ready: type !== '' && changed, issue: null };
};

/** The one icon a column row leads with: its strongest role, else whether it may be NULL. */
export type ColumnIcon = 'primary' | 'foreign' | 'not-null' | 'nullable';

export const columnIcon = (field: ErField): ColumnIcon => {
  if (field.keys.includes('PK')) return 'primary';
  if (field.keys.includes('FK') || field.ref !== null) return 'foreign';
  return field.nullable ? 'nullable' : 'not-null';
};

/** What the reader points at or selects: a table, one of its columns, or a relation. */
export type ErFocus =
  | { readonly kind: 'table'; readonly id: string }
  | { readonly kind: 'column'; readonly table: string; readonly field: string }
  | { readonly kind: 'relation'; readonly id: string };

/** What a focus lights up. Columns are `table.field`. */
export type ErHighlight = {
  readonly tables: ReadonlySet<string>;
  readonly edges: ReadonlySet<string>;
  readonly columns: ReadonlySet<string>;
};

const touches = (edge: ErRelation, focus: ErFocus): boolean => {
  if (focus.kind === 'relation') return edge.id === focus.id;
  if (focus.kind === 'table') return edge.from === focus.id || edge.to === focus.id;
  return (
    (edge.from === focus.table && edge.sourceField === focus.field) ||
    (edge.to === focus.table && edge.targetField === focus.field)
  );
};

/**
 * The relations a focus reaches, the tables at both of their ends and the two
 * columns each one joins, so the reader sees which key leads where. A table
 * reaches every relation it takes part in; a column only the ones its key
 * carries (one that joins nothing stands for its whole table); a relation itself.
 */
export const highlightOf = (edges: readonly ErRelation[], focus: readonly ErFocus[]): ErHighlight => {
  const effective = focus.map((item): ErFocus =>
    item.kind === 'column' && !edges.some((edge) => touches(edge, item)) ? { kind: 'table', id: item.table } : item,
  );
  const tables = new Set(
    effective.flatMap((item) => (item.kind === 'relation' ? [] : [item.kind === 'table' ? item.id : item.table])),
  );
  const lit = new Set<string>();
  const columns = new Set<string>();
  for (const edge of edges) {
    if (!effective.some((item) => touches(edge, item))) continue;
    lit.add(edge.id);
    tables.add(edge.from).add(edge.to);
    columns.add(`${edge.from}.${edge.sourceField}`).add(`${edge.to}.${edge.targetField}`);
  }
  return { tables, edges: lit, columns };
};

/** A table card's box in the world. */
export type ErBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

/** The `parent:child` value a cardinality editor's select holds. */
export const cardinalityValue = (cardinality: ErCardinality): string => `${cardinality.parent}:${cardinality.child}`;

/** The relation's cardinality editor: open for one edge, with the value it will submit. */
export type CardinalityEditor = {
  readonly edge: string;
  readonly cardinality: string;
  readonly failed: boolean;
};

export type AggregateGroup = { readonly aggregate: string; readonly box: ErBox; readonly tables: readonly string[] };

/** Also used by `element.ts` to size the layout's `groupSpacing`, so a dragged frame has room to breathe. */
export const GROUP_PADDING = 18;
/**
 * Extra room above the tables, for the aggregate's own label. Also used by
 * `element.ts`: the frame's extra top space, on top of `GROUP_PADDING` on
 * every side, must fit inside the layout's `groupSpacing` too, or two
 * adjacent aggregates' frames overlap even though their tables never do.
 */
export const GROUP_LABEL_SPACE = 22;

/**
 * One bounding box per aggregate, padded around the tables it groups —
 * purely a visual grouping on the canvas, never a filter. A table without an
 * aggregate, or one not yet measured, takes part in no group.
 */
export const aggregateGroups = (
  tables: readonly { readonly id: string; readonly aggregate: string | null; readonly box: ErBox | null }[],
): readonly AggregateGroup[] => {
  const byAggregate = new Map<string, { readonly id: string; readonly box: ErBox }[]>();
  for (const table of tables) {
    if (table.aggregate === null || table.box === null) continue;
    byAggregate.set(table.aggregate, [...(byAggregate.get(table.aggregate) ?? []), { id: table.id, box: table.box }]);
  }
  return [...byAggregate].map(([aggregate, members]) => {
    const boxes = members.map((member) => member.box);
    const left = Math.min(...boxes.map((box) => box.x));
    const top = Math.min(...boxes.map((box) => box.y));
    const right = Math.max(...boxes.map((box) => box.x + box.width));
    const bottom = Math.max(...boxes.map((box) => box.y + box.height));
    return {
      aggregate,
      tables: members.map((member) => member.id),
      box: {
        x: left - GROUP_PADDING,
        y: top - GROUP_PADDING - GROUP_LABEL_SPACE,
        width: right - left + GROUP_PADDING * 2,
        height: bottom - top + GROUP_PADDING * 2 + GROUP_LABEL_SPACE,
      },
    };
  });
};

/**
 * A forward relation's orthogonal route from the referenced column's right
 * edge to the FK column's left edge that never crosses a table on the way.
 * In each layer of tables between them the line keeps its height when that
 * is clear, and otherwise moves to the free lane (at least `margin` from any
 * table) costing the least detour toward its end. Each change of height
 * happens halfway across the gap before that layer, and the last one halfway
 * before the FK table.
 */
export const detourRoute = (
  start: LayoutPoint,
  end: LayoutPoint,
  boxes: readonly ErBox[],
  margin: number,
): readonly LayoutPoint[] => {
  const between = boxes.filter((box) => box.x >= start.x && box.x + box.width <= end.x);
  const layers: ErBox[][] = [];
  for (const box of [...between].sort((a, b) => a.x - b.x)) {
    const layer = layers.find((group) =>
      group.some((other) => box.x < other.x + other.width && other.x < box.x + box.width),
    );
    if (layer) layer.push(box);
    else layers.push([box]);
  }
  const points: LayoutPoint[] = [start];
  let x = start.x;
  let y = start.y;
  const step = (channel: number, to: number) => {
    if (to === y) return;
    points.push({ x: channel, y }, { x: channel, y: to });
    y = to;
  };
  for (const layer of layers) {
    const left = Math.min(...layer.map((box) => box.x));
    const right = Math.max(...layer.map((box) => box.x + box.width));
    const free = (lane: number) => layer.every((box) => lane <= box.y - margin || lane >= box.y + box.height + margin);
    const lanes = [y, end.y, ...layer.flatMap((box) => [box.y - margin, box.y + box.height + margin])].filter(free);
    const cost = (lane: number) => Math.abs(lane - y) + Math.abs(lane - end.y);
    const lane = lanes.reduce((best, next) => (cost(next) < cost(best) ? next : best), lanes[0] ?? y);
    step((x + left) / 2, lane);
    x = right;
  }
  step((x + end.x) / 2, end.y);
  points.push(end);
  return points;
};

const CORNER_RADIUS = 10;

/**
 * A relation's line. A forward route — level runs joined by vertical jogs,
 * moving only rightwards — becomes level runs joined by smooth S-curves, each
 * reaching at most `reach` to either side of its jog (and never past half of
 * a run it shares with the next jog), so a curve stays inside the gap between
 * tables its jog sits in. Anything else keeps its channels, with rounded corners.
 */
export const relationPath = (points: readonly LayoutPoint[], reach: number): string => {
  const start = points[0];
  const end = points.at(-1);
  if (start === undefined || end === undefined || !isForward(points)) return roundedPath(points, CORNER_RADIUS);
  const parts = [`M${point(start)}`];
  let at = start;
  const lineTo = (next: LayoutPoint) => {
    if (next.x !== at.x || next.y !== at.y) parts.push(`L${point(next)}`);
    at = next;
  };
  // Points alternate: a jog is points[i] → points[i + 1] at one x.
  for (let index = 1; index + 1 < points.length; index += 2) {
    const top = points[index];
    const bottom = points[index + 1];
    if (top === undefined || bottom === undefined) continue;
    const share = (run: number, shared: boolean) => (shared ? run / 2 : run);
    const before = share(top.x - (points[index - 1]?.x ?? top.x), index - 1 > 0);
    const after = share((points[index + 2]?.x ?? bottom.x) - bottom.x, index + 2 < points.length - 1);
    const r = round(Math.min(reach, before, after));
    lineTo({ x: round(top.x - r), y: top.y });
    parts.push(`C${point(top)} ${point(bottom)} ${round(bottom.x + r)} ${bottom.y}`);
    at = { x: round(bottom.x + r), y: bottom.y };
  }
  lineTo(end);
  return parts.join(' ');
};

/** Level runs and vertical jogs in turn, starting and ending level, never turning back. */
export const isForward = (points: readonly LayoutPoint[]): boolean =>
  points.length >= 2 &&
  points.length % 2 === 0 &&
  points.every((p, index) => {
    const previous = points[index - 1];
    if (previous === undefined) return true;
    return index % 2 === 1 ? p.y === previous.y && p.x >= previous.x : p.x === previous.x;
  }) &&
  (points.at(-1)?.x ?? 0) > (points[0]?.x ?? 0);

const point = (p: LayoutPoint): string => `${p.x} ${p.y}`;

/**
 * SVG path of an orthogonal route with its corners rounded, so relation lines
 * read as smooth steps. A corner never takes more than half of either
 * segment beside it, so short jogs still meet their neighbours.
 */
export const roundedPath = (points: readonly LayoutPoint[], radius: number): string => {
  const [first, ...rest] = points;
  if (first === undefined) return '';
  const parts = [`M${point(first)}`];
  rest.forEach((corner, index) => {
    const before = points[index] ?? corner;
    const after = rest[index + 1];
    if (after === undefined) {
      parts.push(`L${point(corner)}`);
      return;
    }
    const inLength = Math.hypot(corner.x - before.x, corner.y - before.y);
    const outLength = Math.hypot(after.x - corner.x, after.y - corner.y);
    const r = Math.min(radius, inLength / 2, outLength / 2);
    if (r === 0) {
      parts.push(`L${point(corner)}`);
      return;
    }
    const toward = (from: LayoutPoint, to: LayoutPoint, length: number): LayoutPoint => ({
      x: round(from.x + ((to.x - from.x) / length) * r),
      y: round(from.y + ((to.y - from.y) / length) * r),
    });
    parts.push(
      `L${point(toward(corner, before, inLength))}`,
      `Q${point(corner)} ${point(toward(corner, after, outLength))}`,
    );
  });
  return parts.join(' ');
};

const round = (value: number): number => Math.round(value * 100) / 100 || 0;
