export { DpkChecklist } from './element';
export { checklistMessages } from './messages';
export type { ChecklistMessages } from './messages';
export {
  SET_CHECKED,
  checklistProgress,
  emptyChecklistData,
  parseChecklistData,
  reduceChecklistActions,
} from './model';
export type { ChecklistData, ChecklistItem } from './model';

import { DpkChecklist } from './element';

export const defineChecklist = (): void => {
  if (!customElements.get('dpk-checklist')) customElements.define('dpk-checklist', DpkChecklist);
};
