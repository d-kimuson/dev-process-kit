import type { LayoutPoint } from '../../lib/layout/layered';
import type { ErDiagramMessages } from './messages';
import type { ErCardinality, ErData, ErField, ErFieldDiff, ErRelation, ErTableDiff } from './model';

import {
  crossingsAgainst,
  horizontalBlocked,
  parallelOverlapAgainst,
  routeAroundObstacles,
  verticalBlocked,
  type RouteSegment,
} from '../../lib/layout/orthogonal-router';
import { nudgeParallelRoutes, type NudgeInput } from '../../lib/layout/route-nudge';
import { END_GLYPH_REACH } from './notation';

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
  // A relation column's definition follows the relation it carries: its editor offers no field to save, only Delete.
  if (field !== undefined && field.ref !== null) return { ready: false, issue: null };
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

export type BoundedContextGroup = {
  readonly boundedContext: string;
  readonly box: ErBox;
  readonly tables: readonly string[];
};

/**
 * Also used by `element.ts` to size the layout's `superGroupSpacing`. Wider
 * than `GROUP_PADDING`: a Bounded Context frame must clear the aggregate
 * frames nested inside it, not just the tables.
 */
export const BC_PADDING = 30;
/**
 * Extra room above the tables, for the Bounded Context's own label. Also used by `element.ts`,
 * like `GROUP_LABEL_SPACE`.
 *
 * Sized so the BC label clears the first nested aggregate's own label, not just its tables:
 * `(BC_PADDING + BC_LABEL_SPACE) - (GROUP_PADDING + GROUP_LABEL_SPACE)` is the world-space gap
 * between the two labels' baselines, and it must be at least as big as the BC label's own
 * worst-case footprint in that same space. That footprint is bounded (see the `.er-bc-label`
 * counter-scale cap in styles.ts) at roughly 2.2x its authored on-screen size — comfortably
 * under the ~32px this gap now reserves.
 */
export const BC_LABEL_SPACE = 46;
/**
 * Extra breathing room between two different Bounded Context frames, kept
 * separate from `BC_PADDING`/`BC_LABEL_SPACE` so it can be tuned on its own:
 * those two only reserve the minimum a BC's own frame needs to clear its
 * nested aggregate frames and label, not how far apart two *different* BCs'
 * frames sit from each other (#150: readers found the BCs crammed together
 * even with zero crossing lines). Also used by `element.ts` to size the
 * layout's `superGroupRowGap`/`superGroupColumnGap`, a pure post-process
 * `compoundLayout` applies only after it has already chosen the BC-level
 * order/row-split from `superGroupSpacing` — so these can be widened without
 * ever perturbing that crossing-minimising search.
 *
 * Split into a row and a column gap, rather than one constant, because
 * `superGroupSpacing` alone already leaves two different visual gaps once a
 * BC frame's label space (reserved on its own top edge only) is accounted
 * for: two BCs side by side (same row) end up ~58px apart, but two BCs
 * stacked (different rows) end up only ~12px apart — that missing
 * label-space reservation is exactly the deficit #150 reported as cramped.
 *
 * #150 round 1 picked small, ratchet-safe values (`+24`/`+10`) by bisecting
 * the largest per-axis addition that did not raise
 * `LAYOUT_BENCH_CROSSINGS_BASELINE` on this component's bench corpus (`pnpm
 * bench:layout`) *without changing the router*. That shipped a gap readers
 * could not actually see: on `er-complex` at a realistic fit-to-view zoom,
 * +10px on a ~58px gap is a few screen pixels. Round 2's ask was explicit:
 * pick the value the page needs (~150–200px final, on-screen-visible, final
 * gap — "roughly 2–3x round 1's"), and fix the *router* if widening exposes
 * a crossing regression, rather than capping the gap to whatever the old
 * router tolerated. `src/lib/layout/orthogonal-router.ts`'s `gridRoute` fallback
 * turned out to be genuinely blind to already-routed edges (see
 * `AVOID_CROSSING_PENALTY` there) — once fixed, every bench fixture's
 * crossing count stays at or below `LAYOUT_BENCH_CROSSINGS_BASELINE` at the
 * much wider gap below, several fixtures improve outright, and the residual
 * few-crossing wobble on `synthetic-random-2` as the gap grows is a single
 * long cross-BC edge genuinely rerouting over a much longer span — not a
 * geometry-sensitive tie-break — and stays well inside the ratchet.
 *
 * `BC_GAP_ROW = 160` / `BC_GAP_COLUMN = 120` bring the two axes to ~172px
 * (stacked, 12px native + 160) and ~178px (side-by-side, 58px native + 120)
 * on `er-complex` — close enough to read as the same gap despite the
 * different native starting points, and inside the requested 150–200px
 * band on both axes.
 */
