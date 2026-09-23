import * as v from 'valibot';

import type { ElementActionResult } from '../../core/element-actions';
import type { DraftAction } from '../../core/types';

import { elementRefSegments, type DiagramEdgeInput, type DiagramNodeInput } from '../diagram/model';

/**
 * Domain model of the mind map: one central topic and a tree of subtopics.
 *
 * The JSON child is the tree itself, because that is how a mind map is written
 * down; parsing flattens it into nodes (topics) and edges (parent → child), so
 * the shared diagram chrome can filter, select and comment on it like any other
 * graph. Ids are unique across the whole tree.
 *
 * Reviewers can grow the tree from the page: `ADD_TOPIC` element actions are
 * replayed over the authored tree (`reduceMindMapActions`) and the topics they
 * add are marked, so the agent can fold them into the JSON later.
 */

export type MindMapSide = 'left' | 'right';

export type TopicInput = {
  readonly id: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly tags?: readonly string[] | undefined;
  readonly questions?: string | undefined;
  readonly collapsed?: boolean | undefined;
  readonly side?: MindMapSide | undefined;
  readonly children?: readonly TopicInput[] | undefined;
};

const topicSchema: v.GenericSchema<TopicInput> = v.lazy(() =>
  v.strictObject({
    id: v.pipe(v.string(), v.minLength(1)),
    label: v.pipe(v.string(), v.minLength(1)),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    questions: v.optional(v.string()),
    collapsed: v.optional(v.boolean()),
    side: v.optional(v.picklist(['left', 'right'])),
    children: v.optional(v.array(topicSchema)),
  }),
);

const mindMapSchema = v.strictObject({ root: topicSchema });

export type MindMapNode = DiagramNodeInput & {
  readonly label: string;
  readonly description: string | null;
  readonly parent: string | null;
  /** 0 for the central topic. */
  readonly depth: number;
  /** Index of the main topic this node hangs under; `-1` for the central topic. */
  readonly branch: number;
  /** Which half of the map the node lives in; `null` for the central topic. */
  readonly side: MindMapSide | null;
  readonly children: readonly string[];
  /** Authored initial folding. The element owns the live folding state. */
  readonly collapsed: boolean;
  /** Added by a draft action on this page, not authored yet. */
  readonly added: boolean;
};

/** One edge per non-central topic; its id is the child's id. */
export type MindMapEdge = DiagramEdgeInput;

/** What layout and rendering need: the flattened topics. */
export type MindMapGraph = {
  readonly nodes: readonly MindMapNode[];
  readonly edges: readonly MindMapEdge[];
};

export type MindMapData = MindMapGraph & {
  /** The tree the graph was flattened from; element actions grow it. */
  readonly root: TopicInput | null;
};

export const emptyMindMapData = (): MindMapData => ({ root: null, nodes: [], edges: [] });

/* ------------------------------------------------------------------- sizing */

type TopicMetrics = {
  readonly fontSize: number;
  readonly padding: number;
  readonly height: number;
  readonly min: number;
  readonly max: number;
};

const METRICS: readonly TopicMetrics[] = [
  { fontSize: 16, padding: 22, height: 48, min: 120, max: 280 },
  { fontSize: 13.5, padding: 15, height: 34, min: 80, max: 240 },
  { fontSize: 12.5, padding: 12, height: 28, min: 56, max: 220 },
];

const metricsFor = (depth: number): TopicMetrics =>
  METRICS[Math.min(depth, METRICS.length - 1)] ?? { fontSize: 12.5, padding: 12, height: 28, min: 56, max: 220 };

/**
 * A deterministic width estimate, so the layout stays a pure function of the
 * data: full-width (CJK) glyphs take a whole em, everything else a little over
 * half. The rendered label ellipsizes whatever the estimate misses.
 */
export const estimateTextWidth = (text: string, fontSize: number): number => {
  let width = 0;
  for (const char of text) width += (char.codePointAt(0) ?? 0) >= 0x2e80 ? fontSize : fontSize * 0.62;
  return width;
};

