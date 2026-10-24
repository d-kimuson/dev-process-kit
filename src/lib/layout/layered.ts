/**
 * A small, deterministic layered graph layout (Sugiyama-lite).
 *
 * The framework ships one ESM bundle with no runtime dependencies, so the
 * diagrams cannot delegate layout to a graph engine: this is the replacement.
 * It is a pure function — given the same input it produces the same coordinates
 * — which is what makes diagram snapshots stable across reloads.
 *
 * Pipeline: break cycles → rank by longest path → order within layers (median
 * heuristic) → assign coordinates (pack by desired position) → route edges with
 * orthogonal poly-lines → normalise the bounding box.
 */

export type LayoutPoint = { readonly x: number; readonly y: number };

/** Port offsets are relative to the node's top-left corner. */
export type LayoutNodeSpec = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly ports?: Readonly<Record<string, LayoutPoint>>;
  /** Hand-authored position. `fixedLayout` uses it; `layeredLayout` ignores it. */
  readonly position?: LayoutPoint;
  /**
   * Nodes sharing a `group` are kept in one contiguous vertical band across
   * every layer, so a bounding box drawn around one group's nodes never
   * overlaps another group's box, and never contains a node outside it.
   */
  readonly group?: string;
  /**
   * Outer nesting on top of `group`: every `group` whose nodes declare the
   * same `superGroup` is kept together, in one band that contains all of
   * them, the same way `group` itself contains its own nodes — so a box
   * drawn around one `superGroup`'s nodes never overlaps another's, and
   * always contains every one of its groups' boxes whole. A node without
   * `group` is still placed as a singleton band inside its `superGroup`. A
   * node without `superGroup` forms a top-level band of its own, same as
   * today when no node in the graph sets it at all.
   */
  readonly superGroup?: string;
};

export type LayoutEdgeSpec = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly fromPort?: string;
  readonly toPort?: string;
};

export type PlacedNode = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly layer: number;
  readonly order: number;
};

export type LayoutRoute = {
  readonly id: string;
  readonly points: readonly LayoutPoint[];
};

export type LayoutResult = {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly PlacedNode[];
  readonly routes: readonly LayoutRoute[];
};

export type LayoutOptions = {
  readonly nodeSpacing?: number;
  readonly layerSpacing?: number;
  readonly padding?: number;
  /** Median-ordering sweeps. Higher is tidier and slower. */
  readonly sweeps?: number;
  readonly coordinatePasses?: number;
  /** Gap kept between two different `group`s' bands. Defaults to `nodeSpacing`. */
  readonly groupSpacing?: number;
  /** Gap kept between two different `superGroup`s' bands, on top of `groupSpacing`. Defaults to `groupSpacing`. */
  readonly superGroupSpacing?: number;
  /**
   * Extra gap added between two different `superGroup`s' boxes stacked in
   * different rows, on top of `superGroupSpacing`, by `compoundLayout` only
   * — applied as a pure post-process after `arrangeBoxes` has already picked
   * the `superGroup` order and row/column split from `superGroupSpacing`
   * alone, so widening it can never change which arrangement that
   * crossing-minimising search chose, only how far apart the chosen boxes
   * end up. Defaults to 0 (no extra gap beyond `superGroupSpacing`, i.e. the
   * pre-existing behaviour).
   */
  readonly superGroupRowGap?: number;
  /**
   * Same as `superGroupRowGap`, but for two `superGroup`s' boxes sitting
   * side by side in the same row. Kept separate because, on this component's
   * bench corpus, widening the side-by-side gap regresses routed edge
   * crossings at a much smaller value than widening the stacked gap does
   * (see `view.ts`'s `BC_GAP_ROW`/`BC_GAP_COLUMN` for the measured numbers).
   * Defaults to 0.
   */
  readonly superGroupColumnGap?: number;
  /**
   * Force the number of rows the top-level Bounded Context pack uses, instead
   * of letting `arrangeBoxes` choose it from its centre-line proxy. 0 (the
   * default) keeps the automatic choice. This exists so the tuning loop can
   * measure what each row count actually costs once real routing runs — the
   * proxy alone cannot see the difference between a vertical stack and a
   * grid, and the live budget is too tight to run several full routings on
   * every load.
   */
  readonly superGroupRowCount?: number;
};

const DEFAULTS = {
  nodeSpacing: 34,
  layerSpacing: 84,
  padding: 28,
  sweeps: 4,
  coordinatePasses: 6,
  groupSpacing: 34,
  superGroupSpacing: 34,
  superGroupRowGap: 0,
  superGroupColumnGap: 0,
  superGroupRowCount: 0,
} as const;

type Config = Required<LayoutOptions>;

