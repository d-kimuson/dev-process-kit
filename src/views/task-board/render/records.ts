import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TaskBoardMessages } from '../messages';
import type { OutputViewModel } from '../present';

import { iconCheck, iconCopy } from '../../../core/icons';
import { sectionHead, type BoardHandlers } from './shared';

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
        ? html`<p class="dpk-empty board-empty" data-variant="dashed">${m.noOutputs}</p>`
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
    <li
      class="dpk-list-row board-output"
      data-output=${output.id}
      data-place=${place.kind}
      data-grill-questions=${output.questions}
    >
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