export const BC_GAP_ROW = 160;
export const BC_GAP_COLUMN = 120;

/** The padded box around a set of already-placed tables, shared by every grouping (aggregate, Bounded Context, …). */
const paddedBox = (boxes: readonly ErBox[], padding: number, labelSpace: number): ErBox => {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return {
    x: left - padding,
    y: top - padding - labelSpace,
    width: right - left + padding * 2,
    height: bottom - top + padding * 2 + labelSpace,
  };
};

/** One bounding box per key (an aggregate, a Bounded Context, …), padded around the tables it groups. */
const groupsOf = <T extends { readonly id: string; readonly box: ErBox | null }>(
  tables: readonly T[],
  keyOf: (table: T) => string | null,
  padding: number,
  labelSpace: number,
): readonly { readonly key: string; readonly box: ErBox; readonly tables: readonly string[] }[] => {
  const byKey = new Map<string, { readonly id: string; readonly box: ErBox }[]>();
  for (const table of tables) {
    const key = keyOf(table);
    if (key === null || table.box === null) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), { id: table.id, box: table.box }]);
  }
  return [...byKey].map(([key, members]) => ({
    key,
    tables: members.map((member) => member.id),
    box: paddedBox(
      members.map((member) => member.box),
      padding,
      labelSpace,
    ),
  }));
};

/**
 * One bounding box per aggregate, padded around the tables it groups —
 * purely a visual grouping on the canvas, never a filter. A table without an
 * aggregate, or one not yet measured, takes part in no group.
 */
export const aggregateGroups = (
  tables: readonly { readonly id: string; readonly aggregate: string | null; readonly box: ErBox | null }[],
): readonly AggregateGroup[] =>
  groupsOf(tables, (table) => table.aggregate, GROUP_PADDING, GROUP_LABEL_SPACE).map((group) => ({
    aggregate: group.key,
    box: group.box,
    tables: group.tables,
  }));

/**
 * One bounding box per Bounded Context, padded (more generously than an
 * aggregate's) around every table it contains — again purely a visual
 * grouping, never a filter. A table outside any Bounded Context, or one not
 * yet measured, takes part in no group.
 */
export const boundedContextGroups = (
  tables: readonly { readonly id: string; readonly boundedContext: string | null; readonly box: ErBox | null }[],
): readonly BoundedContextGroup[] =>
  groupsOf(tables, (table) => table.boundedContext, BC_PADDING, BC_LABEL_SPACE).map((group) => ({
    boundedContext: group.key,
    box: group.box,
    tables: group.tables,
  }));

/**
 * The side of a card a relation leaves or enters through. The old model always
 * left through the right edge and arrived at the left edge, which is fine for
 * a strictly left-to-right schema but forces every other direction into a
 * long detour around the card (and made the cardinality label sit on the
 * opposite side from the visible line). The side is now chosen from where the
 * other table actually is.
 */
type RouteSide = 'left' | 'right' | 'top' | 'bottom';