type MutableNode = {
  readonly spec: LayoutNodeSpec;
  layer: number;
  order: number;
  x: number;
  y: number;
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

/** Depth-first cycle breaking: an edge back into the current stack is reversed. */
const breakCycles = (
  nodes: readonly LayoutNodeSpec[],
  edges: readonly LayoutEdgeSpec[],
): { readonly forward: readonly LayoutEdgeSpec[]; readonly reversed: ReadonlySet<string> } => {
  const outgoing = new Map<string, LayoutEdgeSpec[]>();
  for (const node of nodes) outgoing.set(node.id, []);
  for (const edge of edges) outgoing.get(edge.from)?.push(edge);
  const state = new Map<string, 'new' | 'open' | 'done'>();
  const reversed = new Set<string>();
  const visit = (id: string): void => {
    state.set(id, 'open');
    for (const edge of outgoing.get(id) ?? []) {
      const next = state.get(edge.to) ?? 'new';
      if (next === 'open') reversed.add(edge.id);
      else if (next === 'new') visit(edge.to);
    }
    state.set(id, 'done');
  };
  for (const node of nodes) if ((state.get(node.id) ?? 'new') === 'new') visit(node.id);
  return { reversed, forward: edges.filter((edge) => !reversed.has(edge.id)) };
};

/** Longest-path ranking on the acyclic forward graph. */
const rankNodes = (nodes: readonly LayoutNodeSpec[], forward: readonly LayoutEdgeSpec[]): Map<string, number> => {
  const incoming = new Map<string, LayoutEdgeSpec[]>();
  const outgoing = new Map<string, LayoutEdgeSpec[]>();
  for (const node of nodes) {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  }
  for (const edge of forward) {
    outgoing.get(edge.from)?.push(edge);
    incoming.get(edge.to)?.push(edge);
  }
  const rank = new Map(nodes.map((node) => [node.id, 0]));
  const pending = new Map(nodes.map((node) => [node.id, (incoming.get(node.id) ?? []).length]));
  const queue = nodes.filter((node) => (pending.get(node.id) ?? 0) === 0).map((node) => node.id);
  for (const id of queue) {
    for (const edge of outgoing.get(id) ?? []) {
      const next = rank.get(edge.to) ?? 0;
      rank.set(edge.to, Math.max(next, (rank.get(id) ?? 0) + 1));
      const remaining = (pending.get(edge.to) ?? 0) - 1;
      pending.set(edge.to, remaining);
      if (remaining === 0) queue.push(edge.to);
    }
  }
  return rank;
};

/** Median heuristic, alternating direction; ties keep the current order. */
const orderLayers = (
  layers: Map<number, string[]>,
  neighbours: ReadonlyMap<string, readonly string[]>,
  layerOf: ReadonlyMap<string, number>,
  sweeps: number,
): void => {
  const ranks = [...layers.keys()].sort((a, b) => a - b);
  for (let pass = 0; pass < sweeps; pass++) {
    const ascending = pass % 2 === 0;
    for (const rank of ascending ? ranks : [...ranks].reverse()) {
      const current = layers.get(rank) ?? [];
      const index = new Map(current.map((id, position) => [id, position]));
      const positioned = (id: string): number | null => {
        const position = index.get(id);
        return position === undefined ? null : position;
      };
      const desired = current.map((id) => {
        const references = (neighbours.get(id) ?? [])
          .filter((other) => (layerOf.get(other) ?? rank) === rank + (ascending ? -1 : 1))
          .map(positioned)
          .filter((position): position is number => position !== null);
        return { id, want: references.length > 0 ? median(references) : (index.get(id) ?? 0) };
      });
      desired.sort((a, b) => a.want - b.want || (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0));
      layers.set(
        rank,
        desired.map((entry) => entry.id),
      );
    }
  }
};

const packLayer = (
  ids: readonly string[],
  byId: ReadonlyMap<string, MutableNode>,
  desired: ReadonlyMap<string, number>,
  nodeSpacing: number,
): { readonly height: number } => {
  const items = ids.map((id, index) => ({ id, want: desired.get(id) ?? index * 100, index }));
  items.sort((a, b) => a.want - b.want || a.index - b.index);
  let y = 0;
  for (const item of items) {
    const node = byId.get(item.id);
    if (!node) continue;
    node.y = y;
    y += node.spec.height + nodeSpacing;
  }
  return { height: Math.max(0, y - nodeSpacing) };
};

/** Packs each layer, then pulls nodes toward their neighbours' centres. */
const assignCoordinates = (
  layers: Map<number, string[]>,
  byId: ReadonlyMap<string, MutableNode>,
  neighbours: ReadonlyMap<string, readonly string[]>,
  layerOf: ReadonlyMap<string, number>,
  config: Config,
): void => {
  const ranks = [...layers.keys()].sort((a, b) => a - b);
  const heights = new Map<number, number>();
  for (const rank of ranks)
    heights.set(rank, packLayer(layers.get(rank) ?? [], byId, new Map(), config.nodeSpacing).height);
  const tallest = Math.max(0, ...heights.values());
  for (const rank of ranks) {
    const offset = (tallest - (heights.get(rank) ?? 0)) / 2;
    for (const id of layers.get(rank) ?? []) {
      const node = byId.get(id);
      if (node) node.y += offset;
    }
  }
  const desiredFrom = (id: string, targetRank: number): number | null => {
    const centres = (neighbours.get(id) ?? [])
      .filter((other) => layerOf.get(other) === targetRank)
      .flatMap((other) => {
        const node = byId.get(other);
        return node ? [node.y + node.spec.height / 2] : [];
      });
    return centres.length > 0 ? median(centres) : null;
  };
  for (let pass = 0; pass < config.coordinatePasses; pass++) {
    const ascending = pass % 2 === 0;
    for (const rank of ascending ? ranks : [...ranks].reverse()) {
      const ids = layers.get(rank) ?? [];
      const desired = new Map<string, number>();
      for (const id of ids) {
        const neighbour = desiredFrom(id, rank + (ascending ? -1 : 1));
        const node = byId.get(id);
        if (node === undefined) continue;
        desired.set(id, neighbour === null ? node.y + node.spec.height / 2 : neighbour);
      }
      const before = ids.map((id) => byId.get(id)?.y ?? 0);
      packLayer(ids, byId, desired, config.nodeSpacing);
      // Keep the layer where it was: packing restarts at 0, so restore the mean.
      const after = ids.map((id) => byId.get(id)?.y ?? 0);
      const shift = median(before) - median(after);
      for (const id of ids) {
        const node = byId.get(id);
        if (node) node.y += shift;
      }
    }
  }
};

/**
 * Group-aware variant of `packLayer`: every node is given a fixed vertical
 * band, keyed by `bandOf`, in `bandOrder`'s sequence — the same band, at the
 * same `y`, in every layer, regardless of which bands that particular layer
 * happens to use. `desired` only breaks ties inside one band's members in one
 * layer; it never moves a node outside its band. Because the bands are fixed
 * and disjoint, a bounding box drawn around one band's nodes can never reach
 * into another band's — the invariant `clusterByGroup` exists to guarantee.
 */
const bandPackLayer = (
  ids: readonly string[],
  byId: ReadonlyMap<string, MutableNode>,
  desired: ReadonlyMap<string, number>,
  bandOf: ReadonlyMap<string, string>,
  bandOrder: readonly string[],
  bandTop: ReadonlyMap<string, number>,
  nodeSpacing: number,
): void => {
  for (const key of bandOrder) {
    const members = ids.filter((id) => bandOf.get(id) === key);
    if (members.length === 0) continue;
    const items = members
      .map((id, index) => ({ id, want: desired.get(id) ?? index, index }))
      .sort((a, b) => a.want - b.want || a.index - b.index);
    let y = bandTop.get(key) ?? 0;
    for (const item of items) {
      const node = byId.get(item.id);
      if (!node) continue;
      node.y = y;
      y += node.spec.height + nodeSpacing;
    }
  }
};

/** The tallest a band's members ever get packed to, across every layer — the band's reserved height. */
const bandHeightOf = (
  layers: ReadonlyMap<number, readonly string[]>,
  byId: ReadonlyMap<string, MutableNode>,
  bandOf: ReadonlyMap<string, string>,
  key: string,
  nodeSpacing: number,
): number => {
  let tallest = 0;
  for (const ids of layers.values()) {
    const members = ids.filter((id) => bandOf.get(id) === key);
    if (members.length === 0) continue;
    const height =
      members.reduce((sum, id) => sum + (byId.get(id)?.spec.height ?? 0), 0) + nodeSpacing * (members.length - 1);
    if (height > tallest) tallest = height;
  }
  return tallest;
};

/**
 * Packs and refines coordinates like `assignCoordinates`, but keeps every
 * `group`'s nodes (and every ungrouped node, each its own singleton band) in
 * one fixed vertical band, identical in every layer — and, when any node
 * declares a `superGroup`, nests those bands inside a second, outer level the
 * same way: every `superGroup`'s own bands sit together, with extra room
 * (`superGroupSpacing`) between two different `superGroup`s so a frame drawn
 * around one never touches its neighbour's. A band's order is the average of
 * its members' plain, ungrouped ordering, so grouping never fights the
 * crossing-minimising heuristic more than it has to; a `superGroup`'s order
 * is likewise the average ordering of everything it contains, so two that
 * exchange many edges still end up drawn close together. When no node in the
 * graph sets `superGroup` at all, every band is its own top-level band and
 * this produces exactly the single-level result it always has.
 */
const assignCoordinatesGrouped = (
  nodes: readonly LayoutNodeSpec[],
  layers: Map<number, string[]>,
  byId: ReadonlyMap<string, MutableNode>,
  neighbours: ReadonlyMap<string, readonly string[]>,
  layerOf: ReadonlyMap<string, number>,
  orderOf: ReadonlyMap<string, number>,
  config: Config,
): void => {
  const bandOf = new Map<string, string>(nodes.map((n) => [n.id, n.group ?? n.id]));
  const realGroups = new Set(nodes.flatMap((n) => (n.group === undefined ? [] : [n.group])));
  const usesSuperGroup = nodes.some((n) => n.superGroup !== undefined);
  // The outer band a `group` (or ungrouped node) belongs to: whichever of its
  // members declares a `superGroup` first, else its own band key (a top-level
  // band of its own) — so one aggregate is never split across two BCs.
  const superOf = new Map<string, string>();
  for (const n of nodes) {
    const band = bandOf.get(n.id) ?? n.id;
    if (n.superGroup !== undefined && !superOf.has(band)) superOf.set(band, n.superGroup);
  }
  const bandSuper = (key: string): string => superOf.get(key) ?? key;
  const ranks = [...layers.keys()].sort((a, b) => a - b);

  const normalisedOrder = (id: string): number => {
    const rank = layerOf.get(id) ?? 0;
    const size = (layers.get(rank) ?? []).length;
    const index = orderOf.get(id) ?? 0;
    return size <= 1 ? 0 : index / (size - 1);
  };
  const bandKeys = [...new Set(bandOf.values())];
  const centreOf = (key: string): number => {
    const members = nodes.filter((n) => (bandOf.get(n.id) ?? n.id) === key).map((n) => n.id);
    return members.length === 0 ? 0 : members.reduce((sum, id) => sum + normalisedOrder(id), 0) / members.length;
  };
  // Order the outer (superGroup) bands first, by the centroid of everything
  // they contain, then order each one's own inner bands by their own
  // centroid — so crossing-minimising order is respected at both levels.
  const superKeys = [...new Set(bandKeys.map(bandSuper))];
  const superCentreOf = (key: string): number => {
    const members = nodes.filter((n) => bandSuper(bandOf.get(n.id) ?? n.id) === key).map((n) => n.id);
    return members.length === 0 ? 0 : members.reduce((sum, id) => sum + normalisedOrder(id), 0) / members.length;
  };
  const superOrder = superKeys.sort((a, b) => superCentreOf(a) - superCentreOf(b));
  const bandOrder = superOrder.flatMap((superKey) =>
    bandKeys.filter((key) => bandSuper(key) === superKey).sort((a, b) => centreOf(a) - centreOf(b)),
  );

  const bandHeight = new Map(
    bandOrder.map((key) => [key, bandHeightOf(layers, byId, bandOf, key, config.nodeSpacing)]),
  );
  const bandTop = new Map<string, number>();
  let top = 0;
  for (const [index, key] of bandOrder.entries()) {
    bandTop.set(key, top);
    top += bandHeight.get(key) ?? 0;
    const next = bandOrder[index + 1];
    if (next !== undefined) {
      const crossesSuperGroup = usesSuperGroup && bandSuper(key) !== bandSuper(next);
      top += crossesSuperGroup
        ? config.superGroupSpacing
        : realGroups.has(key) || realGroups.has(next)
          ? config.groupSpacing
          : config.nodeSpacing;
    }
  }

  for (const rank of ranks) {
    const ids = layers.get(rank) ?? [];
    bandPackLayer(
      ids,
      byId,
      new Map(ids.map((id) => [id, orderOf.get(id) ?? 0])),
      bandOf,
      bandOrder,
      bandTop,
      config.nodeSpacing,
    );
  }

  const desiredFrom = (id: string, targetRank: number): number | null => {
    const centres = (neighbours.get(id) ?? [])
      .filter((other) => layerOf.get(other) === targetRank)
      .flatMap((other) => {
        const node = byId.get(other);
        return node ? [node.y + node.spec.height / 2] : [];
      });
    return centres.length > 0 ? median(centres) : null;
  };
  for (let pass = 0; pass < config.coordinatePasses; pass++) {
    const ascending = pass % 2 === 0;
    for (const rank of ascending ? ranks : [...ranks].reverse()) {
      const ids = layers.get(rank) ?? [];
      const desired = new Map<string, number>();
      for (const id of ids) {
        const neighbour = desiredFrom(id, rank + (ascending ? -1 : 1));
        const node = byId.get(id);
        if (node === undefined) continue;
        desired.set(id, neighbour === null ? node.y + node.spec.height / 2 : neighbour);
      }
      bandPackLayer(ids, byId, desired, bandOf, bandOrder, bandTop, config.nodeSpacing);
    }
  }
};

const portOf = (node: MutableNode, name: string | undefined, side: 'out' | 'in'): LayoutPoint => {
  const point = name === undefined ? undefined : node.spec.ports?.[name];
  if (point) return { x: node.x + point.x, y: node.y + point.y };
  return side === 'out'
    ? { x: node.x + node.spec.width, y: node.y + node.spec.height / 2 }
    : { x: node.x, y: node.y + node.spec.height / 2 };
};

type RouteContext = {
  readonly byId: ReadonlyMap<string, MutableNode>;
  readonly layerSpacing: number;
  readonly padding: number;
};

const routeEdges = (
  edges: readonly LayoutEdgeSpec[],
  reversed: ReadonlySet<string>,
  context: RouteContext,
): readonly LayoutRoute[] => {
  let backIndex = 0;
  const routes: LayoutRoute[] = [];
  for (const edge of edges) {
    const from = context.byId.get(edge.from);
    const to = context.byId.get(edge.to);
    if (!from || !to) continue;
    const start = portOf(from, edge.fromPort, 'out');
    const end = portOf(to, edge.toPort, 'in');
    if (edge.from === edge.to) {
      const right = from.x + from.spec.width;
      const bottom = from.y + from.spec.height;
      const channel = Math.max(context.padding / 2, bottom + 18);
      routes.push({
        id: edge.id,
        points: [
          start,
          { x: right + 20, y: start.y },
          { x: right + 20, y: channel },
          { x: from.x - 20, y: channel },
          { x: from.x - 20, y: end.y },
          end,
        ],
      });
      continue;
    }
    if (!reversed.has(edge.id)) {
      const forward = from.layer < to.layer || (from.layer === to.layer && end.x > start.x + 12);
      if (forward) {
        if (Math.abs(start.y - end.y) < 0.5) {
          routes.push({ id: edge.id, points: [start, end] });
          continue;
        }
        const channel =
          from.layer < to.layer
            ? Math.max(start.x + 14, to.x - Math.max(12, context.layerSpacing / 2))
            : (start.x + end.x) / 2;
        routes.push({
          id: edge.id,
          points: [start, { x: channel, y: start.y }, { x: channel, y: end.y }, end],
        });
        continue;
      }
    }
    // Backward or same-layer edges leave from the bottom and come back up into
    // the target's bottom, so they never cut through the layer band.
    const fromBottom =
      edge.fromPort === undefined ? { x: from.x + from.spec.width / 2, y: from.y + from.spec.height } : start;
    const toBottom = edge.toPort === undefined ? { x: to.x + to.spec.width / 2, y: to.y + to.spec.height } : end;
    const channelY = Math.max(fromBottom.y, toBottom.y) + 18 + backIndex * 14;
    backIndex += 1;
    const points = [
      start,
      fromBottom,
      { x: fromBottom.x, y: channelY },
      { x: toBottom.x, y: channelY },
      toBottom,
      end,
    ].filter((point, index, all) => index === 0 || point.x !== all[index - 1]?.x || point.y !== all[index - 1]?.y);
    routes.push({ id: edge.id, points });
  }
  return routes;
};

/** Shifts everything so the bounding box starts at `padding`, and sizes it. */
const normalise = (nodes: readonly MutableNode[], routes: readonly LayoutRoute[], padding: number): LayoutResult => {
  const points = routes.flatMap((route) => [...route.points]);
  const xs = [
    ...nodes.map((node) => node.x),
    ...nodes.map((node) => node.x + node.spec.width),
    ...points.map((p) => p.x),
  ];
  const ys = [
    ...nodes.map((node) => node.y),
    ...nodes.map((node) => node.y + node.spec.height),
    ...points.map((p) => p.y),
  ];
  const minX = Math.min(0, ...xs);
  const minY = Math.min(0, ...ys);
  const maxX = Math.max(0, ...xs);
  const maxY = Math.max(0, ...ys);
  const dx = padding - minX;
  const dy = padding - minY;
  return {
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    nodes: nodes.map((node) => ({
      id: node.spec.id,
      x: node.x + dx,
      y: node.y + dy,
      width: node.spec.width,
      height: node.spec.height,
      layer: node.layer,
      order: node.order,
    })),
    routes: routes.map((route) => ({
      id: route.id,
      points: route.points.map((point) => ({ x: point.x + dx, y: point.y + dy })),
    })),
  };
};

const neighbourIndex = (nodes: readonly LayoutNodeSpec[], edges: readonly LayoutEdgeSpec[]): Map<string, string[]> => {
  const neighbours = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    neighbours.get(edge.from)?.push(edge.to);
    neighbours.get(edge.to)?.push(edge.from);
  }
  return neighbours;
};

