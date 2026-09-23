import { describe, expect, it } from 'vitest';

import { fixedLayout, layeredLayout, type LayoutEdgeSpec, type LayoutNodeSpec } from './layered';

const node = (id: string, width = 120, height = 60): LayoutNodeSpec => ({ id, width, height });
const edge = (from: string, to: string, extra: Partial<LayoutEdgeSpec> = {}): LayoutEdgeSpec => ({
  id: `${from}-${to}`,
  from,
  to,
  ...extra,
});

const overlaps = (result: ReturnType<typeof layeredLayout>): boolean =>
  result.nodes.some((a, index) =>
    result.nodes
      .slice(index + 1)
      .some((b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height),
  );

describe('layeredLayout', () => {
  it('ranks a chain from left to right without overlaps', () => {
    const result = layeredLayout([node('a'), node('b'), node('c')], [edge('a', 'b'), edge('b', 'c')]);
    const [a, b, c] = ['a', 'b', 'c'].map((id) => result.nodes.find((entry) => entry.id === id));
    expect([a?.layer, b?.layer, c?.layer]).toEqual([0, 1, 2]);
    expect(a?.x).toBeLessThan(b?.x ?? 0);
    expect(b?.x).toBeLessThan(c?.x ?? 0);
    expect(overlaps(result)).toBe(false);
    expect(result.routes.map((route) => route.id)).toEqual(['a-b', 'b-c']);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('is deterministic and keeps a diamond tidy', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d')];
    const edges = [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')];
    const first = layeredLayout(nodes, edges);
    expect(layeredLayout(nodes, edges)).toEqual(first);
    const [b, c] = ['b', 'c'].map((id) => first.nodes.find((entry) => entry.id === id));
    expect(b?.layer).toBe(1);
    expect(c?.layer).toBe(1);
    expect(b?.x).toBe(c?.x);
    expect(overlaps(first)).toBe(false);
    for (const route of first.routes) {
      const last = route.points.at(-1);
      const target = first.nodes.find((entry) => entry.id === route.id.split('-')[1]);
      expect(route.points.length).toBeGreaterThanOrEqual(2);
      expect(last?.x).toBe(target?.x);
      expect(last?.y).toBeCloseTo((target?.y ?? 0) + (target?.height ?? 0) / 2, 6);
    }
  });

  it('breaks cycles instead of looping forever', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('a', 'b'), edge('b', 'a'), edge('b', 'c')];
    const result = layeredLayout(nodes, edges);
    expect(result.nodes).toHaveLength(3);
    expect(result.routes).toHaveLength(3);
    const back = result.routes.find((route) => route.id === 'b-a');
    expect(back?.points.length).toBeGreaterThan(2);
    expect(overlaps(result)).toBe(false);
  });

  it('loops a self edge around its node', () => {
    const result = layeredLayout([node('a')], [edge('a', 'a')]);
    expect(result.routes[0]?.points.length).toBe(6);
    expect(result.height).toBeGreaterThan(60);
  });

  it('attaches routes to declared ports', () => {
    const nodes: LayoutNodeSpec[] = [
      { id: 'a', width: 200, height: 120, ports: { out: { x: 200, y: 90 } } },
      { id: 'b', width: 200, height: 120, ports: { in: { x: 0, y: 30 } } },
    ];
    const result = layeredLayout(nodes, [edge('a', 'b', { fromPort: 'out', toPort: 'in' })]);
    const [from, to] = ['a', 'b'].map((id) => result.nodes.find((entry) => entry.id === id));
    const points = result.routes[0]?.points ?? [];
    expect(points[0]).toEqual({ x: (from?.x ?? 0) + 200, y: (from?.y ?? 0) + 90 });
    expect(points.at(-1)).toEqual({ x: to?.x ?? 0, y: (to?.y ?? 0) + 30 });
    expect(points).toHaveLength(4);
  });

  it('takes spacing, padding and ignored edges into account', () => {
    const result = layeredLayout([node('a'), node('b')], [edge('a', 'b'), edge('a', 'ghost')], {
      padding: 10,
      nodeSpacing: 5,
      layerSpacing: 20,
    });
    expect(result.routes).toHaveLength(1);
    const [a, b] = ['a', 'b'].map((id) => result.nodes.find((entry) => entry.id === id));
    expect(a?.x).toBe(10);
    expect(b?.x).toBe(10 + 120 + 20);
    expect(result.width).toBe(10 + 120 + 20 + 120 + 10);
  });

  it('handles empty and single-node input', () => {
    expect(layeredLayout([], [])).toEqual({ width: 0, height: 0, nodes: [], routes: [] });
    const single = layeredLayout([node('a')], []);
    expect(single.nodes[0]).toMatchObject({ id: 'a', x: 28, y: 28, layer: 0, order: 0 });
    expect(single.width).toBe(120 + 56);
  });
});

describe('fixedLayout', () => {
  it('keeps authored positions and routes between them', () => {
    const nodes: LayoutNodeSpec[] = [
      { id: 'a', width: 100, height: 50, position: { x: 0, y: 0 } },
      { id: 'b', width: 100, height: 50, position: { x: 300, y: 200 } },
    ];
    const result = fixedLayout(nodes, [edge('a', 'b')], { padding: 20 });
    expect(result.nodes.map((entry) => [entry.id, entry.x, entry.y])).toEqual([
      ['a', 20, 20],
      ['b', 320, 220],
    ]);
    expect(result.routes[0]?.points[0]).toEqual({ x: 120, y: 45 });
    expect(result.routes[0]?.points.at(-1)).toEqual({ x: 320, y: 245 });
    expect(result.width).toBe(440);
    expect(result.height).toBe(290);
  });

  it('defaults a missing position to the origin and ignores dangling edges', () => {
    const nodes: LayoutNodeSpec[] = [{ id: 'a', width: 40, height: 20 }];
    const result = fixedLayout(nodes, [edge('a', 'ghost')]);
    expect(result.nodes[0]).toMatchObject({ x: 28, y: 28 });
    expect(result.routes).toEqual([]);
  });
});
