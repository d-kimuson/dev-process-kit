import { describe, expect, it } from 'vitest';

import { parseBpmnData, type BpmnNode, type BpmnTaskNode } from './model';
import { DATA_OBJECT_SIZE, EVENT_SIZE, GATEWAY_SIZE, TASK_WIDTH } from './shapes';

/** The design's minimal order-handling example: two pools, lanes, all three flow kinds. */
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

const byId = (nodes: readonly BpmnNode[], id: string): BpmnNode => {
  const node = nodes.find((candidate) => candidate.id === id);
  if (node === undefined) throw new Error(`missing ${id}`);
  return node;
};

describe('parseBpmnData', () => {
  it('parses the design example, with pools, lanes and both pool ends of a message', () => {
    const data = parseBpmnData(raw);
    expect(data.pools.map((pool) => pool.id)).toEqual(['customer', 'shop']);
    expect(data.nodes).toHaveLength(7);
    expect(data.edges).toHaveLength(8);
    expect(byId(data.nodes, 'check')).toMatchObject({ kind: 'task', pool: 'shop', lane: 'cs', name: '在庫を確認' });
    expect(byId(data.nodes, 'note')).toMatchObject({ kind: 'annotation', lane: null, pool: null });
    expect(data.edges.find((edge) => edge.id === 'm1')).toMatchObject({ kind: 'message', label: '注文' });
    expect(data.edges.find((edge) => edge.id === 'f4')).toMatchObject({ isDefault: true, label: 'それ以外' });
    expect(data.edges.find((edge) => edge.id === 'f3')).toMatchObject({ condition: '在庫あり', label: '在庫あり' });
  });

  it('sizes events, gateways, tasks and data objects at parse time', () => {
    const parsed = parseBpmnData({
      pools: [{ id: 'p', name: 'P' }],
      nodes: [
        { id: 'e', kind: 'event', event: 'start', lane: 'p', name: 'go' },
        { id: 'g', kind: 'gateway', lane: 'p' },
        { id: 't', kind: 'task', lane: 'p', name: 'a short task' },
        { id: 'd', kind: 'dataObject', lane: 'p', name: 'record' },
      ],
      flows: [{ id: 'a', kind: 'association', from: 'd', to: 't' }],
    });
    expect(byId(parsed.nodes, 'e')).toMatchObject({ width: EVENT_SIZE, height: EVENT_SIZE });
    expect(byId(parsed.nodes, 'g')).toMatchObject({ width: GATEWAY_SIZE, height: GATEWAY_SIZE });
    expect(byId(parsed.nodes, 't')).toMatchObject({ width: TASK_WIDTH, height: 72 });
    expect(byId(parsed.nodes, 'd')).toMatchObject(DATA_OBJECT_SIZE);
  });

  it('grows a task for a four-line name, up to its own limit', () => {
    const name = 'とても長い業務タスクの名前がここに入り、四行まで折り返して表示されることを確かめるための文章';
    const parsed = parseBpmnData({
      pools: [{ id: 'p', name: 'P' }],
      nodes: [{ id: 't', kind: 'task', lane: 'p', name }],
    });
    expect((byId(parsed.nodes, 't') as BpmnTaskNode).height).toBe(80);
  });

  it('treats a pool without lanes as an implicit lane, and its nodes name the pool as lane', () => {
    const parsed = parseBpmnData({
      pools: [{ id: 'only', name: 'Only' }],
      nodes: [
        { id: 's', kind: 'event', event: 'start', lane: 'only' },
        { id: 'e', kind: 'event', event: 'end', lane: 'only' },
      ],
      flows: [{ id: 'f', from: 's', to: 'e' }],
    });
    expect(byId(parsed.nodes, 's')).toMatchObject({ lane: 'only', pool: 'only' });
  });

  describe('validation', () => {
    const base = (overrides: Record<string, unknown>) => ({ ...raw, ...overrides });
    const flow = (overrides: Record<string, unknown>) => ({
      ...raw,
      flows: [...raw.flows, { id: 'extra', from: 'check', to: 'sorry', ...overrides }],
    });
    const node = (overrides: Record<string, unknown>) => ({
      ...raw,
      nodes: [...raw.nodes, { id: 'extra', kind: 'task', lane: 'cs', name: 'extra', ...overrides }],
    });

    it('rejects a duplicate id across pools, lanes, nodes and flows', () => {
      expect(() => parseBpmnData(base({ pools: [...raw.pools, { id: 'start', name: 'dup' }] }))).toThrow(
        /duplicate id: start/,
      );
      expect(() => parseBpmnData(node({ id: 'f1' }))).toThrow(/duplicate id: f1/);
    });

    it('rejects a node in an unknown lane, or in a pool that has lanes', () => {
      expect(() => parseBpmnData(node({ lane: 'nope' }))).toThrow(/unknown lane: nope/);
      expect(() => parseBpmnData(node({ lane: 'shop' }))).toThrow(/pool with lanes/);
    });

    it('rejects a sequence flow that spans pools, starts at nothing, or leaves an end', () => {
      expect(() =>
        parseBpmnData({
          ...raw,
          nodes: [...raw.nodes, { id: 'custTask', kind: 'task', lane: 'customer', name: '顧客側' }],
          flows: [...raw.flows, { id: 'bad', kind: 'sequence', from: 'check', to: 'custTask' }],
        }),
      ).toThrow(/leaves its pool/);
      expect(() => parseBpmnData(flow({ id: 'bad', from: 'check', to: 'nope' }))).toThrow(/unknown flow target/);
      expect(() => parseBpmnData(flow({ id: 'bad', from: 'done', to: 'check' }))).toThrow(/leaves an end event/);
      expect(() => parseBpmnData(flow({ id: 'bad', from: 'check', to: 'start' }))).toThrow(/enters a start event/);
    });

    it('rejects a default on an event or a second default from one source', () => {
      expect(() => parseBpmnData(flow({ id: 'bad', from: 'start', to: 'check', default: true }))).toThrow(
        /cannot own one/,
      );
      expect(() =>
        parseBpmnData({
          ...raw,
          flows: [...raw.flows, { id: 'bad', from: 'gw', to: 'check', default: true }],
        }),
      ).toThrow(/more than one default/);
    });

    it('rejects a message that stays in one pool or ends at a gateway', () => {
      expect(() => parseBpmnData(flow({ id: 'bad', kind: 'message', from: 'check', to: 'ship' }))).toThrow(
        /stays inside one pool/,
      );
      expect(() => parseBpmnData(flow({ id: 'bad', kind: 'message', from: 'gw', to: 'customer' }))).toThrow(
        /starts at a gateway/,
      );
    });

    it('rejects an association with no artifact and a default or condition on a non-sequence flow', () => {
      expect(() => parseBpmnData(flow({ id: 'bad', kind: 'association', from: 'check', to: 'ship' }))).toThrow(
        /joins no artifact/,
      );
      expect(() =>
        parseBpmnData(flow({ id: 'bad', kind: 'association', from: 'note', to: 'check', condition: 'x' })),
      ).toThrow(/cannot be default/);
      expect(() =>
        parseBpmnData(flow({ id: 'bad', kind: 'message', from: 'sorry', to: 'customer', default: true })),
      ).toThrow(/cannot be default or conditional/);
    });

    it('rejects an error trigger off an end event, and a timer that is not catching', () => {
      expect(() => parseBpmnData(node({ kind: 'event', event: 'intermediate', trigger: 'error', lane: 'cs' }))).toThrow(
        /error is only an end event trigger/,
      );
      expect(() =>
        parseBpmnData(
          node({ id: 'timer', kind: 'event', event: 'intermediate', direction: 'throw', trigger: 'timer', lane: 'cs' }),
        ),
      ).toThrow(/timer is only a catching trigger/);
    });

    it('rejects a lane-less artifact without an association to a laned node', () => {
      expect(() =>
        parseBpmnData({
          pools: raw.pools,
          nodes: [...raw.nodes, { id: 'orphan', kind: 'dataObject', name: 'orphan' }],
        }),
      ).toThrow(/needs a lane or an association to a laned node/);
    });

    it('rejects an unknown structural shape', () => {
      expect(() => parseBpmnData({ pools: [] })).toThrow();
      expect(() => parseBpmnData({ pools: [{ id: 'p', name: 'P' }], nodes: [{ id: 'x', kind: 'loop' }] })).toThrow();
    });
  });
});
