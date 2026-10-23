export { DpkSequenceDiagram } from './element';
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

import { registerDiagram } from '../diagram/registry';
import { DpkSequenceDiagram } from './element';
import { sequenceDiagramMessages } from './messages';
import { emptySequenceData } from './model';

export const defineSequenceDiagram = (): void => {
  if (!customElements.get('dpk-sequence-diagram')) customElements.define('dpk-sequence-diagram', DpkSequenceDiagram);
  registerDiagram({
    tag: 'dpk-sequence-diagram',
    label: (locale) => sequenceDiagramMessages(locale).heading,
    seed: emptySequenceData,
  });
};
