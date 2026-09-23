import type { LayoutPoint } from '../../lib/layout/layered';

/**
 * Pure model shared by every diagram component: tag filtering, reachability and
 * cycle grouping. No DOM, no Lit — the components' `element.ts` owns those.
 */

export type TagMatch = 'single' | 'all' | 'any';

export type TagState = {
  readonly active: readonly string[];
  readonly match: TagMatch;
};

export const EMPTY_TAG_STATE: TagState = { active: [], match: 'single' };

export const tagStateMatches = (tags: readonly string[], state: TagState): boolean => {
  if (state.active.length === 0) return true;
  return state.match === 'all'
    ? state.active.every((tag) => tags.includes(tag))
    : state.active.some((tag) => tags.includes(tag));
};

export const toggleTag = (state: TagState, tag: string): TagState => {
  if (state.active.includes(tag)) return { ...state, active: state.active.filter((item) => item !== tag) };
  if (state.match === 'single') return { ...state, active: [tag] };
  return { ...state, active: [...state.active, tag] };
};

/** Switching to `single` keeps the most recent selection, like the prototypes. */
export const setTagMatch = (state: TagState, match: TagMatch): TagState => ({
  match,
  active: match === 'single' && state.active.length > 1 ? state.active.slice(-1) : state.active,
});

export const clearTags = (state: TagState): TagState => ({ ...state, active: [] });

export type TagCount = { readonly tag: string; readonly count: number };

/** Counts per tag, in first-appearance order, for the filter row. */
export const tagCounts = (items: readonly (readonly string[])[]): readonly TagCount[] => {
  const counts = new Map<string, number>();
  for (const tags of items) {
    for (const tag of new Set(tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts].map(([tag, count]) => ({ tag, count }));
};

export type DiagramEdgeRef = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
};

/** Nodes reachable from `root`, with their hop distance. */
export type Reach = {
  readonly nodes: ReadonlyMap<string, number>;
  readonly edges: ReadonlySet<string>;
};

export const EMPTY_REACH: Reach = { nodes: new Map(), edges: new Set() };

export const reach = (
  edges: readonly DiagramEdgeRef[],
  root: string,
  direction: 'outgoing' | 'incoming',
  transitive: boolean,
): Reach => {
  const nodes = new Map<string, number>();
  const traversed = new Set<string>();
  const queue: { id: string; depth: number }[] = [{ id: root, depth: 0 }];
  const seen = new Set<string>([root]);
  for (const current of queue) {
    if (!transitive && current.depth >= 1) continue;
    for (const edge of edges) {
      const from = direction === 'outgoing' ? edge.from : edge.to;
      const to = direction === 'outgoing' ? edge.to : edge.from;
      if (from !== current.id) continue;
      traversed.add(edge.id);
      if (seen.has(to)) continue;
      seen.add(to);
      nodes.set(to, current.depth + 1);
      queue.push({ id: to, depth: current.depth + 1 });
    }
  }
  return { nodes, edges: traversed };
};

/**
 * Strongly connected groups (small graphs, so the O(n²)-in-practice
 * reachability check is simpler than Tarjan and just as deterministic).
 * A self-edge also makes its node a cycle.
 */
export const findCycles = (
  nodeIds: readonly string[],
  edges: readonly DiagramEdgeRef[],
): readonly (readonly string[])[] => {
  const reachable = new Map(nodeIds.map((id) => [id, reach(edges, id, 'outgoing', true).nodes]));
  const visited = new Set<string>();
  const groups: string[][] = [];
  for (const id of nodeIds) {
    if (visited.has(id)) continue;
    const group = nodeIds.filter(
      (other) => other === id || (reachable.get(id)?.has(other) === true && reachable.get(other)?.has(id) === true),
    );
    for (const member of group) visited.add(member);
    if (group.length > 1 || edges.some((edge) => edge.from === id && edge.to === id)) groups.push(group);
  }
  return groups;
};

export const cycleMembership = (groups: readonly (readonly string[])[]): ReadonlyMap<string, number> =>
  new Map(groups.flatMap((group, index) => group.map((id) => [id, index] as const)));

export const isCycleEdge = (edge: DiagramEdgeRef, membership: ReadonlyMap<string, number>): boolean =>
  membership.get(edge.from) === membership.get(edge.to) && membership.has(edge.from);

/* ------------------------------------------------------------ diagram inputs */

export type DiagramNodeInput = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly tags: readonly string[];
  /** Space-separated `dpk-template-grill` question ids, e.g. `Q1 Q4`. */
  readonly questions?: string;
  /** Port offsets relative to the node's top-left corner. */
  readonly ports?: Readonly<Record<string, LayoutPoint>>;
  /** Hand-authored position, used when the component lays out fixed. */
  readonly position?: LayoutPoint;
};

