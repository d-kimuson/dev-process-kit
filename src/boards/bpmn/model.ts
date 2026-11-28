import * as v from 'valibot';

import type { DiagramEdgeInput, DiagramNodeInput } from '../base/model';

import {
  annotationHeight,
  annotationLabelLines,
  DATA_OBJECT_SIZE,
  EVENT_SIZE,
  GATEWAY_SIZE,
  taskHeight,
  TASK_WIDTH,
  ANNOTATION_WIDTH,
} from './shapes';

/**
 * Domain model of the BPMN board. The JSON child is external input, so the
 * shape is validated strictly: every id is unique across pools, lanes, nodes
 * and flows, every lane resolves, and every flow obeys the BPMN rule its kind
 * carries.
 */

export type BpmnEventType = 'start' | 'intermediate' | 'end';
export type BpmnTrigger = 'none' | 'message' | 'timer' | 'error';
export type BpmnDirection = 'catch' | 'throw';
export type BpmnTaskType = 'none' | 'user' | 'service' | 'manual' | 'send' | 'receive' | 'script';
export type BpmnGatewayType = 'exclusive' | 'parallel' | 'inclusive' | 'eventBased';
export type BpmnFlowKind = 'sequence' | 'message' | 'association';
export type BpmnAssociationDirection = 'none' | 'one';

export type BpmnLane = { readonly id: string; readonly name: string; readonly questions: string | null };
export type BpmnPool = {
  readonly id: string;
  readonly name: string;
  readonly lanes: readonly BpmnLane[];
  readonly questions: string | null;
};

type NodeBase = DiagramNodeInput & {
  readonly lane: string | null;
  readonly pool: string | null;
  readonly name: string | null;
  readonly description: string | null;
};

export type BpmnEventNode = NodeBase & {
  readonly kind: 'event';
  readonly event: BpmnEventType;
  readonly trigger: BpmnTrigger;
  readonly direction: BpmnDirection | null;
};

export type BpmnTaskNode = NodeBase & { readonly kind: 'task'; readonly task: BpmnTaskType };

export type BpmnSubprocessNode = NodeBase & { readonly kind: 'subprocess' };

export type BpmnGatewayNode = NodeBase & { readonly kind: 'gateway'; readonly gateway: BpmnGatewayType };

export type BpmnDataObjectNode = NodeBase & { readonly kind: 'dataObject' };

export type BpmnAnnotationNode = NodeBase & {
  readonly kind: 'annotation';
  readonly text: string;
  readonly lines: readonly string[];
};

export type BpmnNode =
  | BpmnEventNode
  | BpmnTaskNode
  | BpmnSubprocessNode
  | BpmnGatewayNode
  | BpmnDataObjectNode
  | BpmnAnnotationNode;

export type BpmnFlow = DiagramEdgeInput & {
  readonly kind: BpmnFlowKind;
  /** `name`, or the guard when the flow only declares a condition. */
  readonly label: string | null;
  readonly condition: string | null;
  readonly isDefault: boolean;
  readonly direction: BpmnAssociationDirection;
};

export type BpmnData = {
  readonly pools: readonly BpmnPool[];
  readonly nodes: readonly BpmnNode[];
  readonly edges: readonly BpmnFlow[];
};

export const emptyBpmnData = (): BpmnData => ({ pools: [], nodes: [], edges: [] });

const laneSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  questions: v.optional(v.string()),
});

const poolSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  lanes: v.optional(v.array(laneSchema), []),
  questions: v.optional(v.string()),
});

const common = {
  tags: v.optional(v.array(v.string()), []),
  questions: v.optional(v.string()),
  description: v.optional(v.string()),
};

