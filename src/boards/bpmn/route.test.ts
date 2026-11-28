import { describe, expect, it } from 'vitest';

import type { LayoutPoint, LayoutResult } from '../../lib/layout/layered';

import { edgeReach } from '../../components/diagram/edge';
import { bpmnPlacement, type BpmnBands } from './layout';
import { flowSpec } from './markers';
import { parseBpmnData, type BpmnData } from './model';
import { bpmnFlowLabelPoint, bpmnNodeLabelBox, withBpmnRoutes } from './route';
import { flowLabelSize, nodeShape } from './shapes';

const raw = {
  pools: [
    { id: 'customer', name: '顧客' },
    {
      id: 'shop',
      name: 'EC サイト',
      lanes: [
        { id: 'cs', name: '受注' },
        { id: 'wh', name: '倉庫' },
      ],
    },
  ],
  nodes: [
    { id: 'start', kind: 'event', event: 'start', trigger: 'message', lane: 'cs', name: '注文受信' },
    { id: 'check', kind: 'task', task: 'service', lane: 'cs', name: '在庫を確認' },
    { id: 'gw', kind: 'gateway', lane: 'cs', name: '在庫あり?' },
    { id: 'ship', kind: 'task', task: 'user', lane: 'wh', name: '出荷' },
    { id: 'sorry', kind: 'task', task: 'send', lane: 'cs', name: '欠品を連絡' },
    { id: 'done', kind: 'event', event: 'end', lane: 'wh' },
    { id: 'note', kind: 'annotation', text: '在庫は 5 分ごとに同期' },
  ],
  flows: [
    { id: 'f1', from: 'start', to: 'check' },
    { id: 'f2', from: 'check', to: 'gw' },
    { id: 'f3', from: 'gw', to: 'ship', condition: '在庫あり' },
    { id: 'f4', from: 'gw', to: 'sorry', default: true, name: 'それ以外' },
    { id: 'f5', from: 'ship', to: 'done' },
    { id: 'm1', kind: 'message', from: 'customer', to: 'start', name: '注文' },
    { id: 'm2', kind: 'message', from: 'sorry', to: 'customer', name: '欠品通知' },
    { id: 'a1', kind: 'association', from: 'note', to: 'check' },
  ],
};

type Built = { data: BpmnData; layout: LayoutResult; bands: BpmnBands };

const build = (input: unknown = raw): Built => {
  const data = parseBpmnData(input);
  const { placement, bands } = bpmnPlacement(data);
  return { data, layout: withBpmnRoutes(placement, data, bands), bands };
};

const routeOf = (built: Built, id: string): readonly LayoutPoint[] => {
  const route = built.layout.routes.find((candidate) => candidate.id === id);
  if (route === undefined) throw new Error(`missing route ${id}`);
  return route.points;
};

const placedOf = (built: Built, id: string) => {
  const node = built.layout.nodes.find((candidate) => candidate.id === id);
  if (node === undefined) throw new Error(`missing node ${id}`);
  return node;
};

const segmentsOf = (points: readonly LayoutPoint[]): (readonly [LayoutPoint, LayoutPoint])[] =>
  points.slice(1).map((point, index) => [points[index]!, point] as const);

const segmentEnters = (
  segment: readonly [LayoutPoint, LayoutPoint],
  box: { x: number; y: number; width: number; height: number },
): boolean => {
  const [a, b] = segment;
  return (
    Math.max(a.x, b.x) > box.x + 0.01 &&
    Math.min(a.x, b.x) < box.x + box.width - 0.01 &&
    Math.max(a.y, b.y) > box.y + 0.01 &&
    Math.min(a.y, b.y) < box.y + box.height - 0.01
  );
};

const onOutline = (built: Built, id: string, point: LayoutPoint): boolean => {
  const node = built.data.nodes.find((candidate) => candidate.id === id);
  const placed = placedOf(built, id);
  if (node === undefined) return false;
  const shape = nodeShape(node);
  const cx = placed.x + placed.width / 2;
  const cy = placed.y + placed.height / 2;
  const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1.5;
  if (shape === 'circle') {
    const rx = placed.width / 2;
    const ry = placed.height / 2;
    return Math.abs(((point.x - cx) / rx) ** 2 + ((point.y - cy) / ry) ** 2 - 1) <= 0.12;
  }
  if (shape === 'diamond') {
    return (
      Math.abs(Math.abs(point.x - cx) / (placed.width / 2) + Math.abs(point.y - cy) / (placed.height / 2) - 1) <= 0.12
    );
  }
  const nearX = close(point.x, placed.x) || close(point.x, placed.x + placed.width);
  const nearY = close(point.y, placed.y) || close(point.y, placed.y + placed.height);
  const inX = point.x >= placed.x - 1.5 && point.x <= placed.x + placed.width + 1.5;
  const inY = point.y >= placed.y - 1.5 && point.y <= placed.y + placed.height + 1.5;
  return (nearX && inY) || (nearY && inX);
};

const overlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  margin = 0,
): boolean =>
  a.x < b.x + b.width + margin &&
  a.x + a.width > b.x - margin &&
  a.y < b.y + b.height + margin &&
  a.y + a.height > b.y - margin;

