/**
 * The ER layout appraisal corpus and report builder shared by the printable
 * CLI (`dev/eval.ts`) and any later comparison step.
 *
 * Every fixture runs the real pipeline — `parseErData` -> `erLayoutSpec` ->
 * `layeredLayout` with the element's own `LAYOUT` constants -> `relationRoutes`
 * with the view's own functions — so the report describes what the reader
 * actually sees, not a simplified model. The corpus is the layout bench's
 * corpus: real samples plus synthetic stress patterns.
 */

import { parseErData, type ErData } from '../../src/components/er-diagram/model';
import { geometryOf } from '../layout-bench/geometry';
import { FIXTURES } from '../layout-bench/run';
import { appraiseGeometry, fitScaleFor, type Appraisal } from './appraisal';
import { labelsOf } from './labels';

/** The sample's own inline canvas: page max-width 1180, diagram `--diagram-height: 900px`. */
export const INLINE_CANVAS = { width: 1180, height: 900 } as const;
/** A typical maximized diagram panel. */
export const FULLSCREEN_CANVAS = { width: 1600, height: 1000 } as const;

export type DetourExample = {
  readonly edge: string;
  readonly routed: number;
  readonly straight: number;
  readonly ratio: number;
};

export type EvalRow = {
  readonly name: string;
  readonly tables: number;
  readonly edges: number;
  readonly layoutMs: number;
  readonly routingMs: number;
  readonly appraisal: Appraisal;
  readonly fullscreenFitScale: number;
  /** The five edges with the largest routed/straight ratio, for locating a routing problem. */
  readonly worstDetours: readonly DetourExample[];
};

export type EvalReport = {
  readonly generatedAt: string;
  readonly canvases: { readonly inline: typeof INLINE_CANVAS; readonly fullscreen: typeof FULLSCREEN_CANVAS };
  readonly rows: readonly EvalRow[];
};

const measured = (data: ErData): Omit<EvalRow, 'name'> => {
  const geometry = geometryOf(data);
  const labels = labelsOf(data, geometry.geometry, { width: geometry.width, height: geometry.height });
  const appraisal = appraiseGeometry(geometry.geometry, labels, INLINE_CANVAS, {
    width: geometry.width,
    height: geometry.height,
  });
  const worstDetours = geometry.geometry.edges
    .flatMap((edge) => {
      const first = edge.points[0];
      const last = edge.points.at(-1);
      if (first === undefined || last === undefined || edge.from === edge.to) return [];
      let routed = 0;
      for (let index = 1; index < edge.points.length; index++) {
        const a = edge.points[index - 1]!;
        const b = edge.points[index]!;
        routed += Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      }
      const straight = Math.abs(last.x - first.x) + Math.abs(last.y - first.y);
      return [{ edge: edge.id, routed, straight, ratio: routed / Math.max(1, straight) }];
    })
    .sort((a, b) => b.ratio - a.ratio || b.routed - a.routed)
    .slice(0, 5);
  return {
    tables: data.nodes.length,
    edges: data.edges.length,
    layoutMs: geometry.layoutMs,
    routingMs: geometry.routingMs,
    appraisal,
    fullscreenFitScale: fitScaleFor(FULLSCREEN_CANVAS, { width: geometry.width, height: geometry.height }),
    worstDetours,
  };
};

/** Runs every fixture once. Deterministic except the explicitly reported `*layoutMs`/`routingMs`. */
export const runEval = (): EvalReport => {
  const rows = FIXTURES.map((fixture) => {
    const data = parseErData(fixture.input);
    return { name: fixture.name, ...measured(data) };
  });
  return {
    generatedAt: new Date().toISOString(),
    canvases: { inline: INLINE_CANVAS, fullscreen: FULLSCREEN_CANVAS },
    rows,
  };
};
