import { describe, expect, it } from 'vitest';

import {
  applyPositionOverrides,
  fixedLayout,
  layeredLayout,
  type LayoutEdgeSpec,
  type LayoutNodeSpec,
} from './layered';

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

describe('layeredLayout with groups', () => {
  /** The box bounding every node in `ids`, the same way a diagram draws a group frame. */
  const groupBox = (result: ReturnType<typeof layeredLayout>, ids: readonly string[]) => {
    const boxes = ids.flatMap((id) => {
      const found = result.nodes.find((entry) => entry.id === id);
      return found ? [found] : [];
    });
    return {
      left: Math.min(...boxes.map((box) => box.x)),
      top: Math.min(...boxes.map((box) => box.y)),
      right: Math.max(...boxes.map((box) => box.x + box.width)),
      bottom: Math.max(...boxes.map((box) => box.y + box.height)),
    };
  };
  const boxesOverlap = (a: ReturnType<typeof groupBox>, b: ReturnType<typeof groupBox>): boolean =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const containsPoint = (box: ReturnType<typeof groupBox>, x: number, y: number): boolean =>
    x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;

  it('never overlaps two groups, even when they interleave across ranks', () => {
    const nodes: LayoutNodeSpec[] = [
      { id: 'a1', width: 100, height: 40, group: 'A' },
      { id: 'a2', width: 100, height: 40, group: 'A' },
      { id: 'b1', width: 100, height: 40, group: 'B' },
      { id: 'b2', width: 100, height: 40, group: 'B' },
      { id: 'lone', width: 100, height: 40 },
    ];
    const edges: LayoutEdgeSpec[] = [
      edge('a1', 'b1'),
      edge('b1', 'a2'),
      edge('a2', 'b2'),
      edge('b2', 'lone'),
      edge('lone', 'a1'),
    ];
    const result = layeredLayout(nodes, edges);
    const boxA = groupBox(result, ['a1', 'a2']);
    const boxB = groupBox(result, ['b1', 'b2']);
    expect(boxesOverlap(boxA, boxB)).toBe(false);
    // The lone node (no group) must never land inside either group's box.
    const lone = result.nodes.find((entry) => entry.id === 'lone');
    expect(containsPoint(boxA, (lone?.x ?? 0) + 1, (lone?.y ?? 0) + 1)).toBe(false);
    expect(containsPoint(boxB, (lone?.x ?? 0) + 1, (lone?.y ?? 0) + 1)).toBe(false);
  });

  it('keeps a group isolated from an ungrouped node even sharing its rank', () => {
    const nodes: LayoutNodeSpec[] = [
      { id: 'a1', width: 80, height: 30, group: 'A' },
      { id: 'a2', width: 80, height: 30, group: 'A' },
      { id: 'solo', width: 80, height: 30 },
    ];
    // a1, a2 and solo all share rank 0 (no edges), so they would interleave
    // under plain ordering if groups were not banded.
    const result = layeredLayout(nodes, []);
    const boxA = groupBox(result, ['a1', 'a2']);
    const solo = result.nodes.find((entry) => entry.id === 'solo');
    expect(containsPoint(boxA, (solo?.x ?? 0) + 1, (solo?.y ?? 0) + 1)).toBe(false);
  });

  it('is deterministic and matches the ungrouped layout exactly when no node has a group', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('a', 'b'), edge('b', 'c')];
    expect(layeredLayout(nodes, edges)).toEqual(layeredLayout(nodes, edges));
  });

  it('adds extra room between two groups, via groupSpacing', () => {
    const nodes: LayoutNodeSpec[] = [
      { id: 'a1', width: 80, height: 30, group: 'A' },
      { id: 'b1', width: 80, height: 30, group: 'B' },
    ];
    const tight = layeredLayout(nodes, [], { groupSpacing: 10 });
    const loose = layeredLayout(nodes, [], { groupSpacing: 100 });
    expect(loose.height).toBeGreaterThan(tight.height);
  });
});

