/**
 * Per-end port placement for a batch of edges: where each edge should leave or
 * enter a node, and on which side.
 *
 * The routers in this directory connect two points, and the layouts that feed
 * them only knew one point per node side (the side's midpoint). Every edge
 * touching that side therefore left from the same pixel and ran along the same
 * line until its own first bend — two relations drawn as one stroke, which is
 * `scoreLayout`'s `collinearOverlap`. This module is the missing step before
 * routing: it gives each end of each edge its own point on its node's side,
 * fanned around the side's middle by a gap that shrinks when the side is short
 * (a clamped fan, so a node with many incident edges never gets a port outside
 * its own side).
 *
 * The ordering inside one side is the reader's own order — by where the other
 * end of the edge sits along that side, then by edge id — so two edges leaving
 * for different targets do not swap lanes between renders, and an edge that
 * points up always leaves above one that points down. That is what keeps a
 * fan-out crossing-free: the ports and the lanes they feed are in one order.
 *
 * Pure and deterministic: no DOM, no layout engine, same input → same ports.
 */

import type { LayoutPoint } from './layered';

/** The side of a node's box an edge leaves or enters. */
export type PortSide = 'left' | 'right' | 'top' | 'bottom';

/** A node the fan places ports on: its placed box, in world coordinates. */
export type FanNode = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type FanEdge = { readonly id: string; readonly from: string; readonly to: string };

/** Which end of an edge a port is for. */
export type FanEnd = 'from' | 'to';

export type FanSideContext = {
  readonly node: FanNode;
  readonly other: FanNode;
  readonly edge: FanEdge;
  /** `from` when `node` is the edge's source; a self-edge is asked twice, with both ends. */
  readonly end: FanEnd;
};

export type FanOptions = {
  /** Which side an end uses. Defaults to `facingPortSide`, the side that faces the other end. */
  readonly sideOf?: (context: FanSideContext) => PortSide;
  /** Distance kept from each corner of the side, so a port never lands on a corner. */
  readonly inset?: number;
  /** Gap between two neighbouring ports, pulled in when the side cannot hold it. */
  readonly gap?: number;
};

export type EdgePort = { readonly point: LayoutPoint; readonly side: PortSide };
/** Both ends of one edge: where it leaves its source and where it enters its target. */
export type EdgePorts = { readonly from: EdgePort; readonly to: EdgePort };

const DEFAULT_INSET = 12;
const DEFAULT_GAP = 16;

const centreOf = (node: FanNode): LayoutPoint => ({ x: node.x + node.width / 2, y: node.y + node.height / 2 });

/**
 * The side of `node` that faces `other`: the dominant axis wins, so a mostly
 * horizontal edge leaves sideways and a mostly vertical one leaves vertically.
 * A node facing itself (a self-edge) has no facing side and reads as `right`.
 */
export const facingPortSide = (node: FanNode, other: FanNode): PortSide => {
  const a = centreOf(node);
  const b = centreOf(other);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
};

/** Whether a side runs down the node's height (`y` axis) or across its width (`x` axis). */
export const sideAxis = (side: PortSide): 'x' | 'y' => (side === 'left' || side === 'right' ? 'y' : 'x');

/**
 * Where item `index` of `count` sits in `[low, high]` when the items are fanned
 * around the range's middle `gap` apart. When the range cannot hold `gap`, the
 * step shrinks to fit exactly, so every item stays inside the range and no two
 * items share a place. A single item sits at the middle.
 */
export const fanOffset = (low: number, high: number, count: number, index: number, gap: number): number => {
  const middle = (low + high) / 2;
  if (count <= 1) return middle;
  const step = Math.min(gap, Math.max(0, high - low) / (count - 1));
  return middle + (index - (count - 1) / 2) * step;
};

/** The span a side offers its ports, `inset` clear of both corners. */
const sideRange = (node: FanNode, side: PortSide, inset: number): { readonly low: number; readonly high: number } => {
  const length = sideAxis(side) === 'y' ? node.height : node.width;
  const start = sideAxis(side) === 'y' ? node.y : node.x;
  // A side shorter than two insets keeps its single port at the middle rather
  // than inverting the range.
  return { low: start + Math.min(inset, length / 2), high: start + Math.max(length - inset, length / 2) };
};

