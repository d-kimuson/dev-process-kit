export { ArtifactKanban } from './element';
export type { KanbanSelection } from './element';
export {
  ADD_CARD,
  KANBAN_COLORS,
  MOVE_CARD,
  emptyKanbanData,
  isSamePosition,
  parseKanbanData,
  reduceKanbanActions,
  visibleKanban,
} from './model';
export type { KanbanCard, KanbanCardChange, KanbanColor, KanbanColumn, KanbanData, KanbanPosition } from './model';

import { ArtifactKanban } from './element';

export const KANBAN_TAG = 'artifact-kanban';

export const defineKanban = (tag = KANBAN_TAG): void => {
  if (!customElements.get(tag)) customElements.define(tag, ArtifactKanban);
};
