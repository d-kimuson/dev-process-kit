import { describe, expect, it } from 'vitest';

import type { LayoutPoint, LayoutResult, PlacedNode } from '../../lib/layout/layered';

import { MODULE_SIZE } from './model';
import { branchPoint, ROUTE_CLEARANCE, ROUTE_PITCH, withDependencyRoutes } from './route';

type Edge = { readonly id: string; readonly from: string; readonly to: string };

const node = (id: string, column: number, row: number): PlacedNode => ({
  id,
  x: 48 + column * (MODULE_SIZE.width + 132),
  y: 48 + row * (MODULE_SIZE.height + 60),
  ...MODULE_SIZE,
  layer: column,
  order: row,
});

const routed = (nodes: readonly PlacedNode[], edges: readonly Edge[]): ReadonlyMap<string, readonly LayoutPoint[]> => {
  const placement: LayoutResult = {
    width: 2000,
    height: 1200,
    nodes,
    routes: edges.map((edge) => ({ id: edge.id, points: [] })),
  };
  return new Map(withDependencyRoutes(placement, edges).routes.map((route) => [route.id, route.points]));
};

const segments = (points: readonly LayoutPoint[]): readonly (readonly [LayoutPoint, LayoutPoint])[] =>
  points.slice(1).map((point, index) => [points[index]!, point] as const);

const onBorder = (point: LayoutPoint, box: PlacedNode): boolean =>
  ((point.x === box.x || point.x === box.x + box.width) && point.y > box.y && point.y < box.y + box.height) ||
  ((point.y === box.y || point.y === box.y + box.height) && point.x > box.x && point.x < box.x + box.width);

const entersBox = ([a, b]: readonly [LayoutPoint, LayoutPoint], box: PlacedNode): boolean =>
  Math.max(a.x, b.x) > box.x &&
  Math.min(a.x, b.x) < box.x + box.width &&
  Math.max(a.y, b.y) > box.y &&
  Math.min(a.y, b.y) < box.y + box.height;

/** Length two segments run along each other on one line. */
const sharedRun = (
  [a, b]: readonly [LayoutPoint, LayoutPoint],
  [c, d]: readonly [LayoutPoint, LayoutPoint],
): number => {
  if (a.x === b.x && c.x === d.x && a.x === c.x)
    return Math.max(
      0,
      Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)),
    );
  if (a.y === b.y && c.y === d.y && a.y === c.y)
    return Math.max(
      0,
      Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)),
    );
  return 0;
};

/** Every way the routes break the rules a reader relies on; empty when they are clean. */
const violations = (
  nodes: readonly PlacedNode[],
  edges: readonly Edge[],
  routes: ReadonlyMap<string, readonly LayoutPoint[]>,
): readonly string[] => {
  const found: string[] = [];
  const byId = new Map(nodes.map((entry) => [entry.id, entry]));
  for (const edge of edges) {
    const points = routes.get(edge.id) ?? [];
    if (points.length < 2) {
      found.push(`${edge.id} has no route`);
      continue;
    }
    if (!onBorder(points[0]!, byId.get(edge.from)!)) found.push(`${edge.id} does not leave its source's border`);
    if (!onBorder(points.at(-1)!, byId.get(edge.to)!)) found.push(`${edge.id} does not end on its target's border`);
    for (const segment of segments(points)) {
      const [a, b] = segment;
      if (a.x !== b.x && a.y !== b.y) found.push(`${edge.id} is not orthogonal`);
      if (Math.abs(b.x - a.x) + Math.abs(b.y - a.y) < ROUTE_PITCH) found.push(`${edge.id} has a short jog`);
      for (const box of nodes) if (entersBox(segment, box)) found.push(`${edge.id} runs through ${box.id}`);
    }
    const last = segments(points).at(-1)!;
    if (Math.abs(last[1].x - last[0].x) + Math.abs(last[1].y - last[0].y) < ROUTE_CLEARANCE)
      found.push(`${edge.id} bends right before its arrowhead`);
  }
  for (const first of edges) {
    for (const second of edges) {
      if (first.id >= second.id || first.from === second.from) continue;
      for (const a of segments(routes.get(first.id) ?? [])) {
        for (const b of segments(routes.get(second.id) ?? [])) {
          if (sharedRun(a, b) > 0) found.push(`${first.id} and ${second.id} share a lane`);
        }
      }
    }
  }
  return found;
};