const nodeSchema = v.variant('kind', [
  v.strictObject({
    kind: v.literal('event'),
    id: v.pipe(v.string(), v.minLength(1)),
    lane: v.pipe(v.string(), v.minLength(1)),
    event: v.picklist(['start', 'intermediate', 'end']),
    trigger: v.optional(v.picklist(['none', 'message', 'timer', 'error']), 'none'),
    direction: v.optional(v.picklist(['catch', 'throw'])),
    name: v.optional(v.string()),
    ...common,
  }),
  v.strictObject({
    kind: v.literal('task'),
    id: v.pipe(v.string(), v.minLength(1)),
    lane: v.pipe(v.string(), v.minLength(1)),
    task: v.optional(v.picklist(['none', 'user', 'service', 'manual', 'send', 'receive', 'script']), 'none'),
    name: v.pipe(v.string(), v.minLength(1)),
    ...common,
  }),
  v.strictObject({
    kind: v.literal('subprocess'),
    id: v.pipe(v.string(), v.minLength(1)),
    lane: v.pipe(v.string(), v.minLength(1)),
    name: v.pipe(v.string(), v.minLength(1)),
    ...common,
  }),
  v.strictObject({
    kind: v.literal('gateway'),
    id: v.pipe(v.string(), v.minLength(1)),
    lane: v.pipe(v.string(), v.minLength(1)),
    gateway: v.optional(v.picklist(['exclusive', 'parallel', 'inclusive', 'eventBased']), 'exclusive'),
    name: v.optional(v.string()),
    ...common,
  }),
  v.strictObject({
    kind: v.literal('dataObject'),
    id: v.pipe(v.string(), v.minLength(1)),
    lane: v.optional(v.string()),
    name: v.pipe(v.string(), v.minLength(1)),
    ...common,
  }),
  v.strictObject({
    kind: v.literal('annotation'),
    id: v.pipe(v.string(), v.minLength(1)),
    lane: v.optional(v.string()),
    text: v.pipe(v.string(), v.minLength(1)),
    ...common,
  }),
]);

const flowSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  from: v.pipe(v.string(), v.minLength(1)),
  to: v.pipe(v.string(), v.minLength(1)),
  kind: v.optional(v.picklist(['sequence', 'message', 'association']), 'sequence'),
  name: v.optional(v.string()),
  condition: v.optional(v.string()),
  default: v.optional(v.boolean(), false),
  direction: v.optional(v.picklist(['none', 'one']), 'none'),
  tags: v.optional(v.array(v.string()), []),
  questions: v.optional(v.string()),
});

const diagramSchema = v.strictObject({
  pools: v.pipe(v.array(poolSchema), v.minLength(1)),
  nodes: v.optional(v.array(nodeSchema), []),
  flows: v.optional(v.array(flowSchema), []),
});

const isFlowNode = (node: BpmnNode): boolean =>
  node.kind === 'event' || node.kind === 'task' || node.kind === 'subprocess' || node.kind === 'gateway';

const isArtifact = (node: BpmnNode): boolean => node.kind === 'dataObject' || node.kind === 'annotation';

