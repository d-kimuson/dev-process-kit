export { DpkStateDiagram } from './element';
export { stateDiagramMessages } from './messages';
export type { StateDiagramMessages } from './messages';
export { STATE_NODE_SIZE, emptyStateData, hasAuthoredPositions, isTerminal, parseStateData } from './model';
export type { StateDiagramData, StateKind, StateNode, StateTransition, TransitionKind } from './model';

import { registerDiagram } from '../diagram/registry';
import { DpkStateDiagram } from './element';
import { stateDiagramMessages } from './messages';
import { emptyStateData } from './model';

export const defineStateDiagram = (): void => {
  if (!customElements.get('dpk-state-diagram')) customElements.define('dpk-state-diagram', DpkStateDiagram);
  registerDiagram({
    tag: 'dpk-state-diagram',
    label: (locale) => stateDiagramMessages(locale).heading,
    seed: emptyStateData,
  });
};