export const topicSize = (label: string, depth: number): { readonly width: number; readonly height: number } => {
  const metrics = metricsFor(depth);
  const width = Math.ceil(estimateTextWidth(label, metrics.fontSize) + metrics.padding * 2 + 4);
  return { width: Math.min(metrics.max, Math.max(metrics.min, width)), height: metrics.height };
};

/* ------------------------------------------------------------------ parsing */

const leafCount = (topic: TopicInput): number =>
  topic.children === undefined || topic.children.length === 0
    ? 1
    : topic.children.reduce((sum, child) => sum + leafCount(child), 0);

/**
 * Main topics without an authored `side` go to whichever half is lighter so far
 * (by leaf count), so the map stays balanced around the central topic. Authored
 * sides are honoured and count towards the balance.
 */
export const assignSides = (topics: readonly TopicInput[]): readonly MindMapSide[] => {
  const weight = { left: 0, right: 0 };
  for (const topic of topics) if (topic.side !== undefined) weight[topic.side] += leafCount(topic);
  return topics.map((topic) => {
    if (topic.side !== undefined) return topic.side;
    const side: MindMapSide = weight.right <= weight.left ? 'right' : 'left';
    weight[side] += leafCount(topic);
    return side;
  });
};

export const parseMindMapData = (input: unknown): MindMapData => flattenMindMap(v.parse(mindMapSchema, input).root);

const flattenMindMap = (root: TopicInput, added: ReadonlySet<string> = new Set()): MindMapData => {
  const nodes: MindMapNode[] = [];
  const edges: MindMapEdge[] = [];
  const ids = new Set<string>();

  const visit = (
    topic: TopicInput,
    parent: string | null,
    depth: number,
    branch: number,
    side: MindMapSide | null,
  ): void => {
    if (ids.has(topic.id)) throw new Error(`duplicate topic id: ${topic.id}`);
    ids.add(topic.id);
    if (topic.side !== undefined && depth !== 1) {
      throw new Error(`side is only allowed on a main topic (a child of the root): ${topic.id}`);
    }
    const children = topic.children ?? [];
    nodes.push({
      id: topic.id,
      label: topic.label,
      description: topic.description ?? null,
      parent,
      depth,
      branch,
      side,
      children: children.map((child) => child.id),
      collapsed: topic.collapsed ?? false,
      added: added.has(topic.id),
      tags: topic.tags ?? [],
      ...topicSize(topic.label, depth),
      ...(topic.questions === undefined ? {} : { questions: topic.questions }),
    });
    if (parent !== null) edges.push({ id: topic.id, from: parent, to: topic.id, tags: [] });
    const sides = depth === 0 ? assignSides(children) : [];
    children.forEach((child, index) =>
      visit(child, topic.id, depth + 1, depth === 0 ? index : branch, depth === 0 ? (sides[index] ?? 'right') : side),
    );
  };

  visit(root, null, 0, -1, null);
  return { root, nodes, edges };
};

/* ---------------------------------------------------------- element actions */

export const ADD_TOPIC = 'ADD_TOPIC';

const addTopicPayloadSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  label: v.pipe(v.string(), v.trim(), v.minLength(1)),
});

/** `<map-id>/node/<topic-id>` → the topic id. */
const topicOfTarget = (targetId: string): string | null => {
  const segments = elementRefSegments(targetId);
  return segments?.length === 3 && segments[1] === 'node' ? (segments[2] ?? null) : null;
};

const appendChild = (topic: TopicInput, parent: string, child: TopicInput): TopicInput =>
  topic.id === parent
    ? { ...topic, children: [...(topic.children ?? []), child] }
    : topic.children === undefined
      ? topic
      : { ...topic, children: topic.children.map((next) => appendChild(next, parent, child)) };

/**
 * The balance of the authored map is fixed before anything is added, so a
 * reviewer's topic never flips an existing branch to the other side.
 */
