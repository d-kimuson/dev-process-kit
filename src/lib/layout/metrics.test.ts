import { describe, expect, it } from 'vitest';

import { METRIC_WEIGHTS, scoreLayout, type LayoutGeometry } from './metrics';

const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe('scoreLayout', () => {
  it('scores a trivial two-node, one-edge layout as clean: no crossings, no through-node, no overlaps', () => {
    const geometry: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 100, 50) },
        { id: 'b', box: box(200, 0, 100, 50) },
      ],
      edges: [
        {
          id: 'a-b',
          from: 'a',
          to: 'b',
          points: [
            { x: 100, y: 25 },
            { x: 200, y: 25 },
          ],
        },
      ],
    };
    const result = scoreLayout(geometry);
    expect(result.crossings).toBe(0);
    expect(result.edgeThroughNode).toEqual({ incidents: 0, length: 0 });
    expect(result.frameViolations).toBe(0);
    expect(result.overlaps).toBe(0);
    expect(result.totalEdgeLength).toBe(100);
    expect(result.totalBends).toBe(0);
  });

  it('counts a single crossing between two edges that cross each other', () => {
    // An explicit X: one purely vertical edge, one purely horizontal edge, intersecting mid-way.
    const geometry: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 40, 10, 10) },
        { id: 'b', box: box(190, 40, 10, 10) },
        { id: 'c', box: box(45, 0, 10, 10) },
        { id: 'd', box: box(45, 190, 10, 10) },
      ],
      edges: [
        {
          id: 'a-b',
          from: 'a',
          to: 'b',
          points: [
            { x: 10, y: 45 },
            { x: 200, y: 45 },
          ],
        },
        {
          id: 'c-d',
          from: 'c',
          to: 'd',
          points: [
            { x: 50, y: 10 },
            { x: 50, y: 200 },
          ],
        },
      ],
    };
    expect(scoreLayout(geometry).crossings).toBe(1);
  });

  it('counts an edge-through-node incident and the length spent inside that node', () => {
    const geometry: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 10, 10) },
        { id: 'blocker', box: box(40, 0, 20, 10) },
        { id: 'b', box: box(100, 0, 10, 10) },
      ],
      edges: [
        {
          id: 'a-b',
          from: 'a',
          to: 'b',
          points: [
            { x: 10, y: 5 },
            { x: 100, y: 5 },
          ],
        },
      ],
    };
    const result = scoreLayout(geometry);
    expect(result.edgeThroughNode.incidents).toBe(1);
    expect(result.edgeThroughNode.length).toBe(20); // the blocker's width, entirely inside the straight line
  });

  it('does not flag an edge passing through its own endpoint node', () => {
    const geometry: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 50, 10) },
        { id: 'b', box: box(100, 0, 10, 10) },
      ],
      // Starts from inside `a`'s box (e.g. a port on its right edge) — not a violation of `a` itself.
      edges: [
        {
          id: 'a-b',
          from: 'a',
          to: 'b',
          points: [
            { x: 50, y: 5 },
            { x: 100, y: 5 },
          ],
        },
      ],
    };
    const result = scoreLayout(geometry);
    expect(result.edgeThroughNode.incidents).toBe(0);
  });

  it('counts a frame violation when an edge crosses a frame that owns neither endpoint', () => {
    const geometry: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 10, 10) },
        { id: 'b', box: box(200, 0, 10, 10) },
        { id: 'inner', box: box(90, 0, 10, 10) },
      ],
      edges: [
        {
          id: 'a-b',
          from: 'a',
          to: 'b',
          points: [
            { x: 10, y: 5 },
            { x: 200, y: 5 },
          ],
        },
      ],
      frames: [{ id: 'frame-1', box: box(80, -10, 40, 30), members: ['inner'] }],
    };
    const result = scoreLayout(geometry);
    expect(result.frameViolations).toBe(1);
  });

  it('does not count a frame violation when the edge belongs to a node inside that frame', () => {
    const geometry: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(90, 0, 10, 10) },
        { id: 'b', box: box(200, 0, 10, 10) },
      ],
      edges: [
        {
          id: 'a-b',
          from: 'a',
          to: 'b',
          points: [
            { x: 100, y: 5 },
            { x: 200, y: 5 },
          ],
        },
      ],
      frames: [{ id: 'frame-1', box: box(80, -10, 40, 30), members: ['a'] }],
    };
    const result = scoreLayout(geometry);
    expect(result.frameViolations).toBe(0);
  });

  it('counts node/frame overlaps and keeps the weight dominant', () => {
    const overlapping: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 20, 20) },
        { id: 'b', box: box(10, 10, 20, 20) },
      ],
      edges: [],
    };
    const result = scoreLayout(overlapping);
    expect(result.overlaps).toBe(1);
    expect(result.total).toBeGreaterThanOrEqual(METRIC_WEIGHTS.overlaps);
  });

  it('reports zero overlaps for cleanly separated nodes', () => {
    const clean: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 20, 20) },
        { id: 'b', box: box(100, 0, 20, 20) },
      ],
      edges: [],
    };
    expect(scoreLayout(clean).overlaps).toBe(0);
  });

  it('does not flag a frame overlapping its own nested member node', () => {
    const geometry: LayoutGeometry = {
      nodes: [{ id: 'a', box: box(10, 10, 20, 20) }],
      edges: [],
      frames: [{ id: 'frame', box: box(0, 0, 50, 50), members: ['a'] }],
    };
    expect(scoreLayout(geometry).overlaps).toBe(0);
  });

  it('counts bends as points.length - 2 per edge', () => {
    const geometry: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 10, 10) },
        { id: 'b', box: box(100, 100, 10, 10) },
      ],
      edges: [
        {
          id: 'a-b',
          from: 'a',
          to: 'b',
          points: [
            { x: 10, y: 5 },
            { x: 50, y: 5 },
            { x: 50, y: 105 },
            { x: 105, y: 105 },
          ],
        },
      ],
    };
    expect(scoreLayout(geometry).totalBends).toBe(2);
  });

  it('scores a wider-than-16:10 bounding box with positive aspect deviation', () => {
    const geometry: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 10, 10) },
        { id: 'b', box: box(990, 0, 10, 10) },
      ],
      edges: [],
    };
    const result = scoreLayout(geometry);
    expect(result.aspectDeviation).toBeGreaterThan(0);
  });

  it('scores near-zero aspect deviation for a 16:10 bounding box', () => {
    const geometry: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 10, 10) },
        { id: 'b', box: box(150, 90, 10, 10) },
      ],
      edges: [],
    };
    const result = scoreLayout(geometry);
    expect(result.aspectDeviation).toBeCloseTo(0, 1);
  });

  it('scores high wasted area for sparse nodes and low wasted area for tightly packed nodes', () => {
    const sparse: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 10, 10) },
        { id: 'b', box: box(990, 590, 10, 10) },
      ],
      edges: [],
    };
    const packed: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 50, 50) },
        { id: 'b', box: box(50, 0, 50, 50) },
      ],
      edges: [],
    };
    expect(scoreLayout(sparse).wastedArea).toBeGreaterThan(scoreLayout(packed).wastedArea);
    expect(scoreLayout(packed).wastedArea).toBeCloseTo(0, 5);
  });

  it('produces a total that increases when a hard violation (overlap) is introduced', () => {
    const clean: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 20, 20) },
        { id: 'b', box: box(100, 0, 20, 20) },
      ],
      edges: [
        {
          id: 'a-b',
          from: 'a',
          to: 'b',
          points: [
            { x: 20, y: 10 },
            { x: 100, y: 10 },
          ],
        },
      ],
    };
    const overlapping: LayoutGeometry = {
      nodes: [
        { id: 'a', box: box(0, 0, 20, 20) },
        { id: 'b', box: box(10, 0, 20, 20) },
      ],
      edges: [
        {
          id: 'a-b',
          from: 'a',
          to: 'b',
          points: [
            { x: 20, y: 10 },
            { x: 30, y: 10 },
          ],
        },
      ],
    };
    expect(scoreLayout(overlapping).total).toBeGreaterThan(scoreLayout(clean).total);
  });

  it('handles an empty layout without throwing', () => {
    const empty: LayoutGeometry = { nodes: [], edges: [] };
    expect(() => scoreLayout(empty)).not.toThrow();
  });
});
