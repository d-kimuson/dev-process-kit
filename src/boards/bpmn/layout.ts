import type { BpmnData, BpmnNode, BpmnPool } from './model';

import {
  layeredLayout,
  type LayoutEdgeSpec,
  type LayoutNodeSpec,
  type LayoutResult,
  type PlacedNode,
} from '../../lib/layout/layered';
import { externalLabel, flowLabelSize } from './shapes';

/**
 * BPMN's own layout: columns from the shared layered ranks, but rows from the
 * author's lane order, and bands (pools and lanes) built explicitly so they
 * can be drawn and so a lane's contents never leave it.
 *
 * The shared layered layout is used only for each node's rank and order. Its
 * grouping and band packing cannot keep a lane's authored order, so the x/y
 * coordinates, the pool and lane frames and the content margin are computed
 * here. Pure and deterministic: the same data always lays out the same.
 */

export type BpmnLaneBand = {
  readonly id: string;
  readonly name: string;
  readonly y: number;
  readonly height: number;
};

export type BpmnPoolBand = {
  readonly id: string;
  readonly name: string;
  readonly y: number;
  readonly height: number;
  /** A pool with no lanes and no nodes: only its frame and messages reach it. */
  readonly blackBox: boolean;
  readonly lanes: readonly BpmnLaneBand[];
};

export type BpmnBands = {
  readonly pools: readonly BpmnPoolBand[];
  /** x where a lane's content begins (pool head, lane head and padding). */
  readonly contentLeft: number;
};

export type BpmnLayout = { readonly placement: LayoutResult; readonly bands: BpmnBands };

export const BPMN_POOL_HEAD_WIDTH = 32;
export const BPMN_LANE_HEAD_WIDTH = 28;
export const BPMN_PAD_X = 32;
export const BPMN_POOL_GAP = 56;
export const BPMN_BLACK_BOX_HEIGHT = 56;
export const BPMN_LANE_MIN_HEIGHT = 120;
export const BPMN_LANE_PAD = 12;
/** Room under an event/gateway/data object for its label. */
export const BPMN_LABEL_RESERVE = 36;
/** Air between two rows of nodes in one lane. */
const ROW_GAP = 12;
const DEFAULT_LAYER_SPACING = 112;

const byId = (p: string, q: string): number => (p < q ? -1 : p > q ? 1 : 0);

type LaneContent = {
  readonly id: string;
  readonly name: string;
  readonly nodes: readonly BpmnNode[];
};

/** The lane an artifact without one inherits from the partner its association names. */
const effectiveLane = (data: BpmnData): ReadonlyMap<string, string | null> => {
  const laneOf = new Map<string, string | null>(data.nodes.map((node) => [node.id, node.lane]));
  const byNode = new Map(data.nodes.map((node) => [node.id, node]));
  for (const flow of data.edges) {
    if (flow.kind !== 'association') continue;
    for (const [artifact, partner] of [
      [flow.from, flow.to],
      [flow.to, flow.from],
    ] as const) {
      if (laneOf.get(artifact) !== null || byNode.get(artifact) === undefined) continue;
      const lane = laneOf.get(partner);
      if (lane !== undefined && lane !== null) laneOf.set(artifact, lane);
    }
  }
  return laneOf;
};

const laneContents = (pool: BpmnPool, nodes: readonly BpmnNode[]): readonly LaneContent[] => {
  if (pool.lanes.length === 0)
    return [{ id: pool.id, name: pool.name, nodes: nodes.filter((node) => node.pool === pool.id) }];
  return pool.lanes.map((lane) => ({
    id: lane.id,
    name: lane.name,
    nodes: nodes.filter((node) => node.lane === lane.id),
  }));
};

/** The text a flow label would draw, for the gap a column needs beside it. */
const labelOf = (flow: BpmnData['edges'][number]): string | null => flow.label ?? flow.condition;

