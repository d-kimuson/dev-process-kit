import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { AnswerInput } from '../actions';
import type { GrillChoiceViewModel, GrillPanelViewModel, GrillQuestionViewModel } from '../present';

export type PanelHandlers = {
  readonly open: (questionId: string) => void;
  readonly answer: (questionId: string, answer: AnswerInput) => void;
  /** Move on without changing the answer (the free-text commit gesture). */
  readonly next: (questionId: string) => void;
};

/**
 * The question list. It renders view data and turns DOM events into handler
 * calls without owning question or navigation state.
 */
export const renderQuestionPanel = (vm: GrillPanelViewModel, handlers: PanelHandlers): TemplateResult => html`
  <div class="grill-list">
    ${
      vm.questions.length === 0
        ? html`<p class="grill-empty">該当する質問はありません。</p>`
        : repeat(
            vm.questions,
            (question) => question.id,
            (question) => renderQuestion(question, handlers),
          )
    }
  </div>
`;

const renderQuestion = (question: GrillQuestionViewModel, handlers: PanelHandlers): TemplateResult => html`
  <section class="grill-question" data-question=${question.id} data-answered=${String(question.answered)}>
    <button
      class="grill-heading"
      type="button"
      aria-expanded=${question.open ? 'true' : 'false'}
      aria-controls=${`grill-body-${question.id}`}
      @click=${() => handlers.open(question.id)}
    >
      <span class="grill-ref">${question.ref}</span>
      <span class="grill-heading-text">
        <strong>${question.title}</strong>
        ${!question.open && question.answered ? html`<span class="grill-summary">${question.summary}</span>` : nothing}
      </span>
      <span class="grill-chevron" aria-hidden="true">${question.open ? '−' : '+'}</span>
    </button>
    ${
      question.open
        ? html`<div class="grill-body" id=${`grill-body-${question.id}`}>
            ${question.description ? html`<p class="grill-description">${question.description}</p>` : nothing}
            ${question.note ? html`<p class="grill-note">${question.note}</p>` : nothing}
            <div class="grill-choices" role="radiogroup" aria-label=${question.title}>
              ${question.choices.map((choice) => renderChoice(question.id, choice, handlers))}
              ${
                question.allowFreeText
                  ? html`<label class="grill-choice grill-choice--free" data-free=${String(question.freeSelected)}>
                      <input
                        type="radio"
                        name=${`grill-${question.id}`}
                        value="__free"
                        .checked=${question.freeSelected}
                        @change=${() => handlers.answer(question.id, { kind: 'free', text: '' })}
                      />
                      <span class="grill-choice-text">自由記述</span>
                    </label>`
                  : nothing
              }
            </div>
            ${
              question.allowFreeText
                ? html`<textarea
                    class="af-textarea grill-free"
                    data-free-text=${question.id}
                    aria-label=${`${question.ref} の自由記述`}
                    placeholder="回答を入力…（⌘/Ctrl+Enter で次へ）"
                    .value=${question.draft}
                    ?hidden=${!question.freeSelected}
                    @input=${(event: Event) => {
                      const area = event.currentTarget;
                      if (!(area instanceof HTMLTextAreaElement)) return;
                      handlers.answer(question.id, { kind: 'free', text: area.value });
                    }}
                    @keydown=${(event: KeyboardEvent) => {
                      if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return;
                      event.preventDefault();
                      handlers.next(question.id);
                    }}
                  ></textarea>`
                : nothing
            }
            ${
              question.answered
                ? html`<button
                    type="button"
                    class="grill-clear"
                    @click=${() => handlers.answer(question.id, { kind: 'clear' })}
                  >
                    回答をクリア
                  </button>`
                : nothing
            }
          </div>`
        : nothing
    }
  </section>
`;

const renderChoice = (
  questionId: string,
  choice: GrillChoiceViewModel,
  handlers: PanelHandlers,
): TemplateResult => html`
  <label class="grill-choice" data-choice=${choice.id}>
    <input
      type="radio"
      name=${`grill-${questionId}`}
      value=${choice.id}
      .checked=${choice.checked}
      @change=${() => handlers.answer(questionId, { kind: 'option', optionId: choice.id })}
    />
    <span class="grill-choice-text">
      <span class="grill-letter">(${choice.letter})</span>
      <span>${choice.label}</span>
    </span>
  </label>
`;