describe('withBpmnRoutes', () => {
  const built = build();

  it('starts and ends every node flow on the node outlines', () => {
    const ids = new Set(built.data.nodes.map((node) => node.id));
    const nodeFlows = built.data.edges.filter((flow) => ids.has(flow.from) && ids.has(flow.to));
    expect(nodeFlows.length).toBeGreaterThan(0);
    for (const flow of nodeFlows) {
      const points = routeOf(built, flow.id);
      expect(points.length).toBeGreaterThanOrEqual(2);
      expect(onOutline(built, flow.from, points[0]!)).toBe(true);
      expect(onOutline(built, flow.to, points.at(-1)!)).toBe(true);
    }
  });

  it('pierces no node, including the ones it joins', () => {
    const bad: string[] = [];
    for (const flow of built.data.edges) {
      for (const segment of segmentsOf(routeOf(built, flow.id))) {
        for (const node of built.layout.nodes)
          if (segmentEnters(segment, node)) bad.push(`${flow.id} through ${node.id} ${JSON.stringify(segment)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps every sequence flow inside its own pool', () => {
    for (const flow of built.data.edges) {
      if (flow.kind !== 'sequence') continue;
      const source = built.data.nodes.find((node) => node.id === flow.from)!;
      const pool = built.bands.pools.find((band) => band.id === source.pool)!;
      for (const point of routeOf(built, flow.id)) {
        expect(point.y).toBeGreaterThanOrEqual(pool.y - 0.01);
        expect(point.y).toBeLessThanOrEqual(pool.y + pool.height + 0.01);
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(built.layout.width);
      }
    }
  });

  it('keeps every message’s horizontal runs in the gap between pools', () => {
    const pools = [...built.bands.pools].sort((a, b) => a.y - b.y);
    const gaps = pools.slice(1).map((pool, index) => [pools[index]!.y + pools[index]!.height, pool.y] as const);
    for (const flow of built.data.edges) {
      if (flow.kind !== 'message') continue;
      for (const [a, b] of segmentsOf(routeOf(built, flow.id))) {
        if (a.y !== b.y) continue;
        const inGap = gaps.some(([top, bottom]) => a.y > top && a.y < bottom);
        expect(inGap).toBe(true);
      }
    }
  });

  it('keeps a straight run under each end glyph', () => {
    const glyphFlows = built.data.edges
      .map((flow) => {
        const source = built.data.nodes.find((node) => node.id === flow.from) ?? null;
        return { flow, reach: edgeReach(flowSpec(flow, source)), points: routeOf(built, flow.id) };
      })
      .filter((entry) => entry.reach > 0 && entry.points.length > 2);
    expect(glyphFlows.length).toBeGreaterThan(0);
    for (const { reach, points } of glyphFlows) {
      const start = Math.hypot(points[1]!.x - points[0]!.x, points[1]!.y - points[0]!.y);
      const end = Math.hypot(points.at(-1)!.x - points.at(-2)!.x, points.at(-1)!.y - points.at(-2)!.y);
      expect(start).toBeGreaterThanOrEqual(reach - 0.51);
      expect(end).toBeGreaterThanOrEqual(reach - 0.51);
    }
  });

  it('places node labels below their node and flow labels clear of nodes, labels and glyphs', () => {
    const nodeBoxes = built.layout.nodes.map((node) => ({
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    }));
    const nodeLabels = built.data.nodes.flatMap((node) => {
      const box = bpmnNodeLabelBox(built.layout, node.id);
      return box === null ? [] : [box];
    });
    for (const box of nodeLabels) {
      for (const node of nodeBoxes) expect(overlap(box, node)).toBe(false);
      expect(box.y).toBeLessThan(built.layout.height);
    }
    for (const flow of built.data.edges) {
      const label = flow.label ?? flow.condition;
      const center = bpmnFlowLabelPoint(built.layout, flow.id);
      if (label === null || center === null) continue;
      const size = flowLabelSize(label);
      const box = {
        x: center.x - size.width / 2,
        y: center.y - size.height / 2,
        width: size.width,
        height: size.height,
      };
      for (const node of nodeBoxes) expect(overlap(box, node)).toBe(false);
      for (const other of nodeLabels) expect(overlap(box, other, 4)).toBe(false);
      for (const points of built.layout.routes.map((route) => route.points)) {
        for (const end of [points[0], points.at(-1)]) {
          if (end === undefined) continue;
          const zone = { x: end.x - 12, y: end.y - 12, width: 24, height: 24 };
          expect(overlap(box, zone)).toBe(false);
        }
      }
    }
  });

  it('is deterministic on the same data', () => {
    expect(build()).toEqual(built);
  });

  it('routes a backward sequence flow through a channel below its lane', () => {
    const input = {
      pools: [{ id: 'p', name: 'P', lanes: [{ id: 'l', name: 'L' }] }],
      nodes: [
        { id: 'a', kind: 'task', lane: 'l', name: 'A' },
        { id: 'b', kind: 'task', lane: 'l', name: 'B' },
      ],
      flows: [
        { id: 'forward', from: 'a', to: 'b' },
        { id: 'back', from: 'b', to: 'a' },
      ],
    };
    const routed = build(input);
    const back = routeOf(routed, 'back');
    const a = placedOf(routed, 'a');
    const b = placedOf(routed, 'b');
    const lowest = Math.max(a.y + a.height, b.y + b.height);
    const horizontal = back.filter((point, index) => back[index + 1]?.y === point.y && back[index + 1]?.x !== point.x);
    expect(horizontal.length).toBeGreaterThan(0);
    expect(Math.min(...horizontal.map((point) => point.y))).toBeGreaterThan(lowest);
  });
});
