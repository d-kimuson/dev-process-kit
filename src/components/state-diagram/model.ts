import * as v from 'valibot';

import type { DiagramEdgeInput, DiagramNodeInput } from '../diagram/model';

/**
 * Domain model of the state diagram. The JSON child is external input, so the
 * shape is validated strictly and every id is checked for uniqueness and for
 * dangling transition endpoints.
 */

const positionSchema = v.strictObject({ x: v.number(), y: v.number() });

const stateSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  /** Model-side code, e.g. `payment_pending`. */
  code: v.optional(v.string()),
  kind: v.optional(v.picklist(['normal', 'initial', 'terminal', 'compensation']), 'normal'),
  description: v.optional(v.string()),
  position: v.optional(positionSchema),
  questions: v.optional(v.string()),
});

const transitionSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  from: v.pipe(v.string(), v.minLength(1)),
  to: v.pipe(v.string(), v.minLength(1)),
  title: v.pipe(v.string(), v.minLength(1)),
  kind: v.optional(v.picklist(['normal', 'exception']), 'normal'),
  tags: v.optional(v.array(v.string()), []),
  guard: v.optional(v.string()),
  effect: v.optional(v.string()),
  questions: v.optional(v.string()),
});

export type StateKind = 'normal' | 'initial' | 'terminal' | 'compensation';
export type TransitionKind = 'normal' | 'exception';

export type StateNode = DiagramNodeInput & {
  readonly name: string;
  readonly code: string | null;
  readonly kind: StateKind;
  readonly description: string | null;
};

export type StateTransition = DiagramEdgeInput & {
  readonly title: string;
  readonly kind: TransitionKind;
  readonly guard: string | null;
  readonly effect: string | null;
};

export type StateDiagramData = {
  readonly nodes: readonly StateNode[];
  readonly edges: readonly StateTransition[];
};

export const STATE_NODE_SIZE = { width: 178, height: 86 } as const;

export const emptyStateData = (): StateDiagramData => ({ nodes: [], edges: [] });

const diagramSchema = v.strictObject({
  states: v.array(stateSchema),
  transitions: v.optional(v.array(transitionSchema), []),
});

export const parseStateData = (input: unknown): StateDiagramData => {
  const parsed = v.parse(diagramSchema, input);
  const ids = new Set<string>();
  for (const state of parsed.states) {
    if (ids.has(state.id)) throw new Error(`duplicate state id: ${state.id}`);
    ids.add(state.id);
  }
  const transitionIds = new Set<string>();
  const edges = parsed.transitions.map((transition) => {
    if (transitionIds.has(transition.id)) throw new Error(`duplicate transition id: ${transition.id}`);
    transitionIds.add(transition.id);
    if (!ids.has(transition.from)) throw new Error(`unknown transition source: ${transition.from}`);
    if (!ids.has(transition.to)) throw new Error(`unknown transition target: ${transition.to}`);
    return {
      id: transition.id,
      from: transition.from,
      to: transition.to,
      title: transition.title,
      kind: transition.kind,
      tags: transition.tags,
      guard: transition.guard ?? null,
      effect: transition.effect ?? null,
      ...(transition.questions === undefined ? {} : { questions: transition.questions }),
    } satisfies StateTransition;
  });
  const nodes = parsed.states.map(
    (state) =>
      ({
        id: state.id,
        name: state.name,
        code: state.code ?? null,
        kind: state.kind,
        description: state.description ?? null,
        width: STATE_NODE_SIZE.width,
        height: STATE_NODE_SIZE.height,
        tags: [],
        ...(state.position === undefined ? {} : { position: state.position }),
        ...(state.questions === undefined ? {} : { questions: state.questions }),
      }) satisfies StateNode,
  );
  return { nodes, edges };
};

/** Authored positions win when every state carries one. */
export const hasAuthoredPositions = (nodes: readonly StateNode[]): boolean =>
  nodes.length > 0 && nodes.every((node) => node.position !== undefined);

export const isTerminal = (kind: StateKind): boolean => kind === 'terminal';