describe('layeredLayout with superGroup', () => {
  /** The box bounding every node in `ids`, the same way a diagram draws a group frame. */
  const groupBox = (result: ReturnType<typeof layeredLayout>, ids: readonly string[]) => {
    const boxes = ids.flatMap((id) => {
      const found = result.nodes.find((entry) => entry.id === id);
      return found ? [found] : [];
    });
    return {
      left: Math.min(...boxes.map((box) => box.x)),
      top: Math.min(...boxes.map((box) => box.y)),
      right: Math.max(...boxes.map((box) => box.x + box.width)),
      bottom: Math.max(...boxes.map((box) => box.y + box.height)),
    };
  };
  const boxesOverlap = (a: ReturnType<typeof groupBox>, b: ReturnType<typeof groupBox>): boolean =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const boxContains = (outer: ReturnType<typeof groupBox>, inner: ReturnType<typeof groupBox>): boolean =>
    inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom;
  const containsPoint = (box: ReturnType<typeof groupBox>, x: number, y: number): boolean =>
    x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;

  it('nests every group inside its own superGroup, never splitting one across two', () => {
    // No edges: with every node sharing one rank, the plain (non-nested) group
    // banding would order bands purely by this array's interleaved A/B/A/B
    // arrival order, splitting the two superGroups apart from each other.
    const nodes: LayoutNodeSpec[] = [
      { id: 'a1', width: 90, height: 30, group: 'agg-a1', superGroup: 'BC-A' },
      { id: 'b1', width: 90, height: 30, group: 'agg-b1', superGroup: 'BC-B' },
      { id: 'a2', width: 90, height: 30, group: 'agg-a1', superGroup: 'BC-A' },
      { id: 'b2', width: 90, height: 30, group: 'agg-b1', superGroup: 'BC-B' },
      { id: 'a3', width: 90, height: 30, group: 'agg-a2', superGroup: 'BC-A' },
      { id: 'b3', width: 90, height: 30, group: 'agg-b2', superGroup: 'BC-B' },
    ];
    const result = layeredLayout(nodes, []);
    const boxBcA = groupBox(result, ['a1', 'a2', 'a3']);
    const boxBcB = groupBox(result, ['b1', 'b2', 'b3']);
    expect(boxesOverlap(boxBcA, boxBcB)).toBe(false);
    // Every aggregate's own box sits fully inside its BC's box.
    expect(boxContains(boxBcA, groupBox(result, ['a1', 'a2']))).toBe(true);
    expect(boxContains(boxBcA, groupBox(result, ['a3']))).toBe(true);
    expect(boxContains(boxBcB, groupBox(result, ['b1', 'b2']))).toBe(true);
    expect(boxContains(boxBcB, groupBox(result, ['b3']))).toBe(true);
  });

  it('keeps a superGroup isolated from a node with no superGroup, even sharing a rank', () => {
    const nodes: LayoutNodeSpec[] = [
      { id: 'a1', width: 80, height: 30, group: 'agg-a', superGroup: 'BC-A' },
      { id: 'a2', width: 80, height: 30, group: 'agg-a', superGroup: 'BC-A' },
      { id: 'solo', width: 80, height: 30 },
    ];
    const result = layeredLayout(nodes, []);
    const boxA = groupBox(result, ['a1', 'a2']);
    const solo = result.nodes.find((entry) => entry.id === 'solo');
    expect(containsPoint(boxA, (solo?.x ?? 0) + 1, (solo?.y ?? 0) + 1)).toBe(false);
  });

  it('adds extra room between two superGroups, via superGroupSpacing, on top of groupSpacing', () => {
    const nodes: LayoutNodeSpec[] = [
      { id: 'a1', width: 80, height: 30, group: 'agg-a', superGroup: 'BC-A' },
      { id: 'b1', width: 80, height: 30, group: 'agg-b', superGroup: 'BC-B' },
    ];
    const tight = layeredLayout(nodes, [], { groupSpacing: 10, superGroupSpacing: 10 });
    const loose = layeredLayout(nodes, [], { groupSpacing: 10, superGroupSpacing: 150 });
    expect(loose.height).toBeGreaterThan(tight.height);
  });

  it('matches the plain group layout exactly when no node declares a superGroup', () => {
    const nodes: LayoutNodeSpec[] = [
      { id: 'a1', width: 100, height: 40, group: 'A' },
      { id: 'a2', width: 100, height: 40, group: 'A' },
      { id: 'b1', width: 100, height: 40, group: 'B' },
      { id: 'b2', width: 100, height: 40, group: 'B' },
      { id: 'lone', width: 100, height: 40 },
    ];
    const edges: LayoutEdgeSpec[] = [
      edge('a1', 'b1'),
      edge('b1', 'a2'),
      edge('a2', 'b2'),
      edge('b2', 'lone'),
      edge('lone', 'a1'),
    ];
    const withDefaultSpacing = layeredLayout(nodes, edges);
    const withExplicitSuperSpacing = layeredLayout(nodes, edges, { superGroupSpacing: 999 });
    expect(withExplicitSuperSpacing).toEqual(withDefaultSpacing);
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

describe('applyPositionOverrides', () => {
  it('returns the same layout untouched when there are no overrides', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b')];
    const layout = layeredLayout(nodes, edges);
    expect(applyPositionOverrides(layout, new Map(), nodes, edges)).toBe(layout);
  });

  it('moves only the overridden node, leaving the rest at the computed layout', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('a', 'b'), edge('b', 'c')];
    const layout = layeredLayout(nodes, edges);
    const b = layout.nodes.find((entry) => entry.id === 'b');
    const result = applyPositionOverrides(layout, new Map([['b', { x: 500, y: 500 }]]), nodes, edges);
    const [ra, rb, rc] = ['a', 'b', 'c'].map((id) => result.nodes.find((entry) => entry.id === id));
    expect(ra).toEqual(layout.nodes.find((entry) => entry.id === 'a'));
    expect(rc).toEqual(layout.nodes.find((entry) => entry.id === 'c'));
    expect(rb).toMatchObject({ x: 500, y: 500, width: b?.width, height: b?.height });
  });

  it('re-routes edges to follow a moved node', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b')];
    const layout = layeredLayout(nodes, edges);
    const result = applyPositionOverrides(layout, new Map([['b', { x: 900, y: 900 }]]), nodes, edges);
    const route = result.routes.find((entry) => entry.id === 'a-b');
    expect(route?.points.at(-1)).toEqual({ x: 900, y: 900 + 30 });
  });

  it('grows the bounding box to cover a node dragged outside the original layout', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b')];
    const layout = layeredLayout(nodes, edges);
    const result = applyPositionOverrides(layout, new Map([['b', { x: 2000, y: 2000 }]]), nodes, edges);
    expect(result.width).toBeGreaterThan(layout.width);
    expect(result.height).toBeGreaterThan(layout.height);
  });

  it('ignores an override for a node that is no longer in the layout', () => {
    const nodes = [node('a')];
    const edges: LayoutEdgeSpec[] = [];
    const layout = layeredLayout(nodes, edges);
    const result = applyPositionOverrides(layout, new Map([['missing', { x: 1, y: 1 }]]), nodes, edges);
    expect(result.nodes).toEqual(layout.nodes);
  });
});