const toMutable = (
  nodes: readonly LayoutNodeSpec[],
  layerOf: ReadonlyMap<string, number>,
  orderOf: ReadonlyMap<string, number>,
  position: (node: LayoutNodeSpec) => LayoutPoint,
): MutableNode[] =>
  nodes.map((node) => ({
    spec: node,
    layer: layerOf.get(node.id) ?? 0,
    order: orderOf.get(node.id) ?? 0,
    ...position(node),
  }));

const layerMapOf = (nodes: readonly LayoutNodeSpec[], layerOf: ReadonlyMap<string, number>): Map<number, string[]> => {
  const layers = new Map<number, string[]>();
  for (const node of nodes) {
    const rank = layerOf.get(node.id) ?? 0;
    const bucket = layers.get(rank);
    if (bucket) bucket.push(node.id);
    else layers.set(rank, [node.id]);
  }
  return layers;
};

/** Ranks, orders and places nodes in left-to-right layers. */
export const layeredLayout = (
  nodes: readonly LayoutNodeSpec[],
  edges: readonly LayoutEdgeSpec[],
  options: LayoutOptions = {},
): LayoutResult => {
  if (nodes.some((node) => node.superGroup !== undefined)) return compoundLayout(nodes, edges, options);
  const config: Config = { ...DEFAULTS, ...options };
  if (nodes.length === 0) return { width: 0, height: 0, nodes: [], routes: [] };
  const ids = new Set(nodes.map((node) => node.id));
  const usable = edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
  const { forward, reversed } = breakCycles(nodes, usable);
  const layerOf = rankNodes(nodes, forward);
  const layers = layerMapOf(nodes, layerOf);
  orderLayers(layers, neighbourIndex(nodes, usable), layerOf, config.sweeps);
  const orderOf = new Map<string, number>();
  for (const ids of layers.values()) ids.forEach((id, index) => orderOf.set(id, index));
  const placed = toMutable(nodes, layerOf, orderOf, () => ({ x: 0, y: 0 }));
  const byId = new Map(placed.map((node) => [node.spec.id, node]));
  if (nodes.some((node) => node.group !== undefined || node.superGroup !== undefined)) {
    assignCoordinatesGrouped(nodes, layers, byId, neighbourIndex(nodes, usable), layerOf, orderOf, config);
  } else {
    assignCoordinates(layers, byId, neighbourIndex(nodes, usable), layerOf, config);
  }

  const ranks = [...layers.keys()].sort((a, b) => a - b);
  let x = 0;
  for (const rank of ranks) {
    const width = Math.max(...(layers.get(rank) ?? []).map((id) => byId.get(id)?.spec.width ?? 0));
    for (const id of layers.get(rank) ?? []) {
      const node = byId.get(id);
      if (node) node.x = x;
    }
    x += width + config.layerSpacing;
  }
  return normalise(
    placed,
    routeEdges(usable, reversed, { byId, layerSpacing: config.layerSpacing, padding: config.padding }),
    config.padding,
  );
};

