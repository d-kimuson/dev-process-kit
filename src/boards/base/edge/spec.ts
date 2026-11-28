import type { LayoutPoint } from '../../../lib/layout/layered';
import type { EndMarker } from './glyphs';

import { roundedSteps, trimSteps, type PathStep } from '../../../lib/layout/path-steps';

/**
 * A line's drawing specification, board-agnostic: how its stroke is dashed, the
 * marker at each end (if any), and whether it flows. Everything a board needs to
 * turn a routed polyline into a drawable path lives here, so no board has to
 * re-derive its own corner rounding or glyph clearance.
 */

export type LineStyle = 'solid' | 'dashed' | 'dotted';

/** How far a flow-marked line animates: not at all, or only while the reader points at or selects it. */
export type FlowStyle = 'none' | 'active';

export type EdgeSpec = {
  readonly line: LineStyle;
  readonly start: EndMarker | null;
  readonly end: EndMarker | null;
  readonly flow: FlowStyle;
};

/**
 * The straight run a router should leave under the end markers, so their
 * footprints are drawn on a straight tail rather than past a corner: the longer
 * of the two ends' trims.
 */
export const edgeReach = (spec: EdgeSpec): number => Math.max(spec.start?.trim ?? 0, spec.end?.trim ?? 0);

export type EdgeStepsOptions = {
  /** The corner radius. A corner never takes more than half of either segment beside it. */
  readonly radius: number;
};

/**
 * A routed polyline as drawing steps: its corners rounded, then each end
 * shortened by its marker's `trim` so the glyph sits at the very end of the
 * line. `edgeReach` is kept straight at each end before rounding may bend it.
 */
export const edgeSteps = (
  points: readonly LayoutPoint[],
  spec: EdgeSpec,
  options: EdgeStepsOptions,
): readonly PathStep[] => {
  const reach = edgeReach(spec);
  const rounded = roundedSteps(points, { radius: options.radius, keepStart: reach, keepEnd: reach });
  return trimSteps(rounded, spec.start?.trim ?? 0, spec.end?.trim ?? 0);
};
