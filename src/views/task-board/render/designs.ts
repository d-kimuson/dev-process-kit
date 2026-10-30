import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import type { TaskBoardMessages } from '../messages';
import type { DesignListItemViewModel, DesignTaskViewModel, DesignViewModel, DesignsViewModel } from '../present';

import { renderMarkdown } from '../../../lib/markdown';
import { commentButton, type BoardHandlers } from './shared';

/**
 * The design docs as a master-detail tab: the list of titles on the left, the
 * open doc on the right with the tasks it groups. A doc is Markdown, so it can
 * run as long as the subject needs — headings, lists, code — while one doc can
 * carry many tasks. Whoever comes back to the work — the agent or the person —
 * reads this first. Diagrams are light DOM slotted into the doc they belong to
 * (`slot="design:<id>"`).
 */
export const renderDesigns = (
  m: TaskBoardMessages,
  vm: DesignsViewModel,
  handlers: BoardHandlers,
): TemplateResult => html`
  <section class="board-designs" data-section="designs" aria-label=${m.designs}>
    ${
      vm.items.length === 0
        ? html`<p class="dpk-empty board-empty" data-variant="dashed">${m.noDesigns}</p>`
        : html`<div class="board-design-layout">
            <nav class="board-design-index" aria-label=${m.designs}>
              <ul class="board-design-index-list">
                ${vm.items.map((item) => renderIndexItem(m, item, vm.selected?.id === item.id, handlers))}
              </ul>
            </nav>
            <div class="board-design-detail">
              ${vm.selected === null ? nothing : renderDesign(m, vm.selected, handlers)}
            </div>
          </div>`
    }
  </section>
`;

const renderIndexItem = (
  m: TaskBoardMessages,
  item: DesignListItemViewModel,
  selected: boolean,
  handlers: BoardHandlers,
): TemplateResult => html`
  <li>
    <button
      type="button"
      class="board-design-index-item"
      data-design-item=${item.id}
      aria-current=${ifDefined(selected ? 'true' : undefined)}
      title=${`${item.title} · ${m.laneCount(item.taskCount)}`}
      @click=${() => handlers.selectDesign(item.id)}
    >
      <span class="board-design-index-title">${item.title}</span>
      <span class="board-design-index-count" aria-hidden="true">${item.taskCount}</span>
    </button>
  </li>
`;

const renderDesign = (m: TaskBoardMessages, design: DesignViewModel, handlers: BoardHandlers): TemplateResult => html`
  <article
    class="dpk-card board-design"
    data-design=${design.id}
    data-dpk-target=${`design:${design.id}`}
    data-grill-questions=${ifDefined(design.questions)}
    aria-labelledby=${`board-design-${design.id}`}
  >
    <header class="board-design-head">
      <h3 class="board-design-title" id=${`board-design-${design.id}`}>${design.title}</h3>
      ${commentButton(`design:${design.id}`, m.commentOn(design.title), design.comments, handlers)}
    </header>
    ${
      design.body === null
        ? nothing
        : html`<div class="dpk-prose board-design-body">${unsafeHTML(renderMarkdown(design.body))}</div>`
    }
    <div class="board-design-figures"><slot name=${`design:${design.id}`}></slot></div>
    ${
      design.tasks.length === 0
        ? html`<p class="board-design-empty">${m.noDesignTasks}</p>`
        : html`<div class="board-design-tasks">
            <h4 class="board-design-tasks-title">${m.designTasks}</h4>
            <ul class="board-design-task-list">
              ${design.tasks.map((task) => renderTask(m, task))}
            </ul>
          </div>`
    }
  </article>
`;

const renderTask = (m: TaskBoardMessages, task: DesignTaskViewModel): TemplateResult => html`
  <li
    class="board-design-task"
    data-design-task=${task.id}
    data-status=${task.status}
    data-proposal=${task.proposal ?? 'none'}
  >
    <span class="board-todo-state" data-status=${task.status}>${task.statusLabel}</span>
    <span class="board-design-task-title">${task.title}</span>
    ${
      task.proposal === 'pending' || task.proposal === 'decline'
        ? html`<span
            class="board-card-mark"
            data-proposal=${task.proposal}
            role="img"
            aria-label=${m.proposedMark}
            title=${m.proposedMark}
            >?</span
          >`
        : nothing
    }
  </li>
`;