type Box = { readonly id: string; readonly width: number; readonly height: number };

/** The side of a box a relation leaves or enters through. */
export type LayoutSide = 'left' | 'right' | 'top' | 'bottom';

/** Keeps a port this far from a box corner, so an end glyph never spills off the edge. */
export const PORT_INSET = 12;

const centreOf = (box: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}): LayoutPoint => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

/** The side of `from` that faces `to`: the dominant axis first. */
export const facingSide = (
  from: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  to: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): LayoutSide => {
  const a = centreOf(from);
  const b = centreOf(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
};

const clampPort = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/**
 * Moves a field-row anchor onto `side` of `box`. On left/right the anchor's
 * own y (the FK column's row) is preserved; on top/bottom the same row
 * fraction picks an x along the edge, so two relations leaving different
 * columns still separate when they leave vertically.
 */
export const portOnSide = (
  box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  side: LayoutSide,
  anchor: LayoutPoint,
): LayoutPoint => {
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

/**
 * A box's position purely from the crossing-minimising order the plain pipeline
 * already computes (rank by longest path, then median ordering) — the ranks and
 * in-rank order flattened into one sequence. Used to decide what order boxes
 * (aggregates, Bounded Contexts) go into `shelfPack`'s rows, not to place them:
 * two boxes that exchange many edges end up near each other in the sequence,
 * and an upstream box (little or nothing referencing it) sorts first.
 */
const sequenceByLayeredOrder = (
  boxes: readonly Box[],
  edges: readonly LayoutEdgeSpec[],
  sweeps: number,
): readonly string[] => {
  if (boxes.length <= 1) return boxes.map((box) => box.id);
  const specs: LayoutNodeSpec[] = boxes.map((box) => ({ id: box.id, width: box.width, height: box.height }));
  const ids = new Set(specs.map((spec) => spec.id));
  const usable = edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to);
  const { forward } = breakCycles(specs, usable);
  const layerOf = rankNodes(specs, forward);
  const layers = layerMapOf(specs, layerOf);
  orderLayers(layers, neighbourIndex(specs, usable), layerOf, sweeps);
  const ranks = [...layers.keys()].sort((a, b) => a - b);
  return ranks.flatMap((rank) => layers.get(rank) ?? []);
};

export type Packed = {
  readonly positions: ReadonlyMap<string, LayoutPoint>;
  readonly width: number;
  readonly height: number;
};

/** The on-screen width of a contiguous run `list[from, to)`, laid out left to right with `spacing` between members. */
const rowWidth = (list: readonly Box[], from: number, to: number, spacing: number): number => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += list[i]!.width;
  return sum + spacing * Math.max(0, to - from - 1);
};

/**
 * Splits `list`, in order, into exactly `rowCount` contiguous rows, minimizing
 * the widest row — the classic "split an array into k parts, minimize the
 * largest part" problem, by DP over (prefix length, row count). A simple
 * running-width-budget greedy (the first version of this function) breaks a
 * row as soon as the next box would cross a shared budget; with only a few,
 * unevenly sized boxes — which a handful of Bounded Contexts, or a handful of
 * aggregates, routinely are — that stops after just the first box far more
 * often than it should, stranding one box alone in a row with everything else
 * crammed into the rest: a wide empty gap beside the lone box, not balanced
 * rows. Minimizing the widest row directly avoids that: no row is left far
 * narrower than the others unless the sizes themselves force it.
 */
const packForRowCount = (list: readonly Box[], spacing: number, rowCount: number): Packed => {
  const n = list.length;
  const k = Math.max(1, Math.min(rowCount, n));
  const INF = Number.POSITIVE_INFINITY;
  // dp[i][j]: the smallest possible widest-row, splitting list[0, i) into j rows.
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array.from({ length: k + 1 }, () => INF));
  const splitAt: number[][] = Array.from({ length: n + 1 }, () => Array.from({ length: k + 1 }, () => 0));
  dp[0]![0] = 0;
  for (let j = 1; j <= k; j++) {
    for (let i = j; i <= n; i++) {
      for (let p = j - 1; p < i; p++) {
        const previous = dp[p]![j - 1]!;
        if (previous === INF) continue;
        const candidate = Math.max(previous, rowWidth(list, p, i, spacing));
        if (candidate < dp[i]![j]!) {
          dp[i]![j] = candidate;
          splitAt[i]![j] = p;
        }
      }
    }
  }
  const rows: Box[][] = [];
  let i = n;
  for (let j = k; j > 0; j--) {
    const p = splitAt[i]![j]!;
    rows.unshift(list.slice(p, i));
    i = p;
  }
  const positions = new Map<string, LayoutPoint>();
  let y = 0;
  let maxWidth = 0;
  for (const row of rows) {
    let x = 0;
    const rowHeight = Math.max(...row.map((box) => box.height));
    for (const box of row) {
      positions.set(box.id, { x, y });
      x += box.width + spacing;
    }
    maxWidth = Math.max(maxWidth, x - spacing);
    y += rowHeight + spacing;
  }
  return { positions, width: maxWidth, height: Math.max(0, y - spacing) };
};

/**
 * Classic orientation-based test for two line segments crossing at a point
 * interior to both (collinear touching, and segments sharing an endpoint, are
 * both treated as "not crossing": a shared endpoint is two edges meeting at
 * the same box centre, which happens whenever they share a `from`/`to`, not a
 * readability problem). Used only to *estimate* crossings between boxes
 * (centre-to-centre), as a cheap proxy to rank candidate arrangements before
 * any real per-table routing exists yet — `src/lib/layout/metrics.ts`'s
 * `scoreLayout` is the authority on the geometry actually drawn.
 */
const SEGMENT_EPSILON = 1e-6;
const pointsEqual = (a: LayoutPoint, b: LayoutPoint): boolean =>
  Math.abs(a.x - b.x) < SEGMENT_EPSILON && Math.abs(a.y - b.y) < SEGMENT_EPSILON;
const orientation = (a: LayoutPoint, b: LayoutPoint, c: LayoutPoint): -1 | 0 | 1 => {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < SEGMENT_EPSILON) return 0;
  return value > 0 ? 1 : -1;
};
const onSegment = (a: LayoutPoint, b: LayoutPoint, c: LayoutPoint): boolean =>
  Math.min(a.x, c.x) - SEGMENT_EPSILON <= b.x &&
  b.x <= Math.max(a.x, c.x) + SEGMENT_EPSILON &&
  Math.min(a.y, c.y) - SEGMENT_EPSILON <= b.y &&
  b.y <= Math.max(a.y, c.y) + SEGMENT_EPSILON;
const segmentsCrossEstimate = (
  s1: readonly [LayoutPoint, LayoutPoint],
  s2: readonly [LayoutPoint, LayoutPoint],
): boolean => {
  const [p1, q1] = s1;
  const [p2, q2] = s2;
  if (pointsEqual(p1, p2) || pointsEqual(p1, q2) || pointsEqual(q1, p2) || pointsEqual(q1, q2)) return false;
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  return o4 === 0 && onSegment(p2, q1, q2);
};

/**
 * A box's port on the side facing `other`, at the middle of that side. Used
 * only by the arrangement proxy below: a centre-to-centre straight line
 * bears little resemblance to the orthogonal route the reader actually sees,
 * so two arrangements that tie on straight-line crossings can differ by
 * dozens of real ones.
 */
const facingPoint = (box: Box & { x: number; y: number }, other: Box & { x: number; y: number }): LayoutPoint => {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const ox = other.x + other.width / 2;
  const oy = other.y + other.height / 2;
  const dx = ox - cx;
  const dy = oy - cy;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? box.x + box.width : box.x, y: cy };
  return { x: cx, y: dy >= 0 ? box.y + box.height : box.y };
};

