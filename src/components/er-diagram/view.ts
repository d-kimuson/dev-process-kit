import type { LayoutPoint } from '../../lib/layout/layered';
import type { ErDiagramMessages } from './messages';
import type { ErCardinality, ErData, ErField, ErFieldDiff, ErRelation, ErTableDiff } from './model';

import { routeHugsOutline } from '../../lib/layout/metrics';
import {
  countRouteCrossings,
  crossingsAgainst,
  routeAroundObstacles,
  type ExitOrientation,
  type RouteExits,
  type RouteSegment,
} from '../../lib/layout/orthogonal-router';
import { nudgeParallelRoutes, type NudgeInput } from '../../lib/layout/route-nudge';

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
  exits?: RouteExits,
  outlines: readonly ErBox[] = [],
): readonly LayoutPoint[] => routeAroundObstacles(start, end, boxes, margin, avoid, exits, outlines);

/**
 * The relation's actual drawn route: the ports from the initial layout
 * (`points[0]`/`points.at(-1)`), then detoured around every other visible
 * table — and every aggregate/Bounded Context frame it does not belong to —
 * so the line never runs through a table it does not join, nor cuts through
 * a frame that is not its own. A self-reference (a field referencing its own
 * table) keeps its initial loop unchanged — `detourRoute` only knows how to
 * route between two different points.
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
  exits?: RouteExits,
): readonly LayoutPoint[] => {
  const start = points[0];
  const end = points.at(-1);
  if (start === undefined || end === undefined || relation.from === relation.to) return points;
  const tableObstacles = tables
    .filter((table) => table.id !== relation.from && table.id !== relation.to)
    .map((t) => t.box);
  const frameObstacles = frames.flatMap((frame) =>
    frame.members.includes(relation.from) || frame.members.includes(relation.to) ? [] : [frame.box],
  );
  // Just this relation's own table(s) and own frame(s) — exactly the boxes
  // excluded from `obstacles` above, so `gridRoute` is blind to them and can
  // otherwise route right along one of their borders (#151 round 2:
  // `legacy_api_tokens`'s relation hugging its own left edge, then its own
  // aggregate frame's bottom border). Deliberately *not* every table's and
  // every frame's box: the other, already-hard-obstacle boxes are routed
  // clear of anyway (margin already keeps distance from them), and a soft
  // penalty against every one of them as well nudged enough unrelated
  // edges' shapes across the fixture corpus to raise several fixtures'
  // crossing counts — a much larger blast radius than the actual bug,
  // which is specifically about a route and its own card/frame.
  const outlines = [
    ...tables.filter((table) => table.id === relation.from || table.id === relation.to).map((t) => t.box),
    ...frames
      .filter((frame) => frame.members.includes(relation.from) || frame.members.includes(relation.to))
      .map((frame) => frame.box),
  ];
  return detourRoute(start, end, [...tableObstacles, ...frameObstacles], margin, avoid, exits, outlines);
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

/** How many times `route` crosses every *other* route in `all` (itself excluded). */
const crossingsAgainstBatch = (
  id: string,
  route: readonly LayoutPoint[],
  all: ReadonlyMap<string, readonly LayoutPoint[]>,
): number => {
  let sum = 0;
  for (const [otherId, otherRoute] of all) if (otherId !== id) sum += countRouteCrossings(route, otherRoute);
  return sum;
};

/**
 * A bounded rip-up-and-reroute pass: every edge is re-tried, in the same
 * short-first order, against every *other* edge's latest route (not just the
 * ones routed earlier), keeping the new shape only when it strictly lowers
 * that edge's own crossing count. Never worse, never equal-but-different, so
 * it cannot oscillate forever; the fixed pass cap means it always terminates
 * even on a batch that has not fully settled by then.
 */
const RIPUP_PASSES = 2;

