export { DpkBoardSequenceDiagram } from './element';
export type { SequenceSelection } from './element';
export { sequenceDiagramMessages } from './messages';
export type { SequenceDiagramMessages } from './messages';
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

import { DpkBoardSequenceDiagram } from './element';

export const defineSequenceDiagram = (): void => {
  if (!customElements.get('dpk-board-sequence-diagram'))
    customElements.define('dpk-board-sequence-diagram', DpkBoardSequenceDiagram);
};
