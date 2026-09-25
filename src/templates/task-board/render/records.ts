import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TaskBoardMessages } from '../messages';
import type { LogEntryViewModel, LogViewModel, OutputViewModel, TaskStatusViewModel } from '../present';

import { iconCheck, iconCopy } from '../../../core/icons';
import { commentButton, sectionHead, type BoardHandlers } from './shared';

/**
 * What the agent has produced so far, one tight row each: a URL opens in a new
 * tab, a file path is shown as text, and either one copies with a click.
 */
export const renderOutputs = (
  m: TaskBoardMessages,
  outputs: readonly OutputViewModel[],
  copied: string | null,
  handlers: BoardHandlers,
): TemplateResult => html`
  <section class="board-section board-rail-section" data-section="outputs" aria-labelledby="board-outputs">
    ${sectionHead('board-outputs', m.outputs, outputs.length === 0 ? null : String(outputs.length))}
    ${
      outputs.length === 0
        ? html`<p class="board-empty">${m.noOutputs}</p>`
        : html`<ul class="board-outputs">
            ${repeat(
              outputs,
              (output) => output.id,
              (output) => renderOutput(m, output, copied === output.id, handlers),
            )}
          </ul>`
    }
  </section>
`;

const renderOutput = (
  m: TaskBoardMessages,
  output: OutputViewModel,
  copied: boolean,
  handlers: BoardHandlers,
): TemplateResult => {
  const place = output.place;
  const copyLabel = copied ? m.copied : m.copy(output.href);
  return html`
    <li class="board-output" data-output=${output.id} data-place=${place.kind}>
      <div class="board-output-body">
        <div class="board-output-head">
          ${output.kind === null ? nothing : html`<span class="board-kind">${output.kind}</span>`}
          ${
            place.kind === 'url'
              ? html`<a class="board-output-link" href=${output.href} target="_blank" rel="noopener noreferrer"
                  >${output.title}</a
                >`
              : output.labelled
                ? html`<span class="board-output-label">${output.title}</span>`
                : html`<code class="board-output-path">${output.href}</code>`
          }
        </div>
        ${
          place.kind === 'url'
            ? html`<span class="board-output-sub">${place.host}</span>`
            : output.labelled
              ? html`<code class="board-output-path board-output-sub">${output.href}</code>`
              : nothing
        }
        ${output.description === null ? nothing : html`<p class="board-output-text">${output.description}</p>`}
      </div>
      <button
        class="dpk-icon-btn board-copy"
        type="button"
        data-copied=${String(copied)}
        aria-label=${copyLabel}
        title=${copyLabel}
        @click=${() => handlers.copy(output.id, output.href)}
      >
        ${copied ? iconCheck() : iconCopy()}
      </button>
    </li>
  `;
};

/** Where the task stands, as the agent last put it. */
const renderStatus = (m: TaskBoardMessages, status: TaskStatusViewModel): TemplateResult => html`
  <div class="board-log-now">
    ${
      status.status === null
        ? nothing
        : html`<span class="board-status" data-status=${status.status}>
            <span class="board-status-dot" aria-hidden="true"></span>${status.label}
          </span>`
    }
    ${status.updatedAt === null ? nothing : html`<span class="board-updated">${m.updatedAt(status.updatedAt)}</span>`}
  </div>
`;

/**
 * The conversation between the person and the agent, newest first: what was
 * asked, agreed and reported — not every step, which the todos carry. The
 * newest entry also says where the task stands now.
 */
export const renderLog = (m: TaskBoardMessages, vm: LogViewModel, handlers: BoardHandlers): TemplateResult => html`
  <section class="board-section" data-section="log" aria-labelledby="board-log">
    ${sectionHead('board-log', m.log, vm.entries.length === 0 ? null : m.logLede)}
    ${
      vm.entries.length === 0
        ? html`${vm.status === null ? nothing : renderStatus(m, vm.status)}
            <p class="board-empty">${m.noLog}</p>`
        : html`<ol class="board-log">
            ${repeat(
              vm.entries,
              (entry) => entry.id,
              (entry) => renderEntry(m, entry, entry.latest ? vm.status : null, handlers),
            )}
          </ol>`
    }
  </section>
`;

const renderEntry = (
  m: TaskBoardMessages,
  entry: LogEntryViewModel,
  status: TaskStatusViewModel | null,
  handlers: BoardHandlers,
): TemplateResult => {
  const name = entry.author?.name ?? m.fromAgent;
  return html`
    <li
      class="board-log-entry"
      data-log=${entry.id}
      data-from=${entry.author?.kind ?? 'agent'}
      data-latest=${String(entry.latest)}
    >
      <span class="board-log-avatar" aria-hidden="true">${name.slice(0, 1)}</span>
      <div class="board-log-body">
        ${status === null ? nothing : renderStatus(m, status)}
        <div class="board-log-head">
          <span class="board-log-author">${name}</span>
          ${entry.at === null ? nothing : html`<time class="board-log-at">${entry.at}</time>`}
          ${entry.latest ? html`<span class="board-log-latest">${m.latestTag}</span>` : nothing}
          ${commentButton(`log:${entry.id}`, m.commentOn(entry.label), entry.comments, handlers)}
        </div>
        ${entry.title === null ? nothing : html`<h3 class="board-log-title">${entry.title}</h3>`}
        ${entry.body === null ? nothing : html`<p class="board-log-text">${entry.body}</p>`}
        ${
          entry.points.length === 0
            ? nothing
            : html`<ul class="board-log-points">
                ${entry.points.map((point) => html`<li>${point}</li>`)}
              </ul>`
        }
      </div>
    </li>
  `;
};