/**
 * How many orthogonal L-routes cross each other for an arrangement, choosing
 * each edge's bend orientation greedily against the edges already placed (the
 * same order-independent rule the real router applies, at box level). This
 * replaces a centre-to-centre straight-line count, which could not tell a
 * vertical stack of BCs from a 2×2 grid: both have few straight-line
 * crossings, but the stack forces long parallel runs while the grid routes
 * through gutters.
 */
export const estimatePackedCrossings = (
  packed: Packed,
  sizeOf: ReadonlyMap<string, { readonly width: number; readonly height: number }>,
  edges: readonly { readonly from: string; readonly to: string }[],
): number => {
  const boxOf = (id: string): (Box & { x: number; y: number }) | null => {
    const position = packed.positions.get(id);
    const size = sizeOf.get(id);
    if (!position || !size) return null;
    return { id, x: position.x, y: position.y, width: size.width, height: size.height };
  };
  const chosen: (readonly [LayoutPoint, LayoutPoint])[] = [];
  let crossings = 0;
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const a = boxOf(edge.from);
    const b = boxOf(edge.to);
    if (!a || !b) continue;
    const start = facingPoint(a, b);
    const end = facingPoint(b, a);
    if (start.x === end.x || start.y === end.y) {
      const straight: readonly [LayoutPoint, LayoutPoint] = [start, end];
      crossings += chosen.filter((segment) => segmentsCrossEstimate(straight, segment)).length;
      chosen.push(straight);
      continue;
    }
    const shapes: readonly (readonly [LayoutPoint, LayoutPoint])[][] = [
      [
        [start, { x: end.x, y: start.y }],
        [{ x: end.x, y: start.y }, end],
      ],
      [
        [start, { x: start.x, y: end.y }],
        [{ x: start.x, y: end.y }, end],
      ],
    ];
    let bestShape = shapes[0]!;
    let bestCrossings = Number.POSITIVE_INFINITY;
    for (const shape of shapes) {
      const count = shape.reduce(
        (sum, segment) => sum + chosen.filter((other) => segmentsCrossEstimate(segment, other)).length,
        0,
      );
      if (count < bestCrossings) {
        bestCrossings = count;
        bestShape = shape;
      }
    }
    crossings += bestCrossings;
    chosen.push(...bestShape);
  }
  return crossings;
};

/** Total centre-to-centre length of `edges`, given boxes placed at `packed.positions`. Companion term to `estimatePackedCrossings`. */
const estimatePackedEdgeLength = (
  packed: Packed,
  sizeOf: ReadonlyMap<string, { readonly width: number; readonly height: number }>,
  edges: readonly { readonly from: string; readonly to: string }[],
): number => {
  const centreOf = (id: string): LayoutPoint | null => {
    const position = packed.positions.get(id);
    const size = sizeOf.get(id);
    if (!position || !size) return null;
    return { x: position.x + size.width / 2, y: position.y + size.height / 2 };
  };
  let total = 0;
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const a = centreOf(edge.from);
    const b = centreOf(edge.to);
    if (a && b) total += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return total;
};

/**
 * Two axis-aligned segments crossing at a point interior to both. Collinear
 * overlap and a shared endpoint are *not* crossings (the general
 * `segmentsCrossEstimate` above does count them, which is right for diagonal
 * centre-to-centre lines and badly wrong for orthogonal L routes).
 */
const axisCross = (a: readonly [LayoutPoint, LayoutPoint], b: readonly [LayoutPoint, LayoutPoint]): boolean => {
  const aVertical = a[0].x === a[1].x;
  const bVertical = b[0].x === b[1].x;
  if (aVertical === bVertical) return false;
  const [v1, v2, h1, h2] = aVertical ? [a[0], a[1], b[0], b[1]] : [b[0], b[1], a[0], a[1]];
  const x = v1.x;
  const y = h1.y;
  return x > Math.min(h1.x, h2.x) && x < Math.max(h1.x, h2.x) && y > Math.min(v1.y, v2.y) && y < Math.max(v1.y, v2.y);
};

/** An edge's port on a placed node, falling back to the right/left edge centre when the spec has no port. */
const placedPort = (
  node: LayoutNodeSpec,
  position: LayoutPoint,
  name: string | undefined,
  side: 'out' | 'in',
): LayoutPoint => {
  const point = name === undefined ? undefined : node.ports?.[name];
  if (point !== undefined) return { x: position.x + point.x, y: position.y + point.y };
  return side === 'out'
    ? { x: position.x + node.width, y: position.y + node.height / 2 }
    : { x: position.x, y: position.y + node.height / 2 };
};

/**
 * The table-level crossing count for an *already composed* set of node
 * positions: every edge's real field-row ports, projected onto the side that
 * faces the other end, joined by a one-bend route (the orientation that
 * crosses fewer already-placed routes wins). This is the arrangement proxy
 * the outer BC pack uses to choose its row count. The BC-level centre-line
 * proxy it replaces reported 0 crossings for both a vertical stack and a 2×2
 * grid — it literally could not see the difference — while this one tracks
 * the routed count closely enough to pick the right arrangement (for
 * `synthetic-random-2`, 18 vs 25 for 37 vs 62 real crossings).
 */
export const estimateArrangementCrossings = (
  nodes: readonly LayoutNodeSpec[],
  edges: readonly LayoutEdgeSpec[],
  positions: ReadonlyMap<string, LayoutPoint>,
): number => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const chosen: (readonly [LayoutPoint, LayoutPoint])[] = [];
  let crossings = 0;
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    const fromPosition = positions.get(edge.from);
    const toPosition = positions.get(edge.to);
    if (from === undefined || to === undefined || fromPosition === undefined || toPosition === undefined) continue;
    const fromBox = { x: fromPosition.x, y: fromPosition.y, width: from.width, height: from.height };
    const toBox = { x: toPosition.x, y: toPosition.y, width: to.width, height: to.height };
    const start = portOnSide(fromBox, facingSide(fromBox, toBox), placedPort(from, fromPosition, edge.fromPort, 'out'));
    const end = portOnSide(toBox, facingSide(toBox, fromBox), placedPort(to, toPosition, edge.toPort, 'in'));
    const segments = (shape: readonly LayoutPoint[]): readonly (readonly [LayoutPoint, LayoutPoint])[] =>
      shape.slice(1).map((point, index) => [shape[index]!, point] as const);
    if (start.x === end.x || start.y === end.y) {
      const straight: readonly [LayoutPoint, LayoutPoint] = [start, end];
      crossings += chosen.filter((other) => axisCross(straight, other)).length;
      chosen.push(straight);
      continue;
    }
    const shapes: readonly (readonly LayoutPoint[])[] = [
      [start, { x: end.x, y: start.y }, end],
      [start, { x: start.x, y: end.y }, end],
    ];
    let best = shapes[0]!;
    let bestCrossings = Number.POSITIVE_INFINITY;
    for (const shape of shapes) {
      const count = segments(shape).reduce(
        (sum, segment) => sum + chosen.filter((other) => axisCross(segment, other)).length,
        0,
      );
      if (count < bestCrossings) {
        best = shape;
        bestCrossings = count;
      }
    }
    crossings += bestCrossings;
    chosen.push(...segments(best));
  }
  return crossings;
};
const ARRANGEMENT_WEIGHTS = { crossings: 10_000, edgeLength: 1, aspectDeviation: 50 } as const;

/**
 * Interior packs (a table inside its aggregate, an aggregate inside its BC)
 * care more about being square than the outer BC pack does: an interior pack
 * that ends up a tall strip forces every outer arrangement into a tall world
 * and leaves no gutter for cross-context lines. The outer pack keeps the
 * crossing-first weight, so a square interior never buys a crossing.
 */
const INTERIOR_ASPECT_WEIGHT = 50;
const OUTER_ASPECT_WEIGHT = ARRANGEMENT_WEIGHTS.aspectDeviation;

const arrangementCost = (
  packed: Packed,
  sizeOf: ReadonlyMap<string, { readonly width: number; readonly height: number }>,
  edges: readonly { readonly from: string; readonly to: string }[],
  targetAspect: number,
  aspectWeight: number,
): number => {
  const aspect =
    packed.width <= 0 || packed.height <= 0 ? 0 : Math.abs(Math.log(packed.width / packed.height / targetAspect));
  return (
    estimatePackedCrossings(packed, sizeOf, edges) * ARRANGEMENT_WEIGHTS.crossings +
    estimatePackedEdgeLength(packed, sizeOf, edges) * ARRANGEMENT_WEIGHTS.edgeLength +
    aspect * aspectWeight
  );
};

