/**
 * `<dpk-page>`: the page host that holds several templates as boards.
 *
 * The behaviour is the core's `PageElement`; this module gives it its tag and
 * the templates a board can be added from, each with the icon its boards
 * show in the rail. Every entry that ships a template registers it, so a page
 * of boards works with whichever template entries it loads; the rail offers
 * only the templates whose element is defined.
 */
import { FileText, Map as MapIcon, MonitorSmartphone, Presentation, Spade, SquareKanban } from 'lucide';

import { lucide } from '../core/icons';
import { PageElement, type BoardTemplate } from '../core/page/element';

// `label` mirrors each template's own `TemplateDefinition.label`, and `addable` its
// `TemplateDefinition.addable` (`index.test.ts` checks both stay in step): the add menu reads
// them here, before the template's own entry may even be loaded.
const BOARD_TEMPLATES: readonly BoardTemplate[] = [
  { name: 'usm', label: 'User Story Mapping', icon: lucide(MapIcon) },
  { name: 'prototype', label: 'UX Prototype', icon: lucide(MonitorSmartphone), addable: false },
  { name: 'task-board', label: 'Task Context Board', icon: lucide(SquareKanban), addable: false },
  { name: 'delegation-poker', label: 'Delegation Poker', icon: lucide(Spade), addable: false },
  { name: 'slides', label: 'Slides', icon: lucide(Presentation), addable: false },
  { name: 'plain', label: 'Plain', icon: lucide(FileText), addable: false },
];

export class DpkPage extends PageElement {
  protected override boardTemplates(): readonly BoardTemplate[] {
    return BOARD_TEMPLATES;
  }
}

export const definePageElement = (): void => {
  if (!customElements.get('dpk-page')) customElements.define('dpk-page', DpkPage);
};