const pinSides = (root: TopicInput): TopicInput => {
  if (root.children === undefined) return root;
  const sides = assignSides(root.children);
  return { ...root, children: root.children.map((child, index) => ({ ...child, side: sides[index] ?? 'right' })) };
};

/**
 * Replays the draft's element actions over the authored map, in order.
 * Each action is reported on: applied, or why it is stale. Pure.
 */
export const reduceMindMapActions = (
  data: MindMapData,
  actions: readonly DraftAction[],
): { readonly data: MindMapData; readonly results: readonly ElementActionResult[] } => {
  const title = 'トピックを追加';
  const labels = new Map(data.nodes.map((node) => [node.id, node.label]));
  const added = new Set<string>();
  const results: ElementActionResult[] = [];
  let root = data.root === null ? null : pinSides(data.root);
  for (const action of actions) {
    if (action.type !== ADD_TOPIC) {
      results.push({ id: action.id, title: action.type, stale: 'unsupported-action-type' });
      continue;
    }
    const parent = topicOfTarget(action.target.id);
    const parentLabel = parent === null ? undefined : labels.get(parent);
    const payload = v.safeParse(addTopicPayloadSchema, action.payload);
    if (root === null || parent === null || parentLabel === undefined) {
      results.push({ id: action.id, title, stale: 'target-missing' });
      continue;
    }
    if (!payload.success || labels.has(payload.output.id)) {
      results.push({ id: action.id, title, stale: 'constraint-violated' });
      continue;
    }
    const { id, label } = payload.output;
    root = appendChild(root, parent, { id, label });
    labels.set(id, label);
    added.add(id);
    results.push({ id: action.id, title, summary: `${parentLabel} › ${label}`, tone: 'create' });
  }
  return { data: root === null || added.size === 0 ? data : flattenMindMap(root, added), results };
};

/* ---------------------------------------------------------------- structure */

/** Ancestor ids, nearest first. Unknown ids have none. */
export const ancestorsOf = (data: MindMapData, id: string): readonly string[] => {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const ancestors: string[] = [];
  let parent = byId.get(id)?.parent ?? null;
  while (parent !== null && !ancestors.includes(parent)) {
    ancestors.push(parent);
    parent = byId.get(parent)?.parent ?? null;
  }
  return ancestors;
};

export const descendantCount = (data: MindMapData, id: string): number => {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  let count = 0;
  const stack = [...(byId.get(id)?.children ?? [])];
  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    count += 1;
    stack.push(...(byId.get(next)?.children ?? []));
  }
  return count;
};

/**
 * What the map shows for a tag filter and a set of folded topics.
 *
 * A tree cannot drop a parent without orphaning its children, so a tag match
 * keeps its whole path to the central topic and everything beneath it; when
 * nothing matches, nothing is shown. Folding hides a topic's descendants and
 * keeps the topic itself.
 */
export const visibleMindMap = (
  data: MindMapData,
  matches: ((node: MindMapNode) => boolean) | null,
  collapsed: ReadonlySet<string>,
): MindMapData => {
  let included: ReadonlySet<string> | null = null;
  if (matches !== null) {
    const matched = data.nodes.filter(matches);
    if (matched.length === 0) return emptyMindMapData();
    const byId = new Map(data.nodes.map((node) => [node.id, node]));
    const keep = new Set<string>();
    for (const node of matched) {
      keep.add(node.id);
      for (const ancestor of ancestorsOf(data, node.id)) keep.add(ancestor);
      const stack = [...node.children];
      for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
        keep.add(next);
        stack.push(...(byId.get(next)?.children ?? []));
      }
    }
    included = keep;
  }
  const nodes = data.nodes.filter(
    (node) =>
      (included === null || included.has(node.id)) &&
      !ancestorsOf(data, node.id).some((ancestor) => collapsed.has(ancestor)),
  );
  const ids = new Set(nodes.map((node) => node.id));
  return { ...data, nodes, edges: data.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)) };
};
