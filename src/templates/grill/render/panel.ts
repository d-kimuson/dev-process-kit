import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { AnswerInput } from '../actions';
import type { GrillMessages } from '../messages';
import type {
  GrillChoiceViewModel,
  GrillPanelViewModel,
  GrillPastQuestionViewModel,
  GrillPastRoundViewModel,
  GrillQuestionViewModel,
} from '../present';

import { iconChevronRight } from '../../../core/icons';

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
export const renderQuestionPanel = (
  m: GrillMessages,
  vm: GrillPanelViewModel,
  handlers: PanelHandlers,
): TemplateResult => html`
  <div class="grill-list">
    ${
      vm.questions.length === 0
        ? html`<p class="grill-empty">${m.noQuestions}</p>`
        : repeat(
            vm.questions,
            (question) => question.id,
            (question) => renderQuestion(m, question, handlers),
          )
    }
  </div>
`;

const renderQuestion = (
  m: GrillMessages,
  question: GrillQuestionViewModel,
  handlers: PanelHandlers,
): TemplateResult => html`
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
      <span class="grill-chevron" aria-hidden="true">${iconChevronRight()}</span>
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
                      <span class="grill-choice-text">${m.freeText}</span>
                    </label>`
                  : nothing
              }
            </div>
            ${
              question.allowFreeText
                ? html`<textarea
                    class="dpk-textarea grill-free"
                    data-free-text=${question.id}
                    aria-label=${m.freeTextOf(question.ref)}
                    placeholder=${m.freeTextPlaceholder}
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
                    ${m.clearAnswer}
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

/**
 * An earlier round, read-only: each question folds to its recorded answer and
 * opens to the options it offered, with the chosen one marked.
 */
export const renderPastRound = (m: GrillMessages, vm: GrillPastRoundViewModel): TemplateResult => html`
  <div class="grill-list">
    <p class="grill-round-note">${m.pastRound(vm.label)}</p>
    ${
      vm.questions.length === 0
        ? html`<p class="grill-empty">${m.noQuestions}</p>`
        : repeat(
            vm.questions,
            (question) => question.id,
            (question) => renderPastQuestion(question),
          )
    }
  </div>
`;

const renderPastQuestion = (question: GrillPastQuestionViewModel): TemplateResult => html`
  <details
    class="grill-question grill-question--past"
    data-question=${question.id}
    data-answered=${String(question.answered)}
  >
    <summary class="grill-heading">
      <span class="grill-ref">${question.ref}</span>
      <span class="grill-heading-text">
        <strong>${question.title}</strong>
        <span class="grill-summary">${question.summary}</span>
      </span>
      <span class="grill-chevron" aria-hidden="true">${iconChevronRight()}</span>
    </summary>
    <div class="grill-body">
      ${question.description ? html`<p class="grill-description">${question.description}</p>` : nothing}
      ${question.note ? html`<p class="grill-note">${question.note}</p>` : nothing}
      ${
        question.choices.length === 0
          ? nothing
          : html`<ul class="grill-past-choices">
              ${question.choices.map(
                (choice) => html`<li class="grill-past-choice" data-checked=${String(choice.checked)}>
                  <span class="grill-letter">(${choice.letter})</span>
                  <span>${choice.label}</span>
                </li>`,
              )}
            </ul>`
      }
      ${
        question.freeText === null
          ? nothing
          : html`<p class="grill-past-choice grill-past-free" data-checked="true">${question.freeText}</p>`
      }
    </div>
  </details>
`;