export const parseBpmnData = (input: unknown): BpmnData => {
  const parsed = v.parse(diagramSchema, input);
  const ids = new Set<string>();
  const claim = (id: string): void => {
    if (ids.has(id)) throw new Error(`duplicate id: ${id}`);
    ids.add(id);
  };

  const pools: BpmnPool[] = parsed.pools.map((pool) => {
    claim(pool.id);
    return {
      id: pool.id,
      name: pool.name,
      questions: pool.questions ?? null,
      lanes: pool.lanes.map((lane) => {
        claim(lane.id);
        return { id: lane.id, name: lane.name, questions: lane.questions ?? null };
      }),
    };
  });
  const poolById = new Map(pools.map((pool) => [pool.id, pool]));
  const laneOwner = new Map<string, { readonly pool: BpmnPool; readonly lane: BpmnLane }>();
  for (const pool of pools) for (const lane of pool.lanes) laneOwner.set(lane.id, { pool, lane });

  const resolveLane = (lane: string): { pool: BpmnPool; lane: BpmnLane | null } => {
    const owner = laneOwner.get(lane);
    if (owner !== undefined) return owner;
    const pool = poolById.get(lane);
    if (pool !== undefined) {
      if (pool.lanes.length > 0) throw new Error(`lane ${lane} is a pool with lanes`);
      return { pool, lane: null };
    }
    throw new Error(`unknown lane: ${lane}`);
  };

  const nodes: BpmnNode[] = parsed.nodes.map((node) => {
    claim(node.id);
    const base = {
      id: node.id,
      tags: node.tags,
      description: node.description ?? null,
      ...(node.questions === undefined ? {} : { questions: node.questions }),
    };
    if (node.kind === 'dataObject' || node.kind === 'annotation') {
      const lane = node.lane === undefined ? null : node.lane;
      const owner = lane === null ? null : resolveLane(lane);
      const common = {
        ...base,
        lane,
        pool: owner?.pool.id ?? null,
        name: node.kind === 'dataObject' ? node.name : null,
      };
      if (node.kind === 'dataObject')
        return { ...common, kind: 'dataObject', width: DATA_OBJECT_SIZE.width, height: DATA_OBJECT_SIZE.height };
      const lines = annotationLabelLines(node.text);
      return {
        ...common,
        kind: 'annotation',
        name: null,
        text: node.text,
        lines,
        width: ANNOTATION_WIDTH,
        height: annotationHeight(node.text),
      };
    }
    const owner = resolveLane(node.lane);
    const common = { ...base, lane: owner.lane?.id ?? owner.pool.id, pool: owner.pool.id };
    if (node.kind === 'event') {
      return {
        ...common,
        kind: 'event',
        name: node.name ?? null,
        event: node.event,
        trigger: node.trigger,
        direction: node.direction ?? null,
        width: EVENT_SIZE,
        height: EVENT_SIZE,
      };
    }
    if (node.kind === 'task') {
      return {
        ...common,
        kind: 'task',
        name: node.name,
        task: node.task,
        width: TASK_WIDTH,
        height: taskHeight(node.name, node.task),
      };
    }
    if (node.kind === 'subprocess') {
      return { ...common, kind: 'subprocess', name: node.name, width: TASK_WIDTH, height: taskHeight(node.name) };
    }
    return {
      ...common,
      kind: 'gateway',
      name: node.name ?? null,
      gateway: node.gateway,
      width: GATEWAY_SIZE,
      height: GATEWAY_SIZE,
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const defaultSources = new Map<string, number>();
  const edges: BpmnFlow[] = parsed.flows.map((flow) => {
    claim(flow.id);
    const fromNode = nodeById.get(flow.from);
    const toNode = nodeById.get(flow.to);
    const kind: BpmnFlowKind = flow.kind;
    if (fromNode === undefined && !poolById.has(flow.from)) throw new Error(`unknown flow source: ${flow.from}`);
    if (toNode === undefined && !poolById.has(flow.to)) throw new Error(`unknown flow target: ${flow.to}`);
    const fromPool = fromNode?.pool ?? flow.from;
    const toPool = toNode?.pool ?? flow.to;

    if (kind === 'sequence') {
      if (fromNode === undefined || toNode === undefined) throw new Error(`sequence flow ${flow.id} needs nodes`);
      if (flow.from === flow.to)
        throw new Error(`self-loop sequence flow ${flow.id} is not supported; use a loop marker on the activity`);
      if (flow.default && flow.condition !== undefined)
        throw new Error(`sequence flow ${flow.id} cannot be both default and conditional`);
      if (!isFlowNode(fromNode) || !isFlowNode(toNode))
        throw new Error(`sequence flow ${flow.id} joins a non-flow node`);
      if (fromPool !== toPool) throw new Error(`sequence flow ${flow.id} leaves its pool`);
      if (toNode.kind === 'event' && toNode.event === 'start')
        throw new Error(`sequence flow ${flow.id} enters a start event`);
      if (fromNode.kind === 'event' && fromNode.event === 'end')
        throw new Error(`sequence flow ${flow.id} leaves an end event`);
      if (flow.default) {
        const mayDefault =
          (fromNode.kind === 'gateway' && (fromNode.gateway === 'exclusive' || fromNode.gateway === 'inclusive')) ||
          fromNode.kind === 'task' ||
          fromNode.kind === 'subprocess';
        if (!mayDefault) throw new Error(`default flow ${flow.id} has a source that cannot own one`);
        const count = (defaultSources.get(flow.from) ?? 0) + 1;
        if (count > 1) throw new Error(`more than one default flow leaves ${flow.from}`);
        defaultSources.set(flow.from, count);
      }
    } else if (kind === 'message') {
      if (fromNode !== undefined && !['event', 'task', 'subprocess'].includes(fromNode.kind))
        throw new Error(`message flow ${flow.id} starts at a ${fromNode.kind}`);
      if (toNode !== undefined && !['event', 'task', 'subprocess'].includes(toNode.kind))
        throw new Error(`message flow ${flow.id} ends at a ${toNode.kind}`);
      if (fromNode?.kind === 'event' && fromNode.event === 'start')
        throw new Error(`message flow ${flow.id} leaves a start event`);
      if (toNode?.kind === 'event' && toNode.event === 'end')
        throw new Error(`message flow ${flow.id} enters an end event`);
      if (fromPool === toPool) throw new Error(`message flow ${flow.id} stays inside one pool`);
      if (flow.default || flow.condition !== undefined)
        throw new Error(`message flow ${flow.id} cannot be default or conditional`);
    } else {
      if (fromNode === undefined || toNode === undefined) throw new Error(`association ${flow.id} needs nodes`);
      if (flow.default || flow.condition !== undefined) throw new Error(`association ${flow.id} cannot be default`);
      if (!isArtifact(fromNode) && !isArtifact(toNode)) throw new Error(`association ${flow.id} joins no artifact`);
    }

    return {
      id: flow.id,
      from: flow.from,
      to: flow.to,
      kind,
      tags: flow.tags,
      label: flow.name?.trim() || flow.condition?.trim() || null,
      condition: flow.condition ?? null,
      isDefault: flow.default,
      direction: flow.direction,
      ...(flow.questions === undefined ? {} : { questions: flow.questions }),
    };
  });

  for (const node of nodes) {
    if (node.kind !== 'event') continue;
    if (node.trigger === 'error' && node.event !== 'end')
      throw new Error(`event ${node.id}: error is only an end event trigger`);
    const throws = node.event === 'intermediate' && node.direction === 'throw';
    if (node.trigger === 'timer' && (node.event === 'end' || throws))
      throw new Error(`event ${node.id}: timer is only a catching trigger`);
  }

  const laned = (id: string): boolean => {
    const node = nodeById.get(id);
    return (
      node !== undefined &&
      node.lane !== null &&
      node.pool !== null &&
      (laneOwner.has(node.lane) || node.lane === node.pool)
    );
  };
  for (const node of nodes) {
    if (!isArtifact(node) || node.lane !== null) continue;
    const partner = edges.some(
      (edge) =>
        edge.kind === 'association' &&
        ((edge.from === node.id && laned(edge.to)) || (edge.to === node.id && laned(edge.from))),
    );
    if (!partner) throw new Error(`artifact ${node.id} needs a lane or an association to a laned node`);
  }

  return { pools, nodes, edges };
};

/** The pool a node belongs to, or null for a lane-less artifact. */
export const poolOf = (pools: readonly BpmnPool[], node: BpmnNode): BpmnPool | null =>
  node.pool === null ? null : (pools.find((pool) => pool.id === node.pool) ?? null);

/** Whether any pool has lanes, which decides the extra lane-head column. */
export const hasLanes = (pools: readonly BpmnPool[]): boolean => pools.some((pool) => pool.lanes.length > 0);

export const eventDirection = (node: BpmnEventNode): BpmnDirection =>
  node.event === 'start' ? 'catch' : (node.direction ?? 'catch');
