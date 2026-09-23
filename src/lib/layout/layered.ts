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
};

const DEFAULTS = {
  nodeSpacing: 34,
  layerSpacing: 84,
  padding: 28,
  sweeps: 4,
  coordinatePasses: 6,
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
  assignCoordinates(layers, byId, neighbourIndex(nodes, usable), layerOf, config);

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