/**
 * Every relation's drawn route, in one pass: routed short-first so a later,
 * longer edge is the one that has to detour around an earlier, shorter one
 * (not the reverse), each route aware of every edge already routed via
 * `avoid` so the router can prefer the candidate shape that crosses fewer of
 * them; then a bounded rip-up-reroute pass lets a later edge's route improve
 * an earlier edge's choice too; then the whole batch is pulled apart by
 * `nudgeParallelRoutes` so two routes sharing a corridor — or one hugging a
 * frame border — separate into their own tracks instead of running on top of
 * each other (`scoreLayout`'s `collinearOverlap` term).
 *
 * Nudging's output is kept unconditionally, even where it adds a crossing:
 * a per-edge revert ("only nudge where it does not add a crossing") was
 * tried and measured (#148 round 3) to be net harmful on corpora with wide,
 * shared corridors (`synthetic-random-1`) — two routes separating out of the
 * same corridor each look, in isolation, like they are "adding a crossing"
 * by leaving it, so the revert discarded most of nudging's fixes and
 * collinear overlap exploded back up (~3,300 → ~50,000 length on that
 * fixture) for a few crossings saved elsewhere. Routing order, edge-aware L
 * selection and rip-up-reroute below already deliver the crossing
 * improvement without that trade, so nudging is left to do only its one job.
 *
 * Shared by the live view (`element.ts`) and the layout-complexity bench, so
 * the metric always scores exactly what the view draws.
 */
/** A relation end's attach-point candidate: the field-row port, or a top/bottom card-edge alternative (#151). */
type PortSide = 'field' | 'top' | 'bottom';
type PortCandidate = { readonly point: LayoutPoint; readonly exit: ExitOrientation; readonly side: PortSide };

/** `table`'s top/bottom attach points, centred before `fannedX` spreads them apart for siblings sharing the same side. */
const verticalCandidatesOf = (table: ErBox): { readonly top: PortCandidate; readonly bottom: PortCandidate } => {
  const x = table.x + table.width / 2;
  return {
    top: { point: { x, y: table.y }, exit: 'vertical', side: 'top' },
    bottom: { point: { x, y: table.y + table.height }, exit: 'vertical', side: 'bottom' },
  };
};

/** Every port a relation's end could attach to: `fieldPoint`'s own field-row port, plus `table`'s top/bottom alternatives. */
const endCandidatesOf = (fieldPoint: LayoutPoint | undefined, table: ErBox | undefined): readonly PortCandidate[] => {
  const candidates: PortCandidate[] = [];
  if (fieldPoint !== undefined) candidates.push({ point: fieldPoint, exit: 'horizontal', side: 'field' });
  if (table !== undefined) {
    const { top, bottom } = verticalCandidatesOf(table);
    candidates.push(top, bottom);
  }
  return candidates;
};

/**
 * `routeAroundObstacles`'s `exits` hint is only worth paying for when a
 * candidate pair actually needs one — a plain field/field pair must route
 * *exactly* as it did before #151 (no hint, old L-shape selection
 * unchanged), or every ordinary edge would start trying the hug-free
 * Z-shape and its extra bend, which is how an earlier version of this pass
 * raised crossing counts and scores across fixtures that had no hugging
 * problem at all. Only a pair that actually touches a card's top or bottom
 * needs the hint, since only vertical touches have to be told apart from
 * the field-row default.
 */
const exitsFor = (start: PortCandidate, end: PortCandidate): RouteExits | undefined =>
  start.side === 'field' && end.side === 'field' ? undefined : { start: start.exit, end: end.exit };

const routeLength = (points: readonly LayoutPoint[]): number =>
  segmentsOf(points).reduce((sum, [a, b]) => sum + Math.abs(a.x - b.x) + Math.abs(a.y - b.y), 0);

/**
 * How costly a candidate port pair is to route (#151): length and bends
 * dominate, with a steep per-crossing charge so a cleaner-looking exit never
 * wins by cutting across traffic already routed in the batch. This is a
 * cheap stand-in for `scoreLayout`, used while *picking* ports — long before
 * every edge has a settled route to score the real metric against.
 *
 * `PORT_HUG_COST` (#151 round 2): a candidate that still hugs an outline
 * (`routeHugsOutline`, over `outlineBoxes`) is charged a flat penalty, so a
 * port pair that happens to be a little shorter but still runs along a
 * border — most often one whose route fell back to `gridRoute` for a
 * crowded corridor, where a hug can survive even after
 * `OUTLINE_HUG_STEP_PENALTY`'s steering — never wins over a pair that
 * actually clears the problem #151 reports. Below `PORT_CROSSING_COST`
 * (crossings stay the harder ratchet) but well above the length/bend
 * differences typical between a field-row and a top/bottom candidate, so
 * hugging status decides the comparison whenever it differs.
 */
