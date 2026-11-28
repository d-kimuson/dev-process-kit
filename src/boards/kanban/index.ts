export { DpkBoardKanban } from './element';
export type { KanbanSelection } from './element';
export { kanbanMessages } from './messages';
export type { KanbanMessages } from './messages';
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

import { defineKanbanCardDetail } from './card-detail';
import { DpkBoardKanban } from './element';

export const defineKanban = (): void => {
  defineKanbanCardDetail();
  if (!customElements.get('dpk-board-kanban')) customElements.define('dpk-board-kanban', DpkBoardKanban);
};
