export { DpkBoardStateDiagram } from './element';
export { stateDiagramMessages } from './messages';
export type { StateDiagramMessages } from './messages';
export { STATE_NODE_SIZE, emptyStateData, hasAuthoredPositions, isTerminal, parseStateData } from './model';
export type { StateDiagramData, StateKind, StateNode, StateTransition, TransitionKind } from './model';

import { DpkBoardStateDiagram } from './element';

export const defineStateDiagram = (): void => {
  if (!customElements.get('dpk-board-state-diagram'))
    customElements.define('dpk-board-state-diagram', DpkBoardStateDiagram);
};
