import { html, nothing, type TemplateResult } from 'lit';

import type { TaskBoardMessages } from '../messages';

/** The main area's sections, one at a time: the side rail keeps the rest of the width. */
export const BOARD_TABS = ['context', 'log', 'questions'] as const;
export type BoardTab = (typeof BOARD_TABS)[number];

export type TabCounts = {
  readonly log: number;
  /** Questions not replied to yet. */
  readonly questions: number;
  /** A blocker is still open: the agent is stuck until the reader answers. */
  readonly alert: boolean;
};

/** Where an arrow, Home or End key moves the selection; `null` for any other key. */
export const tabAfterKey = (current: BoardTab, key: string): BoardTab | null => {
  const index = BOARD_TABS.indexOf(current);
  const last = BOARD_TABS.length - 1;
  switch (key) {
    case 'ArrowRight':
      return BOARD_TABS[index === last ? 0 : index + 1] ?? null;
    case 'ArrowLeft':
      return BOARD_TABS[index === 0 ? last : index - 1] ?? null;
    case 'Home':
      return BOARD_TABS[0];
    case 'End':
      return BOARD_TABS[last] ?? null;
    default:
      return null;
  }
};

const tabLabel = (m: TaskBoardMessages, tab: BoardTab): string => {
  switch (tab) {
    case 'context':
      return m.tabContext;
    case 'log':
      return m.tabLog;
    case 'questions':
      return m.tabQuestions;
  }
};

const tabCount = (tab: BoardTab, counts: TabCounts): number | null => {
  switch (tab) {
    case 'context':
      return null;
    case 'log':
      return counts.log;
    case 'questions':
      return counts.questions;
  }
};

export const renderTabs = (
  m: TaskBoardMessages,
  current: BoardTab,
  counts: TabCounts,
  select: (tab: BoardTab) => void,
  keydown: (event: KeyboardEvent) => void,
): TemplateResult => html`
  <div class="board-tabs" role="tablist" aria-label=${m.tabs}>
    ${BOARD_TABS.map((tab) => {
      const count = tabCount(tab, counts);
      return html`<button
        type="button"
        role="tab"
        id=${`board-tab-${tab}`}
        data-tab=${tab}
        data-alert=${tab === 'questions' ? String(counts.alert) : nothing}
        aria-controls=${`board-panel-${tab}`}
        aria-selected=${String(current === tab)}
        tabindex=${current === tab ? 0 : -1}
        title=${tab === 'questions' && counts.questions > 0 ? m.openCount(counts.questions) : nothing}
        @click=${() => select(tab)}
        @keydown=${keydown}
      >
        ${tabLabel(m, tab)}${count === null || count === 0 ? nothing : html`<span class="board-tab-count">${count}</span>`}
      </button>`;
    })}
  </div>
`;

/** One tab's content; the hidden ones stay in the tree so drafts and focus survive a switch. */
export const renderTabPanel = (tab: BoardTab, current: BoardTab, content: unknown): TemplateResult => html`
  <div
    class="board-panel"
    id=${`board-panel-${tab}`}
    role="tabpanel"
    aria-labelledby=${`board-tab-${tab}`}
    ?hidden=${current !== tab}
  >
    ${content}
  </div>
`;
