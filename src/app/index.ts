/**
 * `<dpk-app>`: the document that holds the app's pages.
 *
 * The behaviour is the core's `AppElement`; this module gives it its tag and
 * the views and boards a page can be added from, each with the icon its pages
 * show in the switcher. Every entry that ships a view or a board registers
 * it, so an app works with whichever entries it loads; the switcher offers
 * only the contents whose element is defined.
 */
import {
  ArrowRightLeft,
  Boxes,
  CircleDot,
  Database,
  FileText,
  GitBranch,
  GitFork,
  LayoutGrid,
  ListChecks,
  Map as MapIcon,
  MonitorSmartphone,
  PenTool,
  Presentation,
  Spade,
  Zap,
} from 'lucide';

import { AppElement, type PageContent } from '../core/app/element';
import { lucide } from '../core/icons';

export type { PageContent } from '../core/app/element';

// `label` mirrors each content's own `ViewDefinition.label`, and `addable` its
// `ViewDefinition.addable` (`index.test.ts` checks both stay in step): the add menu reads
// them here, before the content's own entry may even be loaded.
const PAGE_CONTENTS: readonly PageContent[] = [
  { kind: 'view', name: 'usm', label: 'User Story Mapping', icon: lucide(MapIcon) },
  { kind: 'view', name: 'prototype', label: 'UX Prototype', icon: lucide(MonitorSmartphone), addable: false },
  { kind: 'view', name: 'task-board', label: 'Task Context Board', icon: lucide(LayoutGrid), addable: false },
  { kind: 'view', name: 'delegation-poker', label: 'Delegation Poker', icon: lucide(Spade), addable: false },
  { kind: 'view', name: 'slides', label: 'Slides', icon: lucide(Presentation), addable: false },
  { kind: 'view', name: 'plain', label: 'Plain', icon: lucide(FileText), addable: false },
  { kind: 'board', name: 'er-diagram', label: 'ER diagram', icon: lucide(Database), addable: false },
  { kind: 'board', name: 'state-diagram', label: 'State diagram', icon: lucide(CircleDot), addable: false },
  { kind: 'board', name: 'sequence-diagram', label: 'Sequence diagram', icon: lucide(ArrowRightLeft), addable: false },
  { kind: 'board', name: 'dependency-graph', label: 'Dependency graph', icon: lucide(GitBranch), addable: false },
  { kind: 'board', name: 'architecture-map', label: 'Architecture map', icon: lucide(Boxes), addable: false },
  { kind: 'board', name: 'mind-map', label: 'Mind map', icon: lucide(GitFork), addable: false },
  { kind: 'board', name: 'event-storming', label: 'Event Storming', icon: lucide(Zap), addable: false },
  { kind: 'board', name: 'example-mapping', label: 'Example Mapping', icon: lucide(ListChecks) },
  { kind: 'board', name: 'whiteboard', label: 'Whiteboard', icon: lucide(PenTool) },
  { kind: 'board', name: 'kanban', label: 'Kanban', icon: lucide(LayoutGrid) },
];

export class DpkApp extends AppElement {
  protected override pageContents(): readonly PageContent[] {
    return PAGE_CONTENTS;
  }
}

export const defineAppElement = (): void => {
  if (!customElements.get('dpk-app')) customElements.define('dpk-app', DpkApp);
};