/** The world point at `along` on `side` of `node`. */
const pointOnSide = (node: FanNode, side: PortSide, along: number): LayoutPoint => {
  switch (side) {
    case 'left':
      return { x: node.x, y: along };
    case 'right':
      return { x: node.x + node.width, y: along };
    case 'top':
      return { x: along, y: node.y };
    case 'bottom':
      return { x: along, y: node.y + node.height };
    default:
      return { x: node.x + node.width, y: along };
  }
};

type FanItem = {
  readonly edgeId: string;
  readonly end: FanEnd;
  readonly node: FanNode;
  readonly side: PortSide;
  /** The other end's centre on this side's own axis: the ordering key. */
  readonly order: number;
  /** How far the other end is from this one, used only to break a tie on `order`. */
  readonly distance: number;
};

/**
 * One port per edge end, fanned along the side it uses. Every node's sides are
 * independent of every other node's, so the result is a stable function of the
 * placed boxes and the edge list alone.
 *
 * An edge whose endpoints are not both in `nodes` is skipped, so a caller can
 * pass a wider edge list without pruning it first.
 */
export const staggeredEdgePorts = (
  nodes: readonly FanNode[],
  edges: readonly FanEdge[],
  options: FanOptions = {},
): ReadonlyMap<string, EdgePorts> => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const inset = options.inset ?? DEFAULT_INSET;
  const gap = options.gap ?? DEFAULT_GAP;
  const sideOfEnd = options.sideOf ?? ((context: FanSideContext) => facingPortSide(context.node, context.other));

  const groups = new Map<string, FanItem[]>();
  const add = (item: Omit<FanItem, 'order' | 'distance'>, other: FanNode): void => {
    const from = centreOf(item.node);
    const to = centreOf(other);
    const along = sideAxis(item.side) === 'y' ? to.y : to.x;
    const key = `${item.node.id}\u0000${item.side}`;
    const bucket = groups.get(key);
    const entry: FanItem = { ...item, order: along, distance: Math.abs(to.x - from.x) + Math.abs(to.y - from.y) };
    if (bucket) bucket.push(entry);
    else groups.set(key, [entry]);
  };
  for (const edge of edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (from === undefined || to === undefined) continue;
    add(
      { edgeId: edge.id, end: 'from', node: from, side: sideOfEnd({ node: from, other: to, edge, end: 'from' }) },
      to,
    );
    add({ edgeId: edge.id, end: 'to', node: to, side: sideOfEnd({ node: to, other: from, edge, end: 'to' }) }, from);
  }

  const ends = new Map<string, { from?: EdgePort; to?: EdgePort }>();
  for (const group of groups.values()) {
    const first = group[0];
    if (first === undefined) continue;
    const { low, high } = sideRange(first.node, first.side, inset);
    // Counterpart centre first, then id, then end: a self-edge's two ends have
    // the same counterpart, so the end is the only thing left to order them by.
    // Two counterparts at the same centre are in one row or column, where the
    // farther one is the one that has to swing around the nearer — and an edge
    // that swings widest needs the outermost slot, or the nearer edge's own
    // exit run lies in its way.
    const sorted = [...group].sort(
      (a, b) =>
        a.order - b.order || b.distance - a.distance || a.edgeId.localeCompare(b.edgeId) || a.end.localeCompare(b.end),
    );
    sorted.forEach((item, index) => {
      const point = pointOnSide(item.node, item.side, fanOffset(low, high, sorted.length, index, gap));
      const ports = ends.get(item.edgeId) ?? {};
      if (item.end === 'from') ports.from = { point, side: item.side };
      else ports.to = { point, side: item.side };
      ends.set(item.edgeId, ports);
    });
  }

  const result = new Map<string, EdgePorts>();
  for (const [edgeId, ports] of ends) {
    if (ports.from !== undefined && ports.to !== undefined) result.set(edgeId, { from: ports.from, to: ports.to });
  }
  return result;
};