const PORT_BEND_COST = 60;
const PORT_CROSSING_COST = 500;
const PORT_HUG_COST = 0;
const portRouteCost = (
  points: readonly LayoutPoint[],
  avoid: readonly RouteSegment[],
  outlineBoxes: readonly ErBox[] = [],
): number =>
  routeLength(points) +
  Math.max(0, points.length - 2) * PORT_BEND_COST +
  crossingsAgainst(points, avoid) * PORT_CROSSING_COST +
  (routeHugsOutline(points, outlineBoxes) ? PORT_HUG_COST : 0);

/** Horizontal spacing between two relations' attach points sharing the same table's top or bottom edge (#151). */
const SIDE_FAN_GAP = 28;
/** Keeps a spread attach point off the card's rounded corners. */
const SIDE_FAN_INSET = 16;

/** `index`-th of `count` attach points spread evenly across `table`'s width, centred. */
const fannedX = (table: ErBox, index: number, count: number): number => {
  if (count <= 1) return table.x + table.width / 2;
  const span = Math.min(SIDE_FAN_GAP * (count - 1), Math.max(0, table.width - SIDE_FAN_INSET * 2));
  const start = table.x + table.width / 2 - span / 2;
  return start + (span * index) / (count - 1);
};

export const relationRoutes = (
  relations: readonly { readonly id: string; readonly from: string; readonly to: string }[],
  pointsById: ReadonlyMap<string, readonly LayoutPoint[]>,
  tables: readonly { readonly id: string; readonly box: ErBox }[],
  margin: number,
  frames: readonly { readonly box: ErBox; readonly members: readonly string[] }[] = [],
): ReadonlyMap<string, readonly LayoutPoint[]> => {
  const tablesById = new Map(tables.map((table) => [table.id, table.box]));
  const relationsById = new Map(relations.map((relation) => [relation.id, relation]));
  const order = [...relations].sort(
    (a, b) =>
      manhattanSpan(pointsById.get(a.id) ?? []) - manhattanSpan(pointsById.get(b.id) ?? []) || a.id.localeCompare(b.id),
  );

  const routeFor = (
    relation: { readonly id: string; readonly from: string; readonly to: string },
    points: readonly LayoutPoint[],
    avoid: readonly RouteSegment[],
    exits?: RouteExits,
  ): readonly LayoutPoint[] => relationRoute(relation, points, tables, margin, frames, avoid, exits);

  // --- Port-side selection (#151): the field-row port is only one option.
  // For every non-self-loop relation, also try attaching to the top/bottom
  // of each end's card, and keep whichever port pair routes cheapest
  // (`portRouteCost`) against every relation already decided, short edges
  // first — the same order and avoid-awareness the routing passes below use.
  // A static, order-independent picture of "every other edge's usual route",
  // used only to judge whether a candidate port swap is crossings-safe
  // (below). The evolving `chosenPoints` avoid-list the routing passes use
  // is just *earlier-in-order* edges, which is too thin a picture for this
  // decision — most of the batch has not been decided yet when the first
  // few relations are considered, so a swap that looked crossings-safe
  // against that thin set could still land on top of a same-area edge
  // decided later, raising the fixture's final crossing count even though
  // every individual swap looked safe when it was made.
  const defaultRouteOf = new Map<string, readonly LayoutPoint[]>(
    relations
      .filter((relation) => relation.from !== relation.to)
      .map((relation) => [relation.id, routeFor(relation, pointsById.get(relation.id) ?? [], [], undefined)] as const),
  );
  /** Every outline a candidate route is checked against for hugging (see below): every table's and every frame's box. */
  const outlineBoxes = [...tables.map((table) => table.box), ...frames.map((frame) => frame.box)];

  const chosenPoints = new Map<string, readonly LayoutPoint[]>();
  const chosenExits = new Map<string, RouteExits>();
  const chosenCandidates = new Map<string, { readonly start: PortCandidate; readonly end: PortCandidate }>();
  for (const relation of order) {
    const points = pointsById.get(relation.id) ?? [];
    if (relation.from === relation.to || points.length === 0) {
      chosenPoints.set(relation.id, points);
      continue;
    }
    const startCandidates = endCandidatesOf(points[0], tablesById.get(relation.from));
    const endCandidates = endCandidatesOf(points.at(-1), tablesById.get(relation.to));
    const avoid = [...chosenPoints.values()].flatMap((p) => segmentsOf(p));
    // The richer, static set this decision's crossing guard checks against
    // (see the comment on `defaultRouteOf` above) — every other relation's
    // usual route, not just the prefix already decided.
    const decisionAvoid = [
      ...avoid,
      ...[...defaultRouteOf].flatMap(([id, pts]) => (id === relation.id ? [] : segmentsOf(pts))),
    ];
    // The field/field pair is the pre-#151 default and the fallback this
    // search can never do worse than crossings-wise (see `exitsFor`): its
    // own crossing count against `decisionAvoid` is the ceiling every
    // alternative (a top/bottom touch) must still clear, so a
    // cleaner-looking exit never wins by quietly trading away the
    // crossings ratchet.
    const baselineStart = startCandidates.find((c) => c.side === 'field') ?? startCandidates[0]!;
    const baselineEnd = endCandidates.find((c) => c.side === 'field') ?? endCandidates[0]!;
    const baselineRoute = routeFor(relation, [baselineStart.point, baselineEnd.point], avoid, undefined);
    // Only bother searching top/bottom alternatives when the plain
    // field/field route actually has the readability problem #151 reports
    // (`routeHugsOutline`, the same check `outlineHugging` scores): most
    // relations' default route never runs along anything's border, and
    // re-weighing those against a top/bottom touch anyway was this pass's
    // earlier, too-eager version — it swapped the large majority of a
    // random fixture's edges onto a card edge for a marginally shorter
    // route, each swap locally crossings-safe, but the batch's crossing
    // count still rose once enough of them landed near each other.
    if (!routeHugsOutline(baselineRoute, outlineBoxes)) {
      chosenPoints.set(relation.id, baselineRoute);
      chosenCandidates.set(relation.id, { start: baselineStart, end: baselineEnd });
      continue;
    }
    const baselineCrossings = crossingsAgainst(baselineRoute, decisionAvoid);
    let best: {
      readonly route: readonly LayoutPoint[];
      readonly cost: number;
      readonly start: PortCandidate;
      readonly end: PortCandidate;
    } = {
      route: baselineRoute,
      cost: portRouteCost(baselineRoute, avoid, outlineBoxes),
      start: baselineStart,
      end: baselineEnd,
    };
    for (const start of startCandidates) {
      for (const end of endCandidates) {
        if (start.side === 'field' && end.side === 'field') continue; // already `best`'s starting point
        const route = routeFor(relation, [start.point, end.point], avoid, exitsFor(start, end));
        if (crossingsAgainst(route, decisionAvoid) > baselineCrossings) continue; // never trade a clean exit for more crossings
        const cost = portRouteCost(route, avoid, outlineBoxes);
        if (cost < best.cost) best = { route, cost, start, end };
      }
    }
    chosenPoints.set(relation.id, best.route);
    const exits = exitsFor(best.start, best.end);
    if (exits !== undefined) chosenExits.set(relation.id, exits);
    chosenCandidates.set(relation.id, { start: best.start, end: best.end });
  }

  // --- Fan spreading (#151): when more than one relation's chosen port
  // lands on the same table's top or bottom edge, spread their x across the
  // card (like `model.ts`'s `outgoingFan` does for field-row ports sharing a
  // column) instead of stacking them on its centre, then reroute just those.
  type FanMember = { readonly relationId: string; readonly end: 'start' | 'end'; readonly tableId: string };
  const bySide = new Map<string, FanMember[]>();
  const addMember = (tableId: string, side: 'top' | 'bottom', relationId: string, end: 'start' | 'end') => {
    const key = `${tableId}:${side}`;
    bySide.set(key, [...(bySide.get(key) ?? []), { relationId, end, tableId }]);
  };
  for (const relation of order) {
    const chosen = chosenCandidates.get(relation.id);
    if (chosen === undefined) continue;
    if (chosen.start.side !== 'field') addMember(relation.from, chosen.start.side, relation.id, 'start');
    if (chosen.end.side !== 'field') addMember(relation.to, chosen.end.side, relation.id, 'end');
  }
  for (const members of bySide.values()) {
    if (members.length < 2) continue;
    const table = tablesById.get(members[0]!.tableId);
    if (table === undefined) continue;
    const sorted = [...members].sort((a, b) => a.relationId.localeCompare(b.relationId));
    sorted.forEach((member, index) => {
      const chosen = chosenCandidates.get(member.relationId);
      if (chosen === undefined) return;
      const x = fannedX(table, index, sorted.length);
      const target = member.end === 'start' ? chosen.start : chosen.end;
      const updated: PortCandidate = { ...target, point: { x, y: target.point.y } };
      chosenCandidates.set(
        member.relationId,
        member.end === 'start' ? { ...chosen, start: updated } : { ...chosen, end: updated },
      );
    });
  }
  for (const [relationId, chosen] of chosenCandidates) {
    const relation = relationsById.get(relationId);
    if (relation === undefined) continue;
    const avoid = [...chosenPoints].flatMap(([id, points]) => (id === relationId ? [] : segmentsOf(points)));
    const exits = exitsFor(chosen.start, chosen.end);
    const route = routeFor(relation, [chosen.start.point, chosen.end.point], avoid, exits);
    chosenPoints.set(relationId, route);
    if (exits !== undefined) chosenExits.set(relationId, exits);
  }

  const pointsFor = (relation: { readonly id: string }): readonly LayoutPoint[] =>
    chosenPoints.get(relation.id) ?? pointsById.get(relation.id) ?? [];

  // Pass 1: short edges first, each aware of every edge already routed.
  const routed = new Map<string, readonly LayoutPoint[]>();
  for (const relation of order) {
    const avoid = [...routed.values()].flatMap((points) => segmentsOf(points));
    routed.set(relation.id, routeFor(relation, pointsFor(relation), avoid, chosenExits.get(relation.id)));
  }

  // Bounded rip-up-reroute, see `RIPUP_PASSES`'s doc comment.
  for (let pass = 0; pass < RIPUP_PASSES; pass++) {
    let improvedAny = false;
    for (const relation of order) {
      if (relation.from === relation.to) continue; // a self-loop's shape never varies; nothing to re-try
      const current = routed.get(relation.id) ?? [];
      const avoid = [...routed].flatMap(([id, points]) => (id === relation.id ? [] : segmentsOf(points)));
      const candidate = routeFor(relation, pointsFor(relation), avoid, chosenExits.get(relation.id));
      if (crossingsAgainstBatch(relation.id, candidate, routed) < crossingsAgainstBatch(relation.id, current, routed)) {
        routed.set(relation.id, candidate);
        improvedAny = true;
      }
    }
    if (!improvedAny) break;
  }

  // Final crossings safety net (#151): the port-side search above only ever
  // checks a candidate against an *approximation* of the final picture (the
  // prefix routed so far, plus every other relation's default route — see
  // `defaultRouteOf`), because the real final picture does not exist until
  // every relation has been through rip-up-reroute. Two relations can each
  // look crossings-safe on their own approximation and still end up crossing
  // *each other* once both their chosen (non-field) ports land. So once
  // `routed` is as final as it gets, re-check every relation that took a
  // non-field port against the final batch, and revert any one of them
  // whose field/field default would have crossed less — never the reverse,
  // so this can only ever lower the batch's crossing count, guaranteeing it
  // never ends up above what the pre-#151, field-only pipeline would score.
  for (let pass = 0; pass < RIPUP_PASSES; pass++) {
    let revertedAny = false;
    for (const relation of order) {
      if (!chosenExits.has(relation.id)) continue;
      const current = routed.get(relation.id) ?? [];
      const avoid = [...routed].flatMap(([id, points]) => (id === relation.id ? [] : segmentsOf(points)));
      const fieldPoints = pointsById.get(relation.id) ?? [];
      const fieldRoute = routeFor(relation, fieldPoints, avoid, undefined);
      if (crossingsAgainst(fieldRoute, avoid) < crossingsAgainst(current, avoid)) {
        routed.set(relation.id, fieldRoute);
        chosenExits.delete(relation.id);
        revertedAny = true;
      }
    }
    if (!revertedAny) break;
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
  return nudgeParallelRoutes(inputs);
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
