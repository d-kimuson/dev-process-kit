import type { EndFrame } from '../../lib/layout/path-steps';
import type { BpmnFlow, BpmnNode } from './model';

import { END_MARKERS, type EdgeSpec, type EndMarker, type GlyphShape } from '../base/edge';

/**
 * How each BPMN flow is drawn.
 *
 * - sequence: solid, ending in a filled arrow; a default flow starts with a
 *   slash and a conditional one leaving an activity with a diamond (a
 *   condition out of a gateway is only its label).
 * - message: dashed, starting with an open circle and ending in a hollow
 *   arrow.
 * - association: dotted, with an open arrow only when it is directed.
 */
export const MESSAGE_START = END_MARKERS.circle;

/** A point at `along` into the line and `across` to its side, from an end frame. */
const at = (frame: EndFrame, along: number, across: number): { x: number; y: number } => {
  const normal = { x: -frame.inward.y, y: frame.inward.x };
  return {
    x: Math.round((frame.tip.x + frame.inward.x * along + normal.x * across) * 100) / 100,
    y: Math.round((frame.tip.y + frame.inward.y * along + normal.y * across) * 100) / 100,
  };
};

/**
 * BPMN's default-flow marker: a diagonal slash across the line near its source,
 * not the perpendicular tick the shared `slash` draws. Local to this board so
 * the shared glyph keeps its meaning for any other diagram.
 */
export const DEFAULT_FLOW_MARKER: EndMarker = {
  name: 'diagonalSlash',
  reach: 14,
  trim: 0,
  halfWidth: 6,
  shapes: (frame): readonly GlyphShape[] => [{ kind: 'segment', a: at(frame, 2, 6), b: at(frame, 14, -6) }],
};

export const flowSpec = (flow: BpmnFlow, source: BpmnNode | null): EdgeSpec => {
  if (flow.kind === 'message') {
    return { line: 'dashed', start: MESSAGE_START, end: END_MARKERS.hollowArrow, flow: 'active' };
  }
  if (flow.kind === 'association') {
    return {
      line: 'dotted',
      start: null,
      end: flow.direction === 'one' ? END_MARKERS.openArrow : null,
      flow: 'none',
    };
  }
  const activity = source?.kind === 'task' || source?.kind === 'subprocess';
  const start = flow.condition !== null && activity ? END_MARKERS.diamond : flow.isDefault ? DEFAULT_FLOW_MARKER : null;
  return { line: 'solid', start, end: END_MARKERS.arrow, flow: 'active' };
};