export const bpmnPlacement = (data: BpmnData, options: { readonly layerSpacing?: number } = {}): BpmnLayout => {
  const laneOf = effectiveLane(data);
  const nodeSpecs: LayoutNodeSpec[] = data.nodes.map((node) => ({
    id: node.id,
    width: node.width,
    height: node.height,
  }));
  const rankEdges: LayoutEdgeSpec[] = data.edges.flatMap((flow) => {
    const fromNode = data.nodes.find((node) => node.id === flow.from);
    const toNode = data.nodes.find((node) => node.id === flow.to);
    if (fromNode === undefined || toNode === undefined) return [];
    if (flow.kind === 'association') {
      if (fromNode.kind === 'annotation') return [{ id: flow.id, from: flow.to, to: flow.from }];
      return [{ id: flow.id, from: flow.from, to: flow.to }];
    }
    return [{ id: flow.id, from: flow.from, to: flow.to }];
  });
  const ranked = layeredLayout(nodeSpecs, rankEdges, {
    padding: 0,
    nodeSpacing: 36,
    layerSpacing: DEFAULT_LAYER_SPACING,
  });
  const placed = new Map(ranked.nodes.map((node) => [node.id, node]));

  const widestLabel = Math.max(0, ...data.edges.map((flow) => flowLabelSize(labelOf(flow) ?? '').width));
  const layerSpacing = options.layerSpacing ?? Math.min(200, Math.max(72, widestLabel + 64));
  const layers = [...new Set(ranked.nodes.map((node) => node.layer))].sort((a, b) => a - b);

  // Column widths: the widest node or the widest label drawn under it.
  const columnWidth = new Map<number, number>();
  for (const node of data.nodes) {
    const at = placed.get(node.id);
    if (at === undefined) continue;
    const label = externalLabel(node);
    const width = Math.max(node.width, label?.width ?? 0);
    columnWidth.set(at.layer, Math.max(columnWidth.get(at.layer) ?? 0, width));
  }
  const columnX = new Map<number, number>();
  let cursor = 0;
  for (const layer of layers) {
    columnX.set(layer, cursor);
    cursor += (columnWidth.get(layer) ?? 0) + layerSpacing;
  }
  const contentLeft =
    BPMN_POOL_HEAD_WIDTH + (data.pools.some((pool) => pool.lanes.length > 0) ? BPMN_LANE_HEAD_WIDTH : 0) + BPMN_PAD_X;

  const allLanes: LaneContent[] = data.pools.flatMap((pool) => laneContents(pool, data.nodes));
  const laneById = new Map(allLanes.map((lane) => [lane.id, lane]));

  type LaneRows = { readonly heights: readonly number[]; readonly tallest: readonly number[] };
  const rowsOf = (nodes: readonly BpmnNode[]): LaneRows => {
    const columns = new Map<number, BpmnNode[]>();
    for (const node of nodes) {
      const at = placed.get(node.id);
      if (at === undefined) continue;
      const bucket = columns.get(at.layer) ?? [];
      bucket.push(node);
      columns.set(at.layer, bucket);
    }
    for (const bucket of columns.values())
      bucket.sort((p, q) => placed.get(p.id)!.order - placed.get(q.id)!.order || byId(p.id, q.id));
    const count = Math.max(0, ...[...columns.values()].map((bucket) => bucket.length));
    const tallest = Array.from({ length: count }, (_, index) =>
      Math.max(
        0,
        ...[...columns.values()].flatMap((bucket) => (bucket[index] === undefined ? [] : [bucket[index]!.height])),
      ),
    );
    const heights = tallest.map((height, index) => {
      const members = [...columns.values()].flatMap((bucket) => (bucket[index] === undefined ? [] : [bucket[index]!]));
      const labelled = members.some((node) => externalLabel(node) !== null);
      return height + (labelled ? BPMN_LABEL_RESERVE : 0) + (index > 0 ? ROW_GAP : 0);
    });
    return { heights, tallest };
  };
  const rowsByLane = new Map(allLanes.map((lane) => [lane.id, rowsOf(lane.nodes)]));

  const poolBands: BpmnPoolBand[] = [];
  let top = 0;
  for (const [poolIndex, pool] of data.pools.entries()) {
    const lanes = laneContents(pool, data.nodes);
    const empty = lanes.every((lane) => lane.nodes.length === 0);
    if (pool.lanes.length === 0 && empty) {
      poolBands.push({
        id: pool.id,
        name: pool.name,
        y: top,
        height: BPMN_BLACK_BOX_HEIGHT,
        blackBox: true,
        lanes: [],
      });
      top += BPMN_BLACK_BOX_HEIGHT + (poolIndex + 1 < data.pools.length ? BPMN_POOL_GAP : 0);
      continue;
    }
    const laneBands: BpmnLaneBand[] = [];
    let laneTop = top;
    for (const lane of lanes) {
      const heights = rowsByLane.get(lane.id)?.heights ?? [];
      const height = Math.max(BPMN_LANE_MIN_HEIGHT, heights.reduce((sum, value) => sum + value, 0) + BPMN_LANE_PAD * 2);
      laneBands.push({ id: lane.id, name: lane.name, y: laneTop, height });
      laneTop += height;
    }
    poolBands.push({ id: pool.id, name: pool.name, y: top, height: laneTop - top, blackBox: false, lanes: laneBands });
    top = laneTop + (poolIndex + 1 < data.pools.length ? BPMN_POOL_GAP : 0);
  }

  const bandOf = new Map<string, BpmnLaneBand>();
  for (const pool of poolBands) for (const lane of pool.lanes) bandOf.set(lane.id, lane);

  const nodes: PlacedNode[] = data.nodes.flatMap((node) => {
    const at = placed.get(node.id);
    const laneId = laneOf.get(node.id) ?? node.lane;
    if (at === undefined || laneId === null || laneId === undefined) return [];
    const lane = laneById.get(laneId);
    const band = bandOf.get(laneId);
    const rows = rowsByLane.get(laneId);
    if (lane === undefined || band === undefined || rows === undefined) return [];
    const column = columnX.get(at.layer) ?? 0;
    const width = columnWidth.get(at.layer) ?? node.width;
    const siblings = lane.nodes
      .filter((candidate) => placed.get(candidate.id)?.layer === at.layer)
      .sort((p, q) => placed.get(p.id)!.order - placed.get(q.id)!.order || byId(p.id, q.id));
    const row = Math.max(
      0,
      siblings.findIndex((candidate) => candidate.id === node.id),
    );
    const rowTop = band.y + BPMN_LANE_PAD + rows.heights.slice(0, row).reduce((sum, value) => sum + value, 0);
    const tallest = rows.tallest[row] ?? node.height;
    return [
      {
        id: node.id,
        x: contentLeft + column + (width - node.width) / 2,
        y: rowTop + (tallest - node.height) / 2,
        width: node.width,
        height: node.height,
        layer: at.layer,
        order: at.order,
      } satisfies PlacedNode,
    ];
  });

  const maxRight = Math.max(0, ...nodes.map((node) => node.x + node.width));
  const width = contentLeft + maxRight + BPMN_PAD_X;
  const height = Math.max(0, top);
  return {
    placement: { width, height, nodes, routes: [] },
    bands: { pools: poolBands, contentLeft },
  };
};