/**
 * Every permutation of `items`, via Heap's algorithm: deterministic order,
 * yielded lazily so a capped caller never has to materialise the whole set.
 */
const permutationsOf = function* <T>(items: readonly T[]): Generator<readonly T[]> {
  const arr = [...items];
  const n = arr.length;
  yield [...arr];
  if (n <= 1) return;
  const c = Array.from<number>({ length: n }).fill(0);
  let i = 0;
  while (i < n) {
    if (c[i]! < i) {
      const swapIndex = i % 2 === 0 ? 0 : c[i]!;
      const a = arr[swapIndex]!;
      arr[swapIndex] = arr[i]!;
      arr[i] = a;
      yield [...arr];
      c[i] = c[i]! + 1;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
};

/** Exhaustive search stays well within the layout time budget up to this many boxes (7! = 5,040 orders). Past it, `arrangeBoxes` falls back to a barycenter start plus a bounded local search. */
const EXHAUSTIVE_ORDER_CAP = 7;
/** Hard cap on adjacent-swap attempts for the local-search fallback — guarantees termination regardless of input size. */
const LOCAL_SEARCH_CAP = 400;
const LOCAL_SEARCH_EPSILON = 1e-6;

/**
 * Chooses the order and row-split of `boxes` that minimises an estimated
 * crossing count between `edges`' centre-to-centre lines (then edge length,
 * then aspect), instead of `shelfPack`'s predecessor, which only ever tried
 * one order (the plain crossing-minimising layered order) and picked a row
 * count by aspect ratio alone — ignoring whether that order's particular row
 * split happened to interleave two boxes' connections into an X.
 *
 * The boxes this is used for — Bounded Contexts, an aggregate's own boxes, a
 * handful of tables inside one aggregate — are small in practice (a handful
 * to a few dozen), so an exhaustive permutation search (`EXHAUSTIVE_ORDER_CAP`)
 * covers the common case outright; past that cap, a barycenter-ordered start
 * (the same heuristic `shelfPack`'s caller used to compute) is refined by a
 * bounded adjacent-swap local search, scored by the same real cost function,
 * so the result is never worse than the old behaviour and both paths
 * terminate deterministically with a hard cap.
 */
export const arrangeBoxes = (
  boxes: readonly Box[],
  edges: readonly LayoutEdgeSpec[],
  spacing: number,
  targetAspect: number,
  sweeps: number = DEFAULTS.sweeps,
  forcedRowCount = 0,
  aspectWeight: number = ARRANGEMENT_WEIGHTS.aspectDeviation,
  localSearchCap = LOCAL_SEARCH_CAP,
): Packed => {
  if (boxes.length === 0) return { positions: new Map(), width: 0, height: 0 };
  if (boxes.length === 1) {
    const only = boxes[0]!;
    return { positions: new Map([[only.id, { x: 0, y: 0 }]]), width: only.width, height: only.height };
  }
  const sizeOf = new Map(boxes.map((box) => [box.id, { width: box.width, height: box.height }]));
  const usableEdges = edges.filter((edge) => sizeOf.has(edge.from) && sizeOf.has(edge.to) && edge.from !== edge.to);

  /** Tries every row count for one fixed order — the expensive part, O(boxes^3). */
  const bestForOrder = (
    order: readonly string[],
  ): { readonly packed: Packed; readonly cost: number; readonly rowCount: number } => {
    const list = order.map((id) => ({ id, ...sizeOf.get(id)! }));
    let best: Packed = packForRowCount(list, spacing, 1);
    let bestCost = Number.POSITIVE_INFINITY;
    let bestRowCount = 1;
    const first = forcedRowCount > 0 ? Math.min(forcedRowCount, list.length) : 1;
    const last = forcedRowCount > 0 ? first : list.length;
    for (let rowCount = first; rowCount <= last; rowCount++) {
      const packed = packForRowCount(list, spacing, rowCount);
      if (packed.width <= 0 || packed.height <= 0) continue;
      const cost = arrangementCost(packed, sizeOf, usableEdges, targetAspect, aspectWeight);
      if (cost < bestCost) {
        bestCost = cost;
        best = packed;
        bestRowCount = rowCount;
      }
    }
    return { packed: best, cost: bestCost, rowCount: bestRowCount };
  };
  /** Repacks one fixed order at one fixed row count — cheap, O(boxes^2) — for the local search below, which only ever varies order. */
  const packOrderAt = (order: readonly string[], rowCount: number): Packed =>
    packForRowCount(
      order.map((id) => ({ id, ...sizeOf.get(id)! })),
      spacing,
      rowCount,
    );

  const ids = boxes.map((box) => box.id);
  if (ids.length <= EXHAUSTIVE_ORDER_CAP) {
    let best = bestForOrder(ids);
    for (const order of permutationsOf(ids)) {
      const candidate = bestForOrder(order);
      if (candidate.cost < best.cost) best = candidate;
    }
    return best.packed;
  }

  // A forced row count is a probe from the outer arrangement search: it still
  // hill-climbs the order (otherwise the probe's arrangement is not the one
  // the real pack would choose), but with a much smaller cap than the final,
  // unforced search. The full 400-swap search on every candidate multiplied
  // the layout pass on schemas with several loose tables (~18ms of probes);
  // 50 swaps keeps the compared arrangements representative.
  const searchCap = forcedRowCount > 0 ? Math.min(localSearchCap, 50) : localSearchCap;
  let order = sequenceByLayeredOrder(boxes, usableEdges, sweeps);
  const initial = bestForOrder(order);
  const rowCount = forcedRowCount > 0 ? Math.min(forcedRowCount, order.length) : initial.rowCount;
  let bestPacked = forcedRowCount > 0 ? packOrderAt(order, rowCount) : initial.packed;
  let bestCost =
    forcedRowCount > 0 ? arrangementCost(bestPacked, sizeOf, usableEdges, targetAspect, aspectWeight) : initial.cost;
  let attempts = 0;
  let improved = true;
  while (improved && attempts < searchCap) {
    improved = false;
    for (let i = 0; i < order.length - 1 && attempts < searchCap; i++) {
      attempts++;
      const candidateOrder = [...order];
      const a = candidateOrder[i]!;
      candidateOrder[i] = candidateOrder[i + 1]!;
      candidateOrder[i + 1] = a;
      const packed = packOrderAt(candidateOrder, rowCount);
      if (packed.width <= 0 || packed.height <= 0) continue;
      const cost = arrangementCost(packed, sizeOf, usableEdges, targetAspect, aspectWeight);
      if (cost < bestCost - LOCAL_SEARCH_EPSILON) {
        bestCost = cost;
        bestPacked = packed;
        order = candidateOrder;
        improved = true;
      }
    }
  }
  return bestPacked;
};

/**
 * Spreads `packed`'s boxes further apart by `rowGap`/`columnGap`, strictly
 * *after* their order and row/column split have already been chosen (by
 * `arrangeBoxes`, scored against the un-widened spacing it was called with)
 * — so this can never change which arrangement was picked, only how far
 * apart the chosen boxes end up. `packForRowCount` always places a whole row
 * at one shared `y`, so grouping boxes by exact `y` recovers the row
 * structure without `arrangeBoxes` needing to expose it explicitly.
 *
 * `rowGap` and `columnGap` are separate, rather than one scalar for both,
 * because `compoundLayout`'s one `superGroupSpacing` already leaves two
 * different visual gaps once a frame's label space is accounted for: a BC
 * frame only reserves `BC_LABEL_SPACE` on its own top edge, so two BCs
 * sharing a row (side by side) end up `superGroupSpacing - 2*BC_PADDING`
 * apart, while two BCs in different rows (stacked) end up the much tighter
 * `superGroupSpacing - (2*BC_PADDING + BC_LABEL_SPACE)` apart — the gap #150
 * reported as cramped. Both axes still needed widening (#150's own repro
 * page arranges its Bounded Contexts in a single row, so only the
 * side-by-side gap was ever visible there), but the two tolerate very
 * different amounts before routing turns the extra room into new crossings
 * on this component's bench corpus: see `compoundLayout`'s call site for the
 * measured, independently-bisected ceiling each one gets.
 *
 * `hasFrame` tells a real Bounded Context (a drawn frame) apart from a loose
 * table with no `superGroup` of its own (`compoundLayout` still bands it as
 * its own singleton "super" band internally, but no frame is ever drawn
 * around it — see `boundedContextGroups`). A gap is only ever inserted at a
 * row/column boundary where at least one side has a frame: two loose tables
 * next to each other keep their original spacing, since there is no pair of
 * frames there for the reader to read as "too close". Without this, widening
 * would also push every loose table away from its neighbours — often many of
 * them in a schema with few declared Bounded Contexts — which reshapes the
 * whole canvas far beyond the BC-to-BC gap this exists to widen.
 *
 * A no-op when both gaps are 0 (the default) or there is nothing to move.
 */
const spreadPacked = (
  packed: Packed,
  sizeOf: ReadonlyMap<string, { readonly width: number; readonly height: number }>,
  rowGap: number,
  columnGap: number,
  hasFrame: (id: string) => boolean,
): Packed => {
  if ((rowGap <= 0 && columnGap <= 0) || packed.positions.size <= 1) return packed;
  const rows = new Map<number, string[]>();
  for (const [id, point] of packed.positions) {
    const bucket = rows.get(point.y);
    if (bucket) bucket.push(id);
    else rows.set(point.y, [id]);
  }
  const rowYs = [...rows.keys()].sort((a, b) => a - b);
  const rowItems = rowYs.map((rowY) =>
    [...(rows.get(rowY) ?? [])].sort((a, b) => (packed.positions.get(a)?.x ?? 0) - (packed.positions.get(b)?.x ?? 0)),
  );
  const positions = new Map<string, LayoutPoint>();
  let width = 0;
  let height = 0;
  let yShift = 0;
  rowItems.forEach((ids, rowIndex) => {
    const previousRow = rowItems[rowIndex - 1];
    if (previousRow !== undefined) {
      const widensRow = ids.some(hasFrame) || previousRow.some(hasFrame);
      yShift += widensRow ? rowGap : 0;
    }
    let xShift = 0;
    ids.forEach((id, columnIndex) => {
      const previous = ids[columnIndex - 1];
      if (previous !== undefined) xShift += hasFrame(previous) || hasFrame(id) ? columnGap : 0;
      const original = packed.positions.get(id);
      const size = sizeOf.get(id);
      if (!original || !size) return;
      const point = { x: original.x + xShift, y: original.y + yShift };
      positions.set(id, point);
      width = Math.max(width, point.x + size.width);
      height = Math.max(height, point.y + size.height);
    });
  });
  return { positions, width, height };
};

// A little over square, not exactly 1: a handful of Bounded Context boxes
// (often as few as three or four) can only combine into a wide *overall*
// bounding box through a grid-like arrangement (two columns of two rows,
// three of one, ...), and a grid built from boxes of aspect `a` comes out at
// close to that same aspect `a` itself — rows and columns of it roughly
// cancel. A box of exactly 1 (perfectly square) built that way gives an
// overall shape close to 1 too, which satisfies "roughly square, not a
// strip" for the single Bounded Context but leaves nothing for the *outer*
// pack (step 3) to work with: there is no integer row count between "all in
// one row" (too wide) and "two rows" (tipped back under 1 by the boxes' own
// portrait-ish table cards) for a small handful of them. A little over
// square avoids a strip just as well while giving step 3 the margin it needs.
const BC_INTERIOR_ASPECT = 1.3;
// A little under the ~16:10 viewport itself: `arrangeBoxes` only ever tries
// whole row counts, so its closest result to a given target routinely
// overshoots it a bit — aiming a bit squarer leaves room for that and still
// reads as wide.
const BC_PACK_ASPECT = 1.45;

/**
 * A compound, bottom-up layout for `group`/`superGroup` data, replacing a
 * single global rank axis (which collapses a Bounded Context's mostly-same-rank
 * tables into one tall column) with three nested packing passes:
 *
 * 1. Each `group` (aggregate) is laid out on its own, with the plain pipeline,
 *    from only the edges between its own members — that sizes its box.
 * 2. Inside each `superGroup` (Bounded Context), those aggregate boxes and any
 *    loose tables are arranged by `arrangeBoxes` (order and row split chosen
 *    together, minimising estimated crossings between them) — that sizes the
 *    Bounded Context's box.
 * 3. The Bounded Context boxes are, the same way, arranged into rows aiming
 *    for the viewport's own aspect ratio.
 *
 * Every node keeps the exact relative arrangement its own aggregate's
 * sub-layout gave it; only whole aggregate and Bounded Context boxes move
 * between the three passes, so a box drawn around one of them (`view.ts`'s
 * `aggregateGroups`/`boundedContextGroups`) never overlaps another's.
 */
export const compoundLayout = (
  nodes: readonly LayoutNodeSpec[],
  edges: readonly LayoutEdgeSpec[],
  options: LayoutOptions = {},
): LayoutResult => {
  const config: Config = { ...DEFAULTS, ...options };
  if (nodes.length === 0) return { width: 0, height: 0, nodes: [], routes: [] };
  const ids = new Set(nodes.map((node) => node.id));
  const usable = edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));

  const groupKeyOf = (node: LayoutNodeSpec): string => node.group ?? `__loose:${node.id}`;
  const superKeyOf = (node: LayoutNodeSpec): string => node.superGroup ?? `__top:${node.id}`;
  const nodeToGroup = new Map(nodes.map((node) => [node.id, groupKeyOf(node)]));
  const nodeToSuper = new Map(nodes.map((node) => [node.id, superKeyOf(node)]));

  const byGroup = new Map<string, LayoutNodeSpec[]>();
  for (const node of nodes) {
    const key = groupKeyOf(node);
    const bucket = byGroup.get(key);
    if (bucket) bucket.push(node);
    else byGroup.set(key, [node]);
  }

  // Step 1: lay out each aggregate (or lone table) on its own.
  type GroupLayout = {
    readonly size: { readonly width: number; readonly height: number };
    readonly relative: ReadonlyMap<string, LayoutPoint>;
  };
  const groupLayouts = new Map<string, GroupLayout>();
  for (const [key, members] of byGroup) {
    const only = members[0];
    if (members.length === 1 && only !== undefined) {
      groupLayouts.set(key, {
        size: { width: only.width, height: only.height },
        relative: new Map([[only.id, { x: 0, y: 0 }]]),
      });
      continue;
    }
    const memberIds = new Set(members.map((member) => member.id));
    const intra = usable.filter((edge) => memberIds.has(edge.from) && memberIds.has(edge.to));
    // An ER table card already reads wide (a header plus a few field rows), so
    // even a short FK chain laid out strictly left-to-right — full rank columns,
    // a `layerSpacing` apart — comes out several tables wide and only one tall.
    // `arrangeBoxes` picks both the order and the row split by minimising
    // estimated crossings between the intra-aggregate edges (falling back to
    // the FK-direction reading order only to break remaining ties), the same
    // way steps 2 and 3 do one level up.
    const packed = arrangeBoxes(
      members.map((member) => ({ id: member.id, width: member.width, height: member.height })),
      intra,
      config.nodeSpacing,
      BC_INTERIOR_ASPECT,
      config.sweeps,
      0,
      INTERIOR_ASPECT_WEIGHT,
    );
    groupLayouts.set(key, { size: { width: packed.width, height: packed.height }, relative: packed.positions });
  }

  const superOfGroup = new Map<string, string>();
  for (const [key, members] of byGroup) {
    const first = members[0];
    if (first !== undefined) superOfGroup.set(key, superKeyOf(first));
  }
  const byBc = new Map<string, string[]>();
  for (const [key, superKey] of superOfGroup) {
    const bucket = byBc.get(superKey);
    if (bucket) bucket.push(key);
    else byBc.set(superKey, [key]);
  }

  // Step 2: inside each Bounded Context, wrap its aggregate boxes (and loose
  // tables) into rows ordered by the edges between them.
  type BcLayout = {
    readonly size: { readonly width: number; readonly height: number };
    readonly relative: ReadonlyMap<string, LayoutPoint>;
  };
  const bcLayouts = new Map<string, BcLayout>();
  for (const [superKey, groupKeys] of byBc) {
    const onlyKey = groupKeys[0];
    if (groupKeys.length === 1 && onlyKey !== undefined) {
      const group = groupLayouts.get(onlyKey);
      if (group) bcLayouts.set(superKey, { size: group.size, relative: new Map([[onlyKey, { x: 0, y: 0 }]]) });
      continue;
    }
    const boxSizes = new Map(
      groupKeys.flatMap((key) => (groupLayouts.has(key) ? [[key, groupLayouts.get(key)!.size] as const] : [])),
    );
    const interGroupEdges = usable.flatMap((edge) => {
      const from = nodeToGroup.get(edge.from);
      const to = nodeToGroup.get(edge.to);
      if (from === undefined || to === undefined || from === to) return [];
      if (!groupKeys.includes(from) || !groupKeys.includes(to)) return [];
      return [{ id: edge.id, from, to }];
    });
    const packed = arrangeBoxes(
      groupKeys.flatMap((key) => (boxSizes.has(key) ? [{ id: key, ...boxSizes.get(key)! }] : [])),
      interGroupEdges,
      config.groupSpacing,
      BC_INTERIOR_ASPECT,
      config.sweeps,
      0,
      INTERIOR_ASPECT_WEIGHT,
    );
    bcLayouts.set(superKey, { size: { width: packed.width, height: packed.height }, relative: packed.positions });
  }

  // Step 3: wrap the Bounded Context boxes into rows aiming for ~16:10.
  const bcBoxSizes = new Map([...bcLayouts].map(([key, bc]) => [key, bc.size] as const));
  const bcKeys = [...bcLayouts.keys()];
  // Only a key backed by a real `superGroup` gets a drawn frame
  // (`boundedContextGroups` in `view.ts` skips tables without one); the
  // `__top:` fallback keys above band a loose table on its own but draw
  // nothing, so `spreadPacked` must not treat them as BCs to widen around.
  const realSuperKeys = new Set(nodes.flatMap((node) => (node.superGroup === undefined ? [] : [node.superGroup])));
  const composeAbsolute = (offsets: ReadonlyMap<string, LayoutPoint>): Map<string, LayoutPoint> => {
    const absolute = new Map<string, LayoutPoint>();
    for (const [superKey, groupKeys] of byBc) {
      const bcOffset = offsets.get(superKey) ?? { x: 0, y: 0 };
      const bc = bcLayouts.get(superKey);
      for (const groupKey of groupKeys) {
        const groupRelative = bc?.relative.get(groupKey) ?? { x: 0, y: 0 };
        const group = groupLayouts.get(groupKey);
        if (!group) continue;
        for (const [nodeId, nodeRelative] of group.relative) {
          absolute.set(nodeId, {
            x: bcOffset.x + groupRelative.x + nodeRelative.x,
            y: bcOffset.y + groupRelative.y + nodeRelative.y,
          });
        }
      }
    }
    return absolute;
  };
  let bcOffsets = new Map<string, LayoutPoint>();
  if (bcKeys.length <= 1) {
    for (const key of bcKeys) bcOffsets.set(key, { x: 0, y: 0 });
  } else {
    const interBcEdges = usable.flatMap((edge) => {
      const from = nodeToSuper.get(edge.from);
      const to = nodeToSuper.get(edge.to);
      if (from === undefined || to === undefined || from === to) return [];
      return [{ id: edge.id, from, to }];
    });
    const packAt = (rows: number): Packed =>
      arrangeBoxes(
        bcKeys.map((key) => ({ id: key, ...bcBoxSizes.get(key)! })),
        interBcEdges,
        config.superGroupSpacing,
        BC_PACK_ASPECT,
        config.sweeps,
        rows,
        OUTER_ASPECT_WEIGHT,
      );
    // The BC-level crossing proxy cannot see the difference between a stack
    // and a grid (it reported zero for both). Score each legal row count with
    // the table-level proxy instead, and only move away from the automatic
    // arrangement when it is a clear crossing win that does not cost fit.
    const auto = packAt(config.superGroupRowCount);
    const rowChoices = config.superGroupRowCount > 0 ? [] : [1, 2, 3, 4].filter((rows) => rows <= bcKeys.length);
    const candidates = [auto, ...rowChoices.map((rows) => packAt(rows))];
    const evaluate = (
      packed: Packed,
    ): { offsets: ReadonlyMap<string, LayoutPoint>; crossings: number; fit: number } => {
      const spread = spreadPacked(packed, bcBoxSizes, config.superGroupRowGap, config.superGroupColumnGap, (key) =>
        realSuperKeys.has(key),
      );
      const crossings = estimateArrangementCrossings(nodes, usable, composeAbsolute(spread.positions));
      const fit = Math.min(1180 / Math.max(1, spread.width), 900 / Math.max(1, spread.height), 1);
      return { offsets: spread.positions, crossings, fit };
    };
    const evaluated = candidates.map(evaluate);
    const autoEval = evaluated[0]!;
    let best = autoEval;
    for (const candidate of evaluated.slice(1)) {
      if (candidate.crossings > autoEval.crossings * 0.8) continue;
      if (candidate.fit < autoEval.fit * 0.9) continue;
      if (
        candidate.crossings < best.crossings ||
        (candidate.crossings === best.crossings && candidate.fit > best.fit)
      ) {
        best = candidate;
      }
    }
    bcOffsets = new Map(best.offsets);
  }

  // Compose: Bounded Context offset + its aggregate box's offset inside it + the
  // table's own offset inside that aggregate's sub-layout.
  const absolute = composeAbsolute(bcOffsets);

  // Routing only needs to tell a forward-looking edge from a backward one; with
  // boxes placed in a 2D pack rather than along one rank axis, comparing the
  // ports' own x (routeEdges' same-layer fallback) carries that, so every node
  // shares one nominal layer and is ordered by nothing more than input order.
  const reversed = breakCycles(nodes, usable).reversed;
  const placed: MutableNode[] = nodes.map((node, index) => {
    const point = absolute.get(node.id) ?? { x: 0, y: 0 };
    return { spec: node, layer: 0, order: index, x: point.x, y: point.y };
  });
  const byId = new Map(placed.map((node) => [node.spec.id, node]));
  const routes = routeEdges(usable, reversed, { byId, layerSpacing: config.layerSpacing, padding: config.padding });
  return normalise(placed, routes, config.padding);
};

