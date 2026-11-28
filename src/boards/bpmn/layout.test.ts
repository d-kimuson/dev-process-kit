import { describe, expect, it } from 'vitest';

import { bpmnPlacement, BPMN_BLACK_BOX_HEIGHT } from './layout';
import { parseBpmnData, type BpmnNode } from './model';
import { nodeShape, outlinePoint, type BpmnShape } from './shapes';

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

const data = parseBpmnData(raw);
const layout = bpmnPlacement(data);
const nodeOf = (id: string): BpmnNode => {
  const node = data.nodes.find((candidate) => candidate.id === id);
  if (node === undefined) throw new Error(`missing ${id}`);
  return node;
};
const placedOf = (id: string) => {
  const node = layout.placement.nodes.find((candidate) => candidate.id === id);
  if (node === undefined) throw new Error(`unplaced ${id}`);
  return node;
};

describe('bpmnPlacement without routes', () => {
  it('keeps pools and lanes in author order', () => {
    expect(layout.bands.pools.map((pool) => pool.id)).toEqual(['customer', 'shop']);
    expect(layout.bands.pools[1]!.lanes.map((lane) => lane.id)).toEqual(['cs', 'wh']);
  });

  it('makes every band disjoint, and keeps a node inside its own lane', () => {
    const pools = layout.bands.pools;
    for (let index = 0; index + 1 < pools.length; index++) {
      expect(pools[index]!.y + pools[index]!.height).toBeLessThan(pools[index + 1]!.y);
    }
    for (const pool of pools) {
      const lanes = pool.lanes;
      for (let index = 0; index + 1 < lanes.length; index++) {
        expect(lanes[index]!.y + lanes[index]!.height).toBe(lanes[index + 1]!.y);
      }
      for (const lane of lanes) {
        expect(lane.y).toBeGreaterThanOrEqual(pool.y);
        expect(lane.y + lane.height).toBeLessThanOrEqual(pool.y + pool.height);
      }
    }
    for (const node of data.nodes) {
      if (node.lane === null) continue;
      const lane = pools.flatMap((pool) => pool.lanes).find((candidate) => candidate.id === node.lane);
      if (lane === undefined) continue;
      const placed = placedOf(node.id);
      expect(placed.y).toBeGreaterThanOrEqual(lane.y - 0.001);
      expect(placed.y + placed.height).toBeLessThanOrEqual(lane.y + lane.height + 0.001);
    }
  });

  it('increases x along every forward sequence flow', () => {
    for (const flow of data.edges) {
      if (flow.kind !== 'sequence') continue;
      const from = data.nodes.find((node) => node.id === flow.from);
      const to = data.nodes.find((node) => node.id === flow.to);
      if (from === undefined || to === undefined) continue;
      expect(placedOf(to.id).x).toBeGreaterThan(placedOf(from.id).x);
    }
  });

  it('keeps nodes at the same row index on one centre line', () => {
    const centres = ['start', 'check', 'gw'].map((id) => {
      const placed = placedOf(id);
      return placed.y + placed.height / 2;
    });
    expect(Math.max(...centres) - Math.min(...centres)).toBeLessThan(0.01);
    const tall = placedOf('ship');
    const short = placedOf('done');
    expect(tall.x).toBeLessThan(short.x);
  });

  it('makes a pool with no lanes and no nodes a 56px black box', () => {
    const customer = layout.bands.pools.find((pool) => pool.id === 'customer')!;
    expect(customer).toMatchObject({ blackBox: true, height: BPMN_BLACK_BOX_HEIGHT, lanes: [] });
  });

  it('places an annotation in the lane of the node its association names', () => {
    const note = placedOf('note');
    const cs = layout.bands.pools[1]!.lanes[0]!;
    expect(note.y).toBeGreaterThanOrEqual(cs.y);
    expect(note.y + note.height).toBeLessThanOrEqual(cs.y + cs.height);
  });

  it('reserves a column wide enough for a node label and a gap for a flow label', () => {
    expect(layout.placement.width).toBeGreaterThan(layout.bands.contentLeft);
    const start = placedOf('start');
    const check = placedOf('check');
    expect(check.x - (start.x + start.width)).toBeGreaterThan(60);
  });

  it('is deterministic', () => {
    const again = bpmnPlacement(data);
    expect(again).toEqual(layout);
  });
});

describe('outlinePoint', () => {
  const box = { x: 10, y: 20, width: 40, height: 60 };
  const close = (a: number, b: number): boolean => Math.abs(a - b) <= 0.01;

  const onOutline = (shape: BpmnShape, side: 'left' | 'right' | 'top' | 'bottom', along: number): boolean => {
    const p = outlinePoint(shape, box, side, along);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    if (shape === 'circle') {
      const rx = (box.width / 2) * 0.999;
      const ry = (box.height / 2) * 0.999;
      return close(((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2, 1);
    }
    if (shape === 'diamond') {
      return close(Math.abs(p.x - cx) / (box.width / 2) + Math.abs(p.y - cy) / (box.height / 2), 1);
    }
    if (shape === 'bracket') return close(p.x, box.x);
    // Rounded box and document: the point sits on the named edge, inside its span.
    if (side === 'left') return close(p.x, box.x) && p.y >= box.y - 0.01 && p.y <= box.y + box.height + 0.01;
    if (side === 'right')
      return close(p.x, box.x + box.width) && p.y >= box.y - 0.01 && p.y <= box.y + box.height + 0.01;
    if (side === 'top') return close(p.y, box.y) && p.x >= box.x - 0.01 && p.x <= box.x + box.width + 0.01;
    return close(p.y, box.y + box.height) && p.x >= box.x - 0.01 && p.x <= box.x + box.width + 0.01;
  };

  it.each(['circle', 'diamond', 'roundRect', 'document', 'bracket'] as const)(
    '%s points lie on the outline',
    (shape) => {
      for (const side of ['left', 'right', 'top', 'bottom'] as const) {
        for (const along of [-100, -20, -5, 0, 5, 20, 100]) expect(onOutline(shape, side, along)).toBe(true);
      }
    },
  );

  it('never puts a document port on its folded right corner', () => {
    const p = outlinePoint('document', box, 'right', 1000);
    expect(p.y).toBeLessThanOrEqual(box.y + box.height - 10 + 0.001);
  });

  it('maps a node kind to its outline', () => {
    expect(nodeShape(nodeOf('start'))).toBe('circle');
    expect(nodeShape(nodeOf('gw'))).toBe('diamond');
    expect(nodeShape(nodeOf('check'))).toBe('roundRect');
    expect(nodeShape(nodeOf('note'))).toBe('bracket');
  });
});
