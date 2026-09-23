import * as v from 'valibot';

import type { DiagramEdgeInput, DiagramNodeInput } from '../diagram/model';

/** Domain model of the dependency graph: modules and the references between them. */

export const MODULE_SIZE = { width: 176, height: 84 } as const;

const moduleSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  /** Source location, e.g. `app/order-service`. */
  path: v.optional(v.string()),
  /** Layer label shown on the card, e.g. `アプリケーション`. */
  layer: v.optional(v.string()),
  tags: v.optional(v.array(v.string()), []),
  description: v.optional(v.string()),
  questions: v.optional(v.string()),
});

const dependencySchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  from: v.pipe(v.string(), v.minLength(1)),
  to: v.pipe(v.string(), v.minLength(1)),
  /** What the source uses from the target, e.g. `calculateQuote`. */
  contract: v.optional(v.string()),
  description: v.optional(v.string()),
  questions: v.optional(v.string()),
});

const diagramSchema = v.strictObject({
  modules: v.array(moduleSchema),
  dependencies: v.optional(v.array(dependencySchema), []),
});

export type DependencyModule = DiagramNodeInput & {
  readonly name: string;
  readonly path: string | null;
  readonly layer: string | null;
  readonly description: string | null;
};

export type DependencyLink = DiagramEdgeInput & {
  readonly contract: string | null;
  readonly description: string | null;
};

export type DependencyData = {
  readonly nodes: readonly DependencyModule[];
  readonly edges: readonly DependencyLink[];
};

/** Which way the reader follows dependencies from the selected module. */
export type DependencyDirection = 'outgoing' | 'incoming' | 'both';

export const emptyDependencyData = (): DependencyData => ({ nodes: [], edges: [] });

export const parseDependencyData = (input: unknown): DependencyData => {
  const parsed = v.parse(diagramSchema, input);
  const ids = new Set<string>();
  for (const module of parsed.modules) {
    if (ids.has(module.id)) throw new Error(`duplicate module id: ${module.id}`);
    ids.add(module.id);
  }
  const edgeIds = new Set<string>();
  const edges = parsed.dependencies.map((dependency) => {
    if (edgeIds.has(dependency.id)) throw new Error(`duplicate dependency id: ${dependency.id}`);
    edgeIds.add(dependency.id);
    if (!ids.has(dependency.from)) throw new Error(`unknown dependency source: ${dependency.from}`);
    if (!ids.has(dependency.to)) throw new Error(`unknown dependency target: ${dependency.to}`);
    return {
      id: dependency.id,
      from: dependency.from,
      to: dependency.to,
      tags: [],
      contract: dependency.contract ?? null,
      description: dependency.description ?? null,
    } satisfies DependencyLink;
  });
  const nodes = parsed.modules.map(
    (module) =>
      ({
        id: module.id,
        name: module.name,
        path: module.path ?? null,
        layer: module.layer ?? null,
        description: module.description ?? null,
        tags: module.tags,
        width: MODULE_SIZE.width,
        height: MODULE_SIZE.height,
        ...(module.questions === undefined ? {} : { questions: module.questions }),
      }) satisfies DependencyModule,
  );
  return { nodes, edges };
};