/**
 * Merges reader-dragged absolute positions into a computed layout: an overridden
 * node moves to its stored position and everything else stays exactly where the
 * layout put it (no re-ranking, no re-packing, no shifting the whole canvas).
 * Edges are re-routed so they still reach the nodes they connect. Returns the
 * input layout unchanged when there is nothing to override.
 */
export const applyPositionOverrides = (
  layout: LayoutResult,
  overrides: ReadonlyMap<string, LayoutPoint>,
  nodeSpecs: readonly LayoutNodeSpec[],
  edgeSpecs: readonly LayoutEdgeSpec[],
  options: LayoutOptions = {},
): LayoutResult => {
  if (overrides.size === 0) return layout;
  const config: Config = { ...DEFAULTS, ...options };
  const specById = new Map(nodeSpecs.map((spec) => [spec.id, spec]));
  const nodes: readonly PlacedNode[] = layout.nodes.map((placed) => {
    const override = overrides.get(placed.id);
    return override === undefined ? placed : { ...placed, x: override.x, y: override.y };
  });
  const byId = new Map<string, MutableNode>(
    nodes.map((placed) => [
      placed.id,
      {
        spec: specById.get(placed.id) ?? { id: placed.id, width: placed.width, height: placed.height },
        layer: placed.layer,
        order: placed.order,
        x: placed.x,
        y: placed.y,
      },
    ]),
  );
  const ids = new Set(nodes.map((placed) => placed.id));
  const usable = edgeSpecs.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
  const routes = routeEdges(usable, new Set(), { byId, layerSpacing: config.layerSpacing, padding: config.padding });
  const xs = [...nodes.map((n) => n.x + n.width), ...routes.flatMap((route) => route.points.map((p) => p.x))];
  const ys = [...nodes.map((n) => n.y + n.height), ...routes.flatMap((route) => route.points.map((p) => p.y))];
  const width = Math.max(layout.width, Math.max(0, ...xs) + config.padding);
  const height = Math.max(layout.height, Math.max(0, ...ys) + config.padding);
  return { width, height, nodes, routes };
};

/** Places nodes exactly where the data says, and routes the same way. */
export const fixedLayout = (
  nodes: readonly LayoutNodeSpec[],
  edges: readonly LayoutEdgeSpec[],
  options: LayoutOptions = {},
): LayoutResult => {
  const config: Config = { ...DEFAULTS, ...options };
  if (nodes.length === 0) return { width: 0, height: 0, nodes: [], routes: [] };
  const ids = new Set(nodes.map((node) => node.id));
  const usable = edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
  const placed = toMutable(nodes, new Map(), new Map(), (node) => node.position ?? { x: 0, y: 0 });
  const byId = new Map(placed.map((node) => [node.spec.id, node]));
  return normalise(
    placed,
    routeEdges(usable, new Set(), { byId, layerSpacing: config.layerSpacing, padding: config.padding }),
    config.padding,
  );
};
