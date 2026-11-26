import { describe, expect, it } from 'vitest';

import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';

import { STATE_NODE_SIZE } from './model';
import { stateLabelPoint, stateLabelSize, withStateRoutes, type StateRouteEdge } from './route';

const node = (id: string, x: number, y: number): PlacedNode => ({ id, x, y, ...STATE_NODE_SIZE, layer: 0, order: 0 });

const edge = (id: string, from: string, to: string, title = id): StateRouteEdge => ({ id, from, to, title });

const route = (nodes: readonly PlacedNode[], edges: readonly StateRouteEdge[]): LayoutResult =>
  withStateRoutes({ width: 1600, height: 900, nodes, routes: edges.map(({ id }) => ({ id, points: [] })) }, edges);

const pointsOf = (layout: LayoutResult, id: string): readonly LayoutPoint[] =>
  layout.routes.find((entry) => entry.id === id)?.points ?? [];

type Segment = readonly [LayoutPoint, LayoutPoint];

const segments = (points: readonly LayoutPoint[]): readonly Segment[] =>
  points.slice(1).map((point, index) => [points[index]!, point] as const);

const onBorder = (point: LayoutPoint, box: PlacedNode): boolean =>
  ((point.x === box.x || point.x === box.x + box.width) && point.y > box.y && point.y < box.y + box.height) ||
  ((point.y === box.y || point.y === box.y + box.height) && point.x > box.x && point.x < box.x + box.width);

const entersBox = ([a, b]: Segment, box: PlacedNode): boolean =>
  Math.max(a.x, b.x) > box.x &&
  Math.min(a.x, b.x) < box.x + box.width &&
  Math.max(a.y, b.y) > box.y &&
  Math.min(a.y, b.y) < box.y + box.height;

/** Length two segments run on top of each other. */
const sharedRun = ([a, b]: Segment, [c, d]: Segment): number => {
  const horizontal = a.y === b.y;
  if (horizontal !== (c.y === d.y)) return 0;
  if (horizontal ? a.y !== c.y : a.x !== c.x) return 0;
  const [lo, hi] = horizontal ? [Math.min(a.x, b.x), Math.max(a.x, b.x)] : [Math.min(a.y, b.y), Math.max(a.y, b.y)];
  const [from, to] = horizontal ? [Math.min(c.x, d.x), Math.max(c.x, d.x)] : [Math.min(c.y, d.y), Math.max(c.y, d.y)];
  return Math.max(0, Math.min(hi, to) - Math.max(lo, from));
};

const labelBox = (layout: LayoutResult, { id, title }: StateRouteEdge) => {
  const center = stateLabelPoint(layout, id)!;
  const size = stateLabelSize(title ?? '');
  return {
    left: center.x - size.width / 2,
    right: center.x + size.width / 2,
    top: center.y - size.height / 2,
    bottom: center.y + size.height / 2,
  };
};

/** Everything a reader would call broken about the routes and labels; empty when the drawing is sound. */
const flaws = (layout: LayoutResult, nodes: readonly PlacedNode[], edges: readonly StateRouteEdge[]): string[] => {
  const found: string[] = [];
  const byId = new Map(nodes.map((entry) => [entry.id, entry]));
  for (const { id, from, to } of edges) {
    const points = pointsOf(layout, id);
    if (points.length < 2) {
      found.push(`${id} has no route`);
      continue;
    }
    if (!onBorder(points[0]!, byId.get(from)!)) found.push(`${id} leaves its source off the border`);
    if (!onBorder(points.at(-1)!, byId.get(to)!)) found.push(`${id} reaches its target off the border`);
    for (const segment of segments(points)) {
      if (segment[0].x !== segment[1].x && segment[0].y !== segment[1].y) found.push(`${id} runs diagonally`);
      for (const box of nodes) if (entersBox(segment, box)) found.push(`${id} runs through ${box.id}`);
    }
  }
  for (const [index, a] of edges.entries()) {
    for (const b of edges.slice(index + 1)) {
      const shared = segments(pointsOf(layout, a.id)).some((p) =>
        segments(pointsOf(layout, b.id)).some((q) => sharedRun(p, q) > 1),
      );
      if (shared) found.push(`${a.id} and ${b.id} share a lane`);
    }
  }
  const labels = edges.map((entry) => ({ id: entry.id, box: labelBox(layout, entry) }));
  for (const [index, a] of labels.entries()) {
    for (const box of nodes) {
      const over =
        a.box.right > box.x && a.box.left < box.x + box.width && a.box.bottom > box.y && a.box.top < box.y + box.height;
      if (over) found.push(`the label of ${a.id} covers ${box.id}`);
    }
    for (const b of labels.slice(index + 1)) {
      const over =
        a.box.right > b.box.left && a.box.left < b.box.right && a.box.bottom > b.box.top && a.box.top < b.box.bottom;
      if (over) found.push(`the labels of ${a.id} and ${b.id} overlap`);
    }
  }
  return found;
};

describe('state diagram routes', () => {
  it('draws a transition between two states on one row as a single straight line', () => {
    const nodes = [node('a', 72, 72), node('b', 420, 72)];
    const edges = [edge('go', 'a', 'b')];
    const layout = route(nodes, edges);
    expect(pointsOf(layout, 'go')).toHaveLength(2);
    expect(flaws(layout, nodes, edges)).toEqual([]);
  });

  it('keeps the two directions of a pair on separate lines with separate labels', () => {
    const nodes = [node('a', 72, 72), node('b', 420, 72)];
    const edges = [edge('ask', 'a', 'b', '問い合わせる'), edge('answer', 'b', 'a', '回答を受け取る')];
    const layout = route(nodes, edges);
    expect(flaws(layout, nodes, edges)).toEqual([]);
  });

  it('loops a self transition outside its state, away from the other transitions', () => {
    const nodes = [node('a', 72, 120), node('b', 420, 120)];
    const edges = [edge('go', 'a', 'b'), edge('retry', 'a', 'a'), edge('poll', 'a', 'a'), edge('back', 'b', 'a')];
    const layout = route(nodes, edges);
    expect(flaws(layout, nodes, edges)).toEqual([]);
    for (const id of ['retry', 'poll']) {
      const points = pointsOf(layout, id);
      expect(points).toHaveLength(4);
      // Both ends sit on one side of the state.
      expect(points[0]!.x === points.at(-1)!.x || points[0]!.y === points.at(-1)!.y).toBe(true);
    }
  });

  it('routes around a state that stands between the two ends', () => {
    const nodes = [node('a', 72, 72), node('wall', 420, 72), node('b', 768, 72)];
    const edges = [edge('skip', 'a', 'b'), edge('step', 'a', 'wall'), edge('next', 'wall', 'b')];
    const layout = route(nodes, edges);
    expect(flaws(layout, nodes, edges)).toEqual([]);
  });

  it('never bends twice within a jog too short to read', () => {
    const nodes = [node('a', 72, 72), node('b', 420, 96), node('c', 420, 260), node('d', 72, 300)];
    const edges = [
      edge('ab', 'a', 'b'),
      edge('ac', 'a', 'c'),
      edge('db', 'd', 'b'),
      edge('dc', 'd', 'c'),
      edge('ca', 'c', 'a'),
    ];
    const layout = route(nodes, edges);
    expect(flaws(layout, nodes, edges)).toEqual([]);
    for (const { id } of edges) {
      const runs = segments(pointsOf(layout, id));
      for (const [a, b] of runs.slice(1, -1)) {
        expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBeGreaterThanOrEqual(12);
      }
    }
  });
});
