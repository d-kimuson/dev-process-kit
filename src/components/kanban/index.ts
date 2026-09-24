export { DpkComponentKanban } from './element';
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

import { DpkComponentKanban } from './element';

export const defineKanban = (): void => {
  if (!customElements.get('dpk-component-kanban')) customElements.define('dpk-component-kanban', DpkComponentKanban);
};
