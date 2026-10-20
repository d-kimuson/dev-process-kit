/**
 * `<dpk-page>`: the page host that holds several templates as boards.
 *
 * The behaviour is the core's `PageElement`; this module gives it its tag and
 * the templates a board can be added from, each with the icon its boards
 * show in the rail. Every entry that ships a template registers it, so a page
 * of boards works with whichever template entries it loads; the rail offers
 * only the templates whose element is defined.
 */
import {
  FileText,
  ListChecks,
  Map as MapIcon,
  MonitorSmartphone,
  PenTool,
  Presentation,
  Spade,
  SquareKanban,
  StickyNote,
} from 'lucide';

import { lucide } from '../core/icons';
import { PageElement, type BoardTemplate } from '../core/page/element';

const BOARD_TEMPLATES: readonly BoardTemplate[] = [
  { name: 'usm', icon: lucide(MapIcon) },
  { name: 'event-storming', icon: lucide(StickyNote) },
  { name: 'example-mapping', icon: lucide(ListChecks) },
  { name: 'prototype', icon: lucide(MonitorSmartphone) },
  { name: 'task-board', icon: lucide(SquareKanban) },
  { name: 'delegation-poker', icon: lucide(Spade) },
  { name: 'whiteboard', icon: lucide(PenTool) },
  { name: 'slides', icon: lucide(Presentation) },
  { name: 'plain', icon: lucide(FileText) },
];

export class DpkPage extends PageElement {
  protected override boardTemplates(): readonly BoardTemplate[] {
    return BOARD_TEMPLATES;
  }
}

export const definePageElement = (): void => {
  if (!customElements.get('dpk-page')) customElements.define('dpk-page', DpkPage);
};
