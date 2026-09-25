import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TaskBoardMessages } from '../messages';
import type { ContextPartViewModel, ContextViewModel } from '../present';

import { commentButton, type BoardHandlers } from './shared';

/**
 * What the task is about, as a short design doc: why it is done, what it
 * changes, what counts as done and what is left out. Whoever comes back to the
 * task — the agent or the person — reads this first. The author's own diagrams
 * (`slot="main"`: an ER diagram, a sequence…) follow the prose.
 */
export const renderContext = (
  m: TaskBoardMessages,
  vm: ContextViewModel,
  hasFigures: boolean,
  handlers: BoardHandlers,
): TemplateResult => html`
  <section class="board-context" aria-label=${m.context}>
    ${vm.parts.length === 0 && !hasFigures ? html`<p class="board-empty">${m.noContext}</p>` : nothing}
    ${
      vm.parts.length === 0
        ? nothing
        : html`<div class="board-context-parts">
            ${repeat(
              vm.parts,
              (part) => part.id,
              (part) => renderPart(m, part, handlers),
            )}
          </div>`
    }
    <div class="board-figures"><slot name="main"></slot></div>
  </section>
`;

const renderPart = (m: TaskBoardMessages, part: ContextPartViewModel, handlers: BoardHandlers): TemplateResult => html`
  <article class="board-context-part" data-context=${part.id} aria-labelledby=${`board-context-${part.id}`}>
    <header class="board-context-head">
      <h3 class="board-context-title" id=${`board-context-${part.id}`}>${part.title}</h3>
      ${commentButton(`context:${part.id}`, m.commentOn(part.title), part.comments, handlers)}
    </header>
    ${part.text === null ? nothing : html`<p class="board-context-text">${part.text}</p>`}
    ${
      part.items.length === 0
        ? nothing
        : html`<ul class="board-context-items">
            ${part.items.map((item) => html`<li>${item}</li>`)}
          </ul>`
    }
  </article>
`;
