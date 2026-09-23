export { DpkComponentStateDiagram } from './element';
export { STATE_NODE_SIZE, emptyStateData, hasAuthoredPositions, isTerminal, parseStateData } from './model';
export type { StateDiagramData, StateKind, StateNode, StateTransition, TransitionKind } from './model';

import { DpkComponentStateDiagram } from './element';

export const defineStateDiagram = (): void => {
  if (!customElements.get('dpk-component-state-diagram'))
    customElements.define('dpk-component-state-diagram', DpkComponentStateDiagram);
};
