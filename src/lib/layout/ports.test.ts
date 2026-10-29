import { describe, expect, it } from 'vitest';

import { fanOffset, facingPortSide, staggeredEdgePorts, type FanNode } from './ports';

const node = (id: string, x: number, y: number, width = 100, height = 60): FanNode => ({ id, x, y, width, height });

describe('facingPortSide', () => {
  it('picks the dominant axis, right/left first on a tie', () => {
    const centre = node('a', 0, 0);
    expect(facingPortSide(centre, node('b', 300, 40))).toBe('right');
    expect(facingPortSide(centre, node('b', -300, 40))).toBe('left');
    expect(facingPortSide(centre, node('b', 10, 300))).toBe('bottom');
    expect(facingPortSide(centre, node('b', 10, -300))).toBe('top');
    // A card facing itself has no facing side; `right` keeps it deterministic.
    expect(facingPortSide(centre, centre)).toBe('right');
  });
});

describe('fanOffset', () => {
  it('centres one item, and fans several around the middle without leaving the range', () => {
    expect(fanOffset(0, 100, 1, 0, 16)).toBe(50);
    expect(fanOffset(0, 100, 3, 0, 16)).toBe(34);
    expect(fanOffset(0, 100, 3, 1, 16)).toBe(50);
    expect(fanOffset(0, 100, 3, 2, 16)).toBe(66);
  });

  it('pulls the gap in when the range cannot hold it', () => {
    // Three items, a 20px range, a 16px gap: they fit at 10px apart, still inside.
    expect([0, 1, 2].map((index) => fanOffset(0, 20, 3, index, 16))).toEqual([0, 10, 20]);
  });
});

describe('staggeredEdgePorts', () => {
  const hub = node('hub', 0, 0, 100, 120);
  const targets = [node('up', 300, -200), node('mid', 300, 30), node('down', 300, 300)];

  it('gives every edge its own point on the shared side, ordered by the other end', () => {
    const edges = targets.map((target) => ({ id: `hub-${target.id}`, from: 'hub', to: target.id }));
    const ports = staggeredEdgePorts([hub, ...targets], edges, { gap: 10, inset: 12 });
    const ys = edges.map((edge) => ports.get(edge.id)?.from.point.y ?? Number.NaN);
    // Fanning along the hub's right side, top to bottom in the reader's own order.
    expect(ys).toEqual([50, 60, 70]);
    expect(new Set(ys).size).toBe(3);
    for (const edge of edges) expect(ports.get(edge.id)?.from.point.x).toBe(100);
    expect(edges.map((edge) => ports.get(edge.id)?.from.side)).toEqual(['right', 'right', 'right']);
  });

  it('is stable when the edge list is given in another order', () => {
    const edges = targets.map((target) => ({ id: `hub-${target.id}`, from: 'hub', to: target.id }));
    const forward = staggeredEdgePorts([hub, ...targets], edges, { gap: 10 });
    const reversed = staggeredEdgePorts([hub, ...targets], [...edges].reverse(), { gap: 10 });
    expect([...reversed]).toEqual([...forward]);
  });

  it('keeps a short side’s ports inside it, even with more edges than the gap allows', () => {
    const short = node('short', 0, 0, 100, 26);
    // Far to the right, so every end still faces the short side's right edge.
    const far = [node('a', 2000, -300), node('b', 2000, 0), node('c', 2000, 300), node('d', 2000, 600)];
    const edges = far.map((target) => ({ id: `short-${target.id}`, from: 'short', to: target.id }));
    const ports = staggeredEdgePorts([short, ...far], edges, { gap: 16, inset: 12 });
    for (const edge of edges) {
      const y = ports.get(edge.id)?.from.point.y ?? Number.NaN;
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(26);
    }
    expect(new Set(edges.map((edge) => ports.get(edge.id)?.from.point.y)).size).toBe(4);
  });

  it('uses the side its caller asks for, on both ends', () => {
    const a = node('a', 0, 0);
    const b = node('b', 300, 0);
    const ports = staggeredEdgePorts([a, b], [{ id: 'a-b', from: 'a', to: 'b' }], {
      sideOf: ({ end }) => (end === 'from' ? 'bottom' : 'top'),
    });
    expect(ports.get('a-b')).toEqual({
      from: { point: { x: 50, y: 60 }, side: 'bottom' },
      to: { point: { x: 350, y: 0 }, side: 'top' },
    });
  });

  it('skips edges whose endpoints are not both placed', () => {
    const ports = staggeredEdgePorts([hub], [{ id: 'hub-gone', from: 'hub', to: 'gone' }]);
    expect(ports.size).toBe(0);
  });

  it('separates the two ends of a self-edge on one side instead of stacking them', () => {
    const ports = staggeredEdgePorts([hub], [{ id: 'loop', from: 'hub', to: 'hub' }], { gap: 16 });
    const ends = ports.get('loop');
    expect(ends?.from.side).toBe('right');
    expect(ends?.to.side).toBe('right');
    expect(ends?.from.point.y).not.toBe(ends?.to.point.y);
  });
});