export type DiagramEdgeInput = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly tags: readonly string[];
  /** Space-separated `dpk-template-grill` question ids. */
  readonly questions?: string;
  readonly fromPort?: string;
  readonly toPort?: string;
};

export type DiagramData = {
  readonly nodes: readonly DiagramNodeInput[];
  readonly edges: readonly DiagramEdgeInput[];
};

/**
 * The decoded segments of a component reference id (`<diagram-id>/<kind>/<id>…`,
 * the part after `element:`); `null` when a segment is not valid URI encoding.
 */
export const elementRefSegments = (id: string): readonly string[] | null => {
  try {
    return id.split('/').map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
};

export type SelectionRef = { readonly kind: string; readonly id: string };

/** The selection shape of the graph diagrams (state, dependency, ER, map). */
export type GraphSelection = { readonly kind: 'node' | 'edge'; readonly id: string };

export type DiagramSelection = GraphSelection | null;

/** What the shared chrome asks the adapter to do; effects stay in the adapter. */
export type DiagramIntent<S extends SelectionRef = GraphSelection> =
  | { readonly kind: 'tag'; readonly tag: string }
  | { readonly kind: 'match'; readonly match: TagMatch }
  | { readonly kind: 'clear-tags' }
  | { readonly kind: 'select'; readonly selection: S | null }
  | { readonly kind: 'zoom'; readonly factor: number }
  | { readonly kind: 'fit' };

export type ElementState = {
  readonly selected: boolean;
  readonly related: boolean;
  readonly dimmed: boolean;
  /** Hop distance from the selection, when the component reports one. */
  readonly depth: number | null;
};

export const stateOf = (
  id: string,
  selected: DiagramSelection,
  kind: 'node' | 'edge',
  relations: Reach,
): ElementState => {
  const isSelected = selected !== null && selected.kind === kind && selected.id === id;
  const related = kind === 'node' ? relations.nodes.has(id) : relations.edges.has(id);
  const depth = kind === 'node' ? (relations.nodes.get(id) ?? null) : null;
  return {
    selected: isSelected,
    related: related && !isSelected,
    dimmed: selected !== null && !isSelected && !related,
    depth,
  };
};

/** Shared class names so every diagram dims and highlights the same way. */
export const classNames = (...entries: readonly (string | false | null | undefined)[]): string =>
  entries.filter((entry): entry is string => typeof entry === 'string' && entry !== '').join(' ');

/**
 * Where an orthogonal route can carry a label without covering its own line:
 * the middle of the segment that runs across the flow.
 */
export const routeLabelPoint = (points: readonly LayoutPoint[]): LayoutPoint => {
  const first = points[0] ?? { x: 0, y: 0 };
  const last = points.at(-1) ?? first;
  if (points.length <= 2) return { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
  if (points.length === 4) {
    const top = points[1] ?? first;
    const bottom = points[2] ?? last;
    return { x: top.x, y: (top.y + bottom.y) / 2 };
  }
  const left = points[2] ?? first;
  const right = points[3] ?? last;
  return { x: (left.x + right.x) / 2, y: left.y };
};