describe('dependency routes', () => {
  it('draws a dependency between neighbours as one straight line', () => {
    const nodes = [node('a', 0, 0), node('b', 1, 0)];
    const routes = routed(nodes, [{ id: 'a-b', from: 'a', to: 'b' }]);
    const points = routes.get('a-b')!;
    expect(points).toHaveLength(2);
    expect(points[0]!.x).toBe(nodes[0]!.x + MODULE_SIZE.width);
    expect(points[1]!.x).toBe(nodes[1]!.x);
    expect(points[0]!.y).toBe(points[1]!.y);
  });

  it('draws a mutual dependency as two parallel lines with opposite directions', () => {
    const nodes = [node('a', 0, 0), node('b', 1, 0)];
    const edges = [
      { id: 'a-b', from: 'a', to: 'b' },
      { id: 'b-a', from: 'b', to: 'a' },
    ];
    const routes = routed(nodes, edges);
    const forward = routes.get('a-b')!;
    const back = routes.get('b-a')!;
    expect(forward).toHaveLength(2);
    expect(back).toHaveLength(2);
    expect(forward[0]!.x).toBeLessThan(forward[1]!.x);
    expect(back[0]!.x).toBeGreaterThan(back[1]!.x);
    expect(back[0]!.y - forward[0]!.y).toBeGreaterThanOrEqual(ROUTE_PITCH * 2);
    expect(violations(nodes, edges, routes)).toEqual([]);
  });

  it('branches the dependencies of one module from one trunk', () => {
    const nodes = [node('a', 0, 1), node('b', 1, 0), node('c', 1, 1), node('d', 1, 2)];
    const edges = ['b', 'c', 'd'].map((to) => ({ id: `a-${to}`, from: 'a', to }));
    const routes = routed(nodes, edges);
    expect(violations(nodes, edges, routes)).toEqual([]);
    const starts = new Set(edges.map((edge) => JSON.stringify(routes.get(edge.id)![0])));
    expect(starts.size).toBe(1);
    const junction = branchPoint(routes.get('a-b')!, [routes.get('a-c')!]);
    expect(junction).not.toBeNull();
    expect(junction!.y).toBe(routes.get('a-c')![0]!.y);
    expect(branchPoint(routes.get('a-c')!, [])).toBeNull();
  });

  it('gives every edge into one module a port of its own', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 1), node('c', 0, 2), node('hub', 1, 1)];
    const edges = ['a', 'b', 'c'].map((from) => ({ id: `${from}-hub`, from, to: 'hub' }));
    const routes = routed(nodes, edges);
    expect(violations(nodes, edges, routes)).toEqual([]);
    expect(new Set(edges.map((edge) => JSON.stringify(routes.get(edge.id)!.at(-1)))).size).toBe(3);
  });

  it('leads an edge that skips a rank around the module in between', () => {
    const nodes = [node('a', 0, 0), node('b', 1, 0), node('c', 2, 0)];
    const edges = [
      { id: 'a-b', from: 'a', to: 'b' },
      { id: 'b-c', from: 'b', to: 'c' },
      { id: 'a-c', from: 'a', to: 'c' },
      { id: 'c-a', from: 'c', to: 'a' },
    ];
    const routes = routed(nodes, edges);
    expect(violations(nodes, edges, routes)).toEqual([]);
    expect(routes.get('a-c')!.length).toBeGreaterThan(2);
  });

  it('routes a module the reader dragged out of its rank by the same rules', () => {
    const nodes = [node('a', 0, 0), node('b', 1, 0), { ...node('c', 1, 1), x: 131, y: 257 }, node('d', 2, 1)];
    const edges = [
      { id: 'a-b', from: 'a', to: 'b' },
      { id: 'a-c', from: 'a', to: 'c' },
      { id: 'c-d', from: 'c', to: 'd' },
      { id: 'd-a', from: 'd', to: 'a' },
      { id: 'b-d', from: 'b', to: 'd' },
    ];
    expect(violations(nodes, edges, routed(nodes, edges))).toEqual([]);
  });

  it('returns a module to itself', () => {
    const nodes = [node('a', 0, 0)];
    const edges = [{ id: 'a-a', from: 'a', to: 'a' }];
    const routes = routed(nodes, edges);
    expect(violations(nodes, edges, routes)).toEqual([]);
    expect(routes.get('a-a')!.length).toBeGreaterThan(3);
  });
});
