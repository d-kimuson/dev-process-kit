export { ArtifactSequenceDiagram } from './element';
export type { SequenceSelection } from './element';
export {
  PARTICIPANT_PITCH,
  countMessages,
  emptySequenceData,
  flattenMessages,
  layoutSequence,
  messageNumbers,
  parseSequenceData,
  pruneItems,
} from './model';
export type {
  BranchRow,
  DividerRow,
  FoldRow,
  FragmentOperator,
  FrameBox,
  MessageRow,
  MessageStyle,
  SequenceBranch,
  SequenceDiagramData,
  SequenceFragment,
  SequenceItem,
  SequenceLayout,
  SequenceMessage,
  SequenceParticipant,
} from './model';

import { ArtifactSequenceDiagram } from './element';

export const SEQUENCE_DIAGRAM_TAG = 'artifact-sequence-diagram';

export const defineSequenceDiagram = (tag = SEQUENCE_DIAGRAM_TAG): void => {
  if (!customElements.get(tag)) customElements.define(tag, ArtifactSequenceDiagram);
};
