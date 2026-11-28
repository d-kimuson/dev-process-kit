import type { BpmnFlow, BpmnNode } from './model';

import { END_MARKERS, type EdgeSpec } from '../base/edge';

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
  const start = flow.condition !== null && activity ? END_MARKERS.diamond : flow.isDefault ? END_MARKERS.slash : null;
  return { line: 'solid', start, end: END_MARKERS.arrow, flow: 'active' };
};
