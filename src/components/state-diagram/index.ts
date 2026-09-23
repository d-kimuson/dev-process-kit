export { ArtifactStateDiagram } from './element';
export { STATE_NODE_SIZE, emptyStateData, hasAuthoredPositions, isTerminal, parseStateData } from './model';
export type { StateDiagramData, StateKind, StateNode, StateTransition, TransitionKind } from './model';

import { ArtifactStateDiagram } from './element';

export const STATE_DIAGRAM_TAG = 'artifact-state-diagram';

export const defineStateDiagram = (tag = STATE_DIAGRAM_TAG): void => {
  if (!customElements.get(tag)) customElements.define(tag, ArtifactStateDiagram);
};