const centreOf = (box: ErBox): LayoutPoint => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const clampPort = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/** The card side facing `to`: the dominant axis first, so a mostly horizontal relation leaves sideways. */
const facingSide = (from: ErBox, to: ErBox): RouteSide => {
  const a = centreOf(from);
  const b = centreOf(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
};

/** Keeps a port this far from a card corner, so its glyph never spills off the edge. */
const PORT_INSET = 12;

/**
 * Moves the layout's field-row anchor onto `side` of `box`. On left/right the
 * anchor's own y (the FK column's row) is preserved; on top/bottom the same
 * row fraction picks an x along the edge, so two relations leaving different
 * columns still separate even when they leave vertically.
 */
const portOnSide = (box: ErBox, side: RouteSide, anchor: LayoutPoint): LayoutPoint => {
  const innerY = clampPort(anchor.y - box.y, PORT_INSET, Math.max(PORT_INSET, box.height - PORT_INSET));
  const rowFraction = box.height <= 0 ? 0.5 : innerY / box.height;
  const alongEdge =
    box.x + clampPort(rowFraction * box.width, PORT_INSET, Math.max(PORT_INSET, box.width - PORT_INSET));
  switch (side) {
    case 'left':
      return { x: box.x, y: box.y + innerY };
    case 'right':
      return { x: box.x + box.width, y: box.y + innerY };
    case 'top':
      return { x: alongEdge, y: box.y };
    case 'bottom':
      return { x: alongEdge, y: box.y + box.height };
    default:
      return { x: box.x + box.width, y: box.y + innerY };
  }
};

/** The start/end ports a relation should actually use, given where both cards ended up. */
const directedPorts = (
  relation: { readonly from: string; readonly to: string },
  points: readonly LayoutPoint[],
  tables: readonly { readonly id: string; readonly box: ErBox }[],
): {
  readonly start: LayoutPoint;
  readonly end: LayoutPoint;
  readonly startSide: RouteSide;
  readonly endSide: RouteSide;
  readonly source: ErBox;
  readonly target: ErBox;
} | null => {
  const start = points[0];
  const end = points.at(-1);
  if (start === undefined || end === undefined || relation.from === relation.to) return null;
  const source = tables.find((table) => table.id === relation.from)?.box;
  const target = tables.find((table) => table.id === relation.to)?.box;
  if (source === undefined || target === undefined) return null;
  const startSide = facingSide(source, target);
  const endSide = facingSide(target, source);
  return {
    start: portOnSide(source, startSide, start),
    end: portOnSide(target, endSide, end),
    startSide,
    endSide,
    source,
    target,
  };
};

/**
 * The straight run every route keeps out of a port before it may bend: the
 * whole end glyph's own footprint (`notation.ts`'s `END_GLYPH_REACH`).
 *
 * `notation.ts` lays a crow's foot, its bars and its "zero" circle out along
 * the port's outgoing direction only — it has no idea where the line actually
 * bends. So the route has to *stay* straight for that whole length, or the
 * glyph is drawn past the corner, in empty space beside the stroke: the
 * reader's "the circle and the line start do not coincide" report, where
 * `0..N`'s circle (21px out, 25px including its radius) sat beyond a corner
 * only 12px from the card. Both the router's port escape (`relationRoute`)
 * and the path builders (`relationPath`, `roundedPath`) use this one number:
 * the escape reserves the run, the path refuses to spend it on a bend.
 *
 * Bounded above by the lane margin (half of `LAYOUT.nodeSpacing`, see
 * `element.ts`): a longer escape would put the route's first point inside the
 * margin-inflated box of the card across the nearest gap, where every leg out
 * of it counts as blocked and no clear candidate exists. `view.test.ts`
 * asserts the bound.
 */
export const PORT_STRAIGHT = END_GLYPH_REACH;

/** The outward unit normal of a card side. */
const outward = (side: RouteSide): LayoutPoint => {
  switch (side) {
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
  }
};

/**
 * A relation's orthogonal route between two ports that never crosses a table
 * on the way, for ports in any relative position — not only the common
 * left-to-right case. Delegates to the generic, direction-agnostic router in
 * `lib/layout`, so this is the one and only place in the ER view that decides
 * how a line actually bends around obstacles.
 *
 * `avoid`: segments from other edges already routed earlier in the same
 * batch (see `relationRoutes`), so the router can pick the less-crossing of
 * two otherwise-equal candidate shapes. Optional and empty by default, so a
 * single edge can still be routed in isolation (every direct caller of this
 * function other than `relationRoutes` does exactly that).
 */
export const detourRoute = (
  start: LayoutPoint,
  end: LayoutPoint,
  boxes: readonly ErBox[],
  margin: number,
  avoid: readonly RouteSegment[] = [],
  outlines: readonly ErBox[] = [],
  blocked: readonly ErBox[] = [],
): readonly LayoutPoint[] => routeAroundObstacles(start, end, boxes, margin, avoid, outlines, blocked);

/** Drops a point that only continues the previous direction, so the port stubs read as one straight run. */
const simplifyRoute = (points: readonly LayoutPoint[]): readonly LayoutPoint[] => {
  const out: LayoutPoint[] = [];
  for (const point of points) {
    const a = out.at(-2);
    const b = out.at(-1);
    if (a !== undefined && b !== undefined && a.x === b.x && b.x === point.x) {
      out[out.length - 1] = point;
      continue;
    }
    if (a !== undefined && b !== undefined && a.y === b.y && b.y === point.y) {
      out[out.length - 1] = point;
      continue;
    }
    if (b !== undefined && b.x === point.x && b.y === point.y) continue;
    out.push(point);
  }
  return out;
};

/**
 * A self-reference's loop, kept beside its own card instead of wrapping
 * around it. The layered layout's default loop leaves the right edge, drops
 * below the card and comes back to the left edge, which crosses every other
 * relation leaving the same table — on a hub table such as `users` that was
 * the single largest crossing source. This tries the four sides and keeps
 * the loop that crosses the fewest already-routed edges (then shares the
 * least lane, then is shortest).
 */
const selfLoopRoute = (
  relation: { readonly from: string; readonly to: string },
  points: readonly LayoutPoint[],
  tables: readonly { readonly id: string; readonly box: ErBox }[],
  margin: number,
  avoid: readonly RouteSegment[],
): readonly LayoutPoint[] => {
  const box = tables.find((table) => table.id === relation.from)?.box;
  const start = points[0];
  const end = points.at(-1);
  if (box === undefined || start === undefined || end === undefined) return points;
  const y1 = clampPort(start.y, box.y + PORT_INSET, Math.max(box.y + PORT_INSET, box.y + box.height - PORT_INSET));
  const y2 = clampPort(end.y, box.y + PORT_INSET, Math.max(box.y + PORT_INSET, box.y + box.height - PORT_INSET));
  const x1 = clampPort(start.x, box.x + PORT_INSET, Math.max(box.x + PORT_INSET, box.x + box.width - PORT_INSET));
  const x2 = clampPort(end.x, box.x + PORT_INSET, Math.max(box.x + PORT_INSET, box.x + box.width - PORT_INSET));
  const obstacles = tables.filter((table) => table.id !== relation.from).map((table) => table.box);
  const channel = margin + PORT_STRAIGHT;
  const candidates: readonly (readonly LayoutPoint[])[] = [
    // Right: out, down/up, back in.
    simplifyRoute([
      { x: box.x + box.width, y: y1 },
      { x: box.x + box.width + channel, y: y1 },
      { x: box.x + box.width + channel, y: y2 },
      { x: box.x + box.width, y: y2 },
    ]),
    // Left: the mirror.
    simplifyRoute([
      { x: box.x, y: y1 },
      { x: box.x - channel, y: y1 },
      { x: box.x - channel, y: y2 },
      { x: box.x, y: y2 },
    ]),
    // Bottom and top: vertical stubs, horizontal channel.
    simplifyRoute([
      { x: x1, y: box.y + box.height },
      { x: x1, y: box.y + box.height + channel },
      { x: x2, y: box.y + box.height + channel },
      { x: x2, y: box.y + box.height },
    ]),
    simplifyRoute([
      { x: x1, y: box.y },
      { x: x1, y: box.y - channel },
      { x: x2, y: box.y - channel },
      { x: x2, y: box.y },
    ]),
  ].filter((candidate) => {
    const segments = candidate.slice(1).map((point, index) => [candidate[index]!, point] as const);
    return segments.every(([a, b]) =>
      a.x === b.x
        ? !verticalBlocked(a.x, Math.min(a.y, b.y), Math.max(a.y, b.y), obstacles)
        : !horizontalBlocked(a.y, Math.min(a.x, b.x), Math.max(a.x, b.x), obstacles),
    );
  });
  if (candidates.length === 0) return points;
  const best = candidates.reduce((a, b) => {
    const aCross = crossingsAgainst(a, avoid);
    const bCross = crossingsAgainst(b, avoid);
    if (aCross !== bCross) return bCross < aCross ? b : a;
    const aParallel = parallelOverlapAgainst(a, avoid);
    const bParallel = parallelOverlapAgainst(b, avoid);
    if (aParallel !== bParallel) return bParallel < aParallel ? b : a;
    return b.length < a.length ? b : a;
  });
  return best;
};

/**
 * The relation's actual drawn route, from the card side that faces the other
 * end (`directedPorts`) around every other visible table. Aggregate/Bounded
 * Context frames are *soft* outlines, not walls: a frame is a semantic
 * grouping, and treating its padded rectangle as a hard obstacle forces
 * every cross-context line to run all the way around a whole context instead
 * of through the gutter beside its tables — the long "frame roller" detours
 * in the v0.3 review. The frames still feed the router as `outlines`, so a
 * candidate lane that would run along a frame border is rejected in favour of
 * one that keeps its distance. A self-reference keeps its initial loop
 * unchanged — `detourRoute` only knows how to route between two points.
 *
 * Shared by the live view (`element.ts`'s `#route`) and the layout-complexity
 * bench, so the metric always scores exactly what the view draws.
 */
export const relationRoute = (
  relation: { readonly from: string; readonly to: string },
  points: readonly LayoutPoint[],
  tables: readonly { readonly id: string; readonly box: ErBox }[],
  margin: number,
  frames: readonly { readonly box: ErBox; readonly members: readonly string[] }[] = [],
  avoid: readonly RouteSegment[] = [],
): readonly LayoutPoint[] => {
  if (relation.from === relation.to) return selfLoopRoute(relation, points, tables, margin, avoid);
  const ports = directedPorts(relation, points, tables);
  if (ports === null) return points;
  const tableObstacles = tables
    .filter((table) => table.id !== relation.from && table.id !== relation.to)
    .map((t) => t.box);
  // Just this relation's own table(s) and every frame's outline — exactly the
  // boxes excluded from `obstacles` above, so the router is blind to them and
  // can otherwise route right along one of their borders (#151 round 2:
  // `legacy_api_tokens`'s relation hugging its own left edge, then its own
  // aggregate frame's bottom border). Frames are outlines, not obstacles:
  // crossing one perpendicularly is normal (a cross-context relation must),
  // running along one is not.
  const ownTables = tables.filter((table) => table.id === relation.from || table.id === relation.to).map((t) => t.box);
  // Frames are soft outlines, but checking every frame on every candidate was
  // the routing pass's dominant cost on a large schema. Keep the edge's own
  // frame(s) unconditionally (the hug the reader reported is its own card or
  // its own frame), plus any frame within a generous window of the two ports —
  // a lane candidate never needs an outline far outside the span it is
  // considering.
  const ownFrames = frames
    .filter((frame) => frame.members.includes(relation.from) || frame.members.includes(relation.to))
    .map((frame) => frame.box);
  const OUTLINE_WINDOW = margin * 12;
  const left = Math.min(ports.start.x, ports.end.x) - OUTLINE_WINDOW;
  const right = Math.max(ports.start.x, ports.end.x) + OUTLINE_WINDOW;
  const top = Math.min(ports.start.y, ports.end.y) - OUTLINE_WINDOW;
  const bottom = Math.max(ports.start.y, ports.end.y) + OUTLINE_WINDOW;
  const nearbyFrames = frames
    .filter(
      (frame) =>
        frame.box.x < right &&
        frame.box.x + frame.box.width > left &&
        frame.box.y < bottom &&
        frame.box.y + frame.box.height > top,
    )
    .map((frame) => frame.box);
  const outlines = [...new Set([...ownTables, ...ownFrames, ...nearbyFrames])];
  // Leave each card straight out of its chosen side before turning. Without
  // this, a route whose first move is parallel to the card edge occupies the
  // border's own row/column (the reader's "line and column line have no gap"
  // failure) even though the router never enters the card. The escape is
  // `PORT_STRAIGHT` long — the end glyph's own footprint — so that crow's
  // foot, bars and "zero" circle are drawn on a straight tail rather than
  // past a corner the glyph cannot see.
  const startNormal = outward(ports.startSide);
  const endNormal = outward(ports.endSide);
  const startEscape = {
    x: ports.start.x + startNormal.x * PORT_STRAIGHT,
    y: ports.start.y + startNormal.y * PORT_STRAIGHT,
  };
  const endEscape = {
    x: ports.end.x + endNormal.x * PORT_STRAIGHT,
    y: ports.end.y + endNormal.y * PORT_STRAIGHT,
  };
  const middle = detourRoute(startEscape, endEscape, tableObstacles, margin, avoid, outlines, ownTables);
  return simplifyRoute([ports.start, ...middle, ports.end]);
};

const segmentsOf = (points: readonly LayoutPoint[]): readonly RouteSegment[] =>
  points.slice(1).map((point, i) => [points[i]!, point] as const);

/** Straight-line (Manhattan) port-to-port distance: the "how short is this edge" proxy used to decide routing order. */
const manhattanSpan = (points: readonly LayoutPoint[]): number => {
  const start = points[0];
  const end = points.at(-1);
  if (start === undefined || end === undefined) return 0;
  return Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
};

/**
 * Every relation's drawn route, in one pass: routed short-first so a later,
 * longer edge is the one that has to detour around an earlier, shorter one
 * (not the reverse), each route aware of every edge already routed via
 * `avoid` so the router can prefer the candidate shape that crosses fewer of
 * them; then the whole batch is pulled apart by `nudgeParallelRoutes` so two
 * routes sharing a corridor — or one hugging a frame border — separate into
 * their own tracks instead of running on top of each other (`scoreLayout`'s
 * `collinearOverlap` term).
 *
 * Nudging's output is kept unconditionally, even where it adds a crossing:
 * a per-edge revert ("only nudge where it does not add a crossing") was
 * tried and measured (#148 round 3) to be net harmful on corpora with wide,
 * shared corridors (`synthetic-random-1`) — two routes separating out of the
 * same corridor each look, in isolation, like they are "adding a crossing"
 * by leaving it, so the revert discarded most of nudging's fixes and
 * collinear overlap exploded back up (~3,300 → ~50,000 length on that
 * fixture) for a few crossings saved elsewhere. Routing order and edge-aware
 * L/lane selection already deliver the crossing improvement without that
 * trade, so nudging is left to do only its one job.
 *
 * #152 round 1 deleted the port-side hug search described in an earlier
 * version of this comment (~60% of this function's total time for a
 * readability-only win — see `dev/layout-bench/baseline.ts`). #152 round 2
 * went further and deleted the bounded rip-up-and-reroute pass that used to
 * run here too: profiling found `orthogonal-router.ts`'s grid-and-Dijkstra
 * fallback it kept re-invoking was ~95% of all routing time on the densest
 * fixture, not because any one call was slow but because every edge paid
 * for it again on every rip-up pass. That fallback is gone, replaced by a
 * fast-by-construction 2-bend lane detour (`laneDetour`) that is cheap
 * enough not to need amortizing across passes — see that module's own doc
 * comment. `dev/layout-bench/baseline.ts` records the resulting
 * `crossings`/`outlineHugging` deltas per fixture from dropping rip-up.
 *
 * Shared by the live view (`element.ts`) and the layout-complexity bench, so
 * the metric always scores exactly what the view draws.
 */
export const relationRoutes = (
  relations: readonly { readonly id: string; readonly from: string; readonly to: string }[],
  pointsById: ReadonlyMap<string, readonly LayoutPoint[]>,
  tables: readonly { readonly id: string; readonly box: ErBox }[],
  margin: number,
  frames: readonly { readonly box: ErBox; readonly members: readonly string[] }[] = [],
): ReadonlyMap<string, readonly LayoutPoint[]> => {
  // Group by source table, then route the farthest target of each source
  // first. Edges leaving one card share its exit corridor: the one that turns
  // last must take the inner lane, the one that turns first the outer lane,
  // or every earlier turn crosses a later edge's vertical run (the hub-table
  // fan-out). Groups themselves stay short-first, so a long cross-context
  // edge still detours around the short local ones it meets. Within one
  // source, ties fall back to the id for determinism.
  const span = (relation: { readonly id: string }): number => manhattanSpan(pointsById.get(relation.id) ?? []);
  const groupSpan = new Map<string, number>();
  for (const relation of relations) {
    const current = groupSpan.get(relation.from);
    if (current === undefined || span(relation) < current) groupSpan.set(relation.from, span(relation));
  }
  const order = [...relations].sort(
    (a, b) =>
      (groupSpan.get(a.from) ?? 0) - (groupSpan.get(b.from) ?? 0) ||
      a.from.localeCompare(b.from) ||
      span(b) - span(a) ||
      a.id.localeCompare(b.id),
  );

  const routeFor = (
    relation: { readonly id: string; readonly from: string; readonly to: string },
    avoid: readonly RouteSegment[],
  ): readonly LayoutPoint[] =>
    relationRoute(relation, pointsById.get(relation.id) ?? [], tables, margin, frames, avoid);

  // Pass 1: short edges first, each aware of every edge already routed. The
  // `avoid` list is appended to instead of rebuilt per edge (rebuilding it
  // was O(edges²) segment copies on the densest schema).
  const routed = new Map<string, readonly LayoutPoint[]>();
  const avoid: RouteSegment[] = [];
  for (const relation of order) {
    const points = routeFor(relation, avoid);
    routed.set(relation.id, points);
    avoid.push(...segmentsOf(points));
  }

  const inputs: NudgeInput[] = relations.map((relation) => {
    const tableObstacles = tables
      .filter((table) => table.id !== relation.from && table.id !== relation.to)
      .map((table) => table.box);
    // Own table(s) first, same as `relationRoute`'s own `outlines` — the
    // #151 user report's own-card half, not only its own-frame half (#151
    // round 2; see `NudgeInput.ownFrames`'s doc comment).
    const ownFrames: ErBox[] = tables
      .filter((table) => table.id === relation.from || table.id === relation.to)
      .map((table) => table.box);
    const frameObstacles: ErBox[] = [];
    for (const frame of frames) {
      const owns = frame.members.includes(relation.from) || frame.members.includes(relation.to);
      (owns ? ownFrames : frameObstacles).push(frame.box);
    }
    return {
      id: relation.id,
      points: routed.get(relation.id) ?? [],
      obstacles: [...tableObstacles, ...frameObstacles],
      ownFrames,
    };
  });
  return nudgeParallelRoutes(inputs, { minPortRun: PORT_STRAIGHT });
};

const CORNER_RADIUS = 10;

/**
 * A relation's line. A forward route — level runs joined by vertical jogs,
 * moving only rightwards — becomes level runs joined by smooth S-curves, each
 * reaching at most `reach` to either side of its jog (and never past half of
 * a run it shares with the next jog), so a curve stays inside the gap between
 * tables its jog sits in. Anything else keeps its channels, with rounded corners.
 *
 * `straight` (default `PORT_STRAIGHT`) is the run at either end that no bend
 * may touch: the end glyphs are laid out along the port's own direction, so
 * the stroke has to stay straight underneath them (see `PORT_STRAIGHT`).
 */
export const relationPath = (
  points: readonly LayoutPoint[],
  reach: number,
  straight: number = PORT_STRAIGHT,
): string => {
  const start = points[0];
  const end = points.at(-1);
  if (start === undefined || end === undefined || !isForward(points))
    return roundedPath(points, CORNER_RADIUS, straight);
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
    // The first and last run end at a port: reserve the glyph's own straight
    // tail there before the curve may begin. Zero leaves a plain corner,
    // which for a forward route is a straight vertical run (top.x === bottom.x).
    const firstRun = index === 1;
    const lastRun = index + 2 === points.length - 1;
    const keep = (run: number, reserved: boolean) => (reserved ? Math.max(0, run - straight) : run);
    const before = keep(share(top.x - (points[index - 1]?.x ?? top.x), index - 1 > 0), firstRun);
    const after = keep(share((points[index + 2]?.x ?? bottom.x) - bottom.x, index + 2 < points.length - 1), lastRun);
    const r = round(Math.min(reach, before, after));
    if (r === 0) {
      // No room left to curve before the port: keep the jog square. All of a
      // forward route's jogs are vertical, so this is still a right angle, not
      // a diagonal.
      lineTo(top);
      lineTo(bottom);
      continue;
    }
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
 *
 * `straight` (default `PORT_STRAIGHT`) is the run kept straight at either end
 * of the route: the end glyphs are laid out along the port's own direction,
 * not along the line, so a corner that reached back into that run would leave
 * its crow's foot or "zero" circle hanging beside the stroke. A corner too
 * close to a port is left square instead.
 */
export const roundedPath = (
  points: readonly LayoutPoint[],
  radius: number,
  straight: number = PORT_STRAIGHT,
): string => {
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
    // The first corner's in-run and the last one's out-run end at a port.
    const inRoom = index === 0 ? inLength - straight : inLength;
    const outRoom = rest[index + 2] === undefined ? outLength - straight : outLength;
    const r = Math.min(radius, inLength / 2, outLength / 2, inRoom, outRoom);
    if (r <= 0) {
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
