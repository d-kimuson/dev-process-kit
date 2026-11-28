import { describe, expect, it } from 'vitest';

import { pathDataPoints } from '../../lib/layout/path-steps';
import { parseDiagram, type Diagram, type RawDiagram } from './model';
import { presentDiagram, type Box, type DiagramSizes } from './present';

const diagramOf = (raw: RawDiagram): Diagram => {
  const result = parseDiagram(raw);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.diagram;
};

const node = (id: string, extra: Record<string, string> = {}, group: string | null = null) => ({
  attributes: { id, ...extra },
  label: id,
  group,
});
const edge = (id: string, from: string, to: string, label = '', extra: Record<string, string> = {}) => ({
  attributes: { id, from, to, ...extra },
  label,
});

const sizes = (
  ids: readonly string[],
  chips: Record<string, { width: number; height: number }> = {},
): DiagramSizes => ({
  nodes: new Map(ids.map((id) => [id, { width: 120, height: 44 }])),
  chips: new Map(Object.entries(chips)),
});

const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('presentDiagram', () => {
  it('lays a chain out left to right, each line running from one box to the next', () => {
    const diagram = diagramOf({
      attributes: { id: 'd' },
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')],
      groups: [],
      nestedGroups: [],
    });
    const view = presentDiagram(diagram, sizes(['a', 'b', 'c']));
    const [a, b, c] = view.nodes;
    expect(a!.x + a!.width).toBeLessThan(b!.x);
    expect(b!.x + b!.width).toBeLessThan(c!.x);
    const ab = pathDataPoints(view.edges[0]!.d);
    expect(ab[0]!.x).toBeCloseTo(a!.x + a!.width, 0);
    expect(view.edges[0]!.ends.map((end) => end.side)).toEqual(['end']);
    expect(view.width).toBeGreaterThanOrEqual(c!.x + c!.width);
  });

  it('stacks the chain top to bottom when the direction is down', () => {
    const diagram = diagramOf({
      attributes: { id: 'd', direction: 'down' },
      nodes: [node('a'), node('b')],
      edges: [edge('ab', 'a', 'b')],
      groups: [],
      nestedGroups: [],
    });
    const [a, b] = presentDiagram(diagram, sizes(['a', 'b'])).nodes;
    expect(a!.width).toBe(120);
    expect(a!.y + a!.height).toBeLessThan(b!.y);
  });

  it('puts grid nodes in their cells and routes around a node in the way', () => {
    const diagram = diagramOf({
      attributes: { id: 'd', layout: 'grid' },
      nodes: [node('a', { col: '0', row: '0' }), node('m', { col: '1', row: '0' }), node('z', { col: '2', row: '0' })],
      edges: [edge('az', 'a', 'z')],
      groups: [],
      nestedGroups: [],
    });
    const view = presentDiagram(diagram, sizes(['a', 'm', 'z']));
    const m = view.nodes.find((box) => box.id === 'm')!;
    const points = pathDataPoints(view.edges[0]!.d);
    const crossesM = points.some((p, i) => {
      const q = points[i + 1];
      if (q === undefined) return false;
      const box = {
        x: Math.min(p.x, q.x),
        y: Math.min(p.y, q.y),
        width: Math.abs(q.x - p.x) + 0.1,
        height: Math.abs(q.y - p.y) + 0.1,
      };
      return overlaps(box, m);
    });
    expect(crossesM).toBe(false);
  });

  it('frames a group around its members only', () => {
    const diagram = diagramOf({
      attributes: { id: 'd' },
      nodes: [node('a', {}, 'g'), node('b', {}, 'g'), node('c')],
      edges: [edge('ac', 'a', 'c'), edge('bc', 'b', 'c')],
      groups: [{ attributes: { id: 'g', label: 'G' } }],
      nestedGroups: [],
    });
    const view = presentDiagram(diagram, sizes(['a', 'b', 'c']));
    const frame = view.frames[0]!;
    const inside = (box: Box) =>
      box.x > frame.x &&
      box.y > frame.y &&
      box.x + box.width < frame.x + frame.width &&
      box.y + box.height < frame.y + frame.height;
    expect(view.nodes.filter(inside).map((box) => box.id)).toEqual(['a', 'b']);
    expect(frame.y).toBeGreaterThan(0);
  });

  it('places label chips clear of the nodes and of each other', () => {
    const diagram = diagramOf({
      attributes: { id: 'd' },
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('ab', 'a', 'b', 'calls'), edge('ac', 'a', 'c', 'notifies')],
      groups: [],
      nestedGroups: [],
    });
    const view = presentDiagram(
      diagram,
      sizes(['a', 'b', 'c'], { ab: { width: 52, height: 22 }, ac: { width: 70, height: 22 } }),
    );
    const chips = view.edges.map((item) => item.chip!);
    expect(overlaps(chips[0]!, chips[1]!)).toBe(false);
    for (const chip of chips) for (const box of view.nodes) expect(overlaps(chip, box)).toBe(false);
  });

  it('jumps a crossing line only when crossings are jump', () => {
    const raw = (crossings: string): RawDiagram => ({
      attributes: { id: 'd', layout: 'grid', crossings },
      nodes: [
        node('w', { col: '0', row: '1' }),
        node('e', { col: '2', row: '1' }),
        node('n', { col: '1', row: '0' }),
        node('s', { col: '1', row: '2' }),
      ],
      edges: [edge('we', 'w', 'e'), edge('ns', 'n', 's')],
      groups: [],
      nestedGroups: [],
    });
    const arcs = (crossings: string) =>
      presentDiagram(diagramOf(raw(crossings)), sizes(['w', 'e', 'n', 's']))
        .edges.map((item) => item.d)
        .join(' ')
        .match(/A/g)?.length ?? 0;
    expect(arcs('jump')).toBeGreaterThan(0);
    expect(arcs('plain')).toBe(0);
  });

  it('keeps two groups in consecutive layers side by side, not stacked diagonally', () => {
    const diagram = diagramOf({
      attributes: { id: 'd' },
      nodes: [node('a', {}, 'left'), node('b', {}, 'left'), node('c', {}, 'right'), node('e', {}, 'right')],
      edges: [edge('ac', 'a', 'c'), edge('be', 'b', 'e')],
      groups: [{ attributes: { id: 'left' } }, { attributes: { id: 'right' } }],
      nestedGroups: [],
    });
    const view = presentDiagram(diagram, sizes(['a', 'b', 'c', 'e']));
    const [left, right] = view.frames;
    expect(left!.y).toBe(right!.y);
    expect(left!.x + left!.width).toBeLessThan(right!.x);
  });

  it('arches a line over the node standing between its ends', () => {
    const diagram = diagramOf({
      attributes: { id: 'd' },
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('ac', 'a', 'c')],
      groups: [],
      nestedGroups: [],
    });
    const view = presentDiagram(diagram, sizes(['a', 'b', 'c']));
    const b = view.nodes.find((box) => box.id === 'b')!;
    const skip = view.edges.find((line) => line.id === 'ac')!;
    const points = pathDataPoints(skip.d);
    expect(Math.min(...points.map((point) => point.y))).toBeLessThan(b.y);
    expect(points.every((point) => !overlaps({ ...point, width: 0, height: 0 }, b))).toBe(true);
  });
});
