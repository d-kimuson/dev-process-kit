/**
 * The questions the page asks, in the review popover: the current ones to
 * answer, and the earlier rounds to look back at. The open question and the
 * round shown are the shell's UI state; the answers are the draft's.
 */
import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { CoreMessages } from '../messages';

import {
  answerCounts,
  answerText,
  findQuestion,
  GRILL_TARGET_TYPE,
  optionLetter,
  type AnswerPayload,
  type Grill,
  type GrillAnswer,
  type GrillAnswers,
  type GrillQuestion,
} from '../grill';
import { iconChevronRight } from '../icons';
import { targetRef } from '../target';

/** Which questions the panel shows: the current ones, or an earlier round by its `history` index. */
export type GrillRoundSelection = 'current' | number;

export type GrillPanelState = {
  /** The question unfolded; the first one when it is gone or none was picked. */
  readonly open: string | null;
  readonly round: GrillRoundSelection;
};

export type GrillChoiceViewModel = {
  readonly id: string;
  readonly letter: string;
  readonly label: string;
  readonly checked: boolean;
};

export type GrillQuestionViewModel = {
  readonly id: string;
  readonly ref: string;
  readonly title: string;
  readonly description: string | null;
  readonly note: string | null;
  readonly open: boolean;
  readonly answered: boolean;
  /** The chosen answer, shown while the question is folded. */
  readonly summary: string;
  readonly choices: readonly GrillChoiceViewModel[];
  readonly draft: string;
  readonly freeSelected: boolean;
  readonly allowFreeText: boolean;
};

export type GrillPastQuestionViewModel = {
  readonly id: string;
  readonly ref: string;
  readonly title: string;
  readonly description: string | null;
  readonly note: string | null;
  readonly answered: boolean;
  /** The recorded answer, or the "not answered" label. */
  readonly summary: string;
  readonly choices: readonly GrillChoiceViewModel[];
  /** The answer given in the reader's own words, if that is what they did. */
  readonly freeText: string | null;
};

export type GrillRoundChoice = {
  readonly value: string;
  readonly label: string;
  readonly selected: boolean;
};

export type GrillPanelViewModel = {
  readonly progress: string;
  /** Empty without history: there is nothing to choose between. */
  readonly rounds: readonly GrillRoundChoice[];
  readonly view:
    | { readonly kind: 'current'; readonly questions: readonly GrillQuestionViewModel[] }
    | { readonly kind: 'past'; readonly note: string; readonly questions: readonly GrillPastQuestionViewModel[] };
};

export const openQuestionOf = (grill: Grill, open: string | null): string | null =>
  open !== null && findQuestion(grill, open) ? open : (grill.questions[0]?.id ?? null);

/** A selection that no longer names a round (the questions changed) falls back to the current ones. */
export const resolveRound = (grill: Grill, round: GrillRoundSelection): GrillRoundSelection =>
  round !== 'current' && grill.rounds[round] !== undefined ? round : 'current';

const presentChoices = (question: GrillQuestion, answer: GrillAnswer | null | undefined) =>
  question.options.map((option, index) => ({
    id: option.id,
    letter: optionLetter(index),
    label: option.label,
    checked: answer?.kind === 'option' && answer.optionId === option.id,
  }));

const presentRounds = (m: CoreMessages, grill: Grill, round: GrillRoundSelection): readonly GrillRoundChoice[] => {
  if (grill.rounds.length === 0) return [];
  const past = grill.rounds.map((entry, index) => ({
    value: String(index),
    label: m.grillRoundOption(entry.label, entry.questions.length),
    selected: round === index,
  }));
  // The newest round is the one just before the current questions.
  return [
    {
      value: 'current',
      label: m.grillRoundOption(m.grillCurrentRound, grill.questions.length),
      selected: round === 'current',
    },
    ...past.reverse(),
  ];
};

/** No DOM or callbacks: the questions, the answers and the panel's state in, view data out. */
export const presentGrillPanel = (
  m: CoreMessages,
  grill: Grill,
  answers: GrillAnswers,
  state: GrillPanelState,
): GrillPanelViewModel => {
  const counts = answerCounts(grill, answers);
  const round = resolveRound(grill, state.round);
  const rounds = presentRounds(m, grill, round);
  const progress = m.grillProgress(counts.answered, counts.total);
  const past = round === 'current' ? undefined : grill.rounds[round];
  if (past !== undefined) {
    return {
      progress,
      rounds,
      view: {
        kind: 'past',
        note: m.grillPastRound(past.label),
        questions: past.questions.map((question) => {
          const summary = answerText(question, question.answer);
          return {
            id: question.id,
            ref: question.ref,
            title: question.title,
            description: question.description,
            note: question.note,
            answered: summary !== '',
            summary: summary === '' ? m.grillUnanswered : summary,
            choices: presentChoices(question, question.answer),
            freeText: question.answer?.kind === 'free' ? question.answer.text : null,
          };
        }),
      },
    };
  }
  const open = openQuestionOf(grill, state.open);
  return {
    progress,
    rounds,
    view: {
      kind: 'current',
      questions: grill.questions.map((question) => {
        const answer = answers[question.id];
        const summary = answerText(question, answer);
        return {
          id: question.id,
          ref: question.ref,
          title: question.title,
          description: question.description,
          note: question.note,
          open: question.id === open,
          answered: summary !== '',
          summary,
          choices: presentChoices(question, answer),
          draft: answer?.kind === 'free' ? answer.text : '',
          freeSelected: answer?.kind === 'free',
          allowFreeText: question.freeText,
        };
      }),
    },
  };
};

/* ------------------------------------------------------------------ view */

export type GrillPanelIntents = {
  readonly open: (questionId: string) => void;
  readonly answer: (questionId: string, payload: AnswerPayload) => void;
  /** Move on without changing the answer (the free-text commit gesture). */
  readonly next: (questionId: string) => void;
  readonly pickRound: (round: GrillRoundSelection) => void;
};

/**
 * Renders view data and turns DOM events into intents, without owning the
 * answers or the open question. The footer is the shell's hand-off.
 */
export const renderGrillPanel = (
  m: CoreMessages,
  vm: GrillPanelViewModel,
  intents: GrillPanelIntents,
  footer: TemplateResult | typeof nothing,
): TemplateResult => html`
  <div class="dpk-grill">
    <header class="dpk-grill-head">
      <h2>${m.grill}</h2>
      <span class="dpk-grill-progress">${vm.progress}</span>
    </header>
    ${
      vm.rounds.length === 0
        ? nothing
        : html`<div class="dpk-grill-rounds">
            <select
              class="dpk-grill-round"
              aria-label=${m.grillRoundSelect}
              @change=${(event: Event) => {
                const select = event.currentTarget;
                if (!(select instanceof HTMLSelectElement)) return;
                intents.pickRound(select.value === 'current' ? 'current' : Number(select.value));
              }}
            >
              ${vm.rounds.map(
                (choice) => html`<option value=${choice.value} ?selected=${choice.selected}>${choice.label}</option>`,
              )}
            </select>
          </div>`
    }
    <div class="dpk-grill-list">
      ${vm.view.kind === 'past' ? html`<p class="dpk-grill-round-note">${vm.view.note}</p>` : nothing}
      ${
        vm.view.questions.length === 0
          ? html`<p class="dpk-grill-empty">${m.grillNoQuestions}</p>`
          : vm.view.kind === 'current'
            ? repeat(
                vm.view.questions,
                (question) => question.id,
                (question) => renderQuestion(m, question, intents),
              )
            : repeat(vm.view.questions, (question) => question.id, renderPastQuestion)
      }
    </div>
    ${footer}
  </div>
`;

const renderQuestion = (
  m: CoreMessages,
  question: GrillQuestionViewModel,
  intents: GrillPanelIntents,
): TemplateResult => html`
  <section
    class="dpk-grill-question"
    data-question=${question.id}
    data-answered=${String(question.answered)}
    data-dpk-target=${targetRef({ type: GRILL_TARGET_TYPE, id: question.id })}
  >
    <button
      class="dpk-grill-heading"
      type="button"
      aria-expanded=${question.open ? 'true' : 'false'}
      aria-controls=${`dpk-grill-body-${question.id}`}
      @click=${() => intents.open(question.id)}
    >
      <span class="dpk-grill-ref">${question.ref}</span>
      <span class="dpk-grill-heading-text">
        <strong>${question.title}</strong>
        ${
          !question.open && question.answered
            ? html`<span class="dpk-grill-summary">${question.summary}</span>`
            : nothing
        }
      </span>
      <span class="dpk-grill-chevron" aria-hidden="true">${iconChevronRight()}</span>
    </button>
    ${
      question.open
        ? html`<div class="dpk-grill-body" id=${`dpk-grill-body-${question.id}`}>
            ${question.description ? html`<p class="dpk-grill-description">${question.description}</p>` : nothing}
            ${question.note ? html`<p class="dpk-grill-note">${question.note}</p>` : nothing}
            <div class="dpk-grill-choices" role="radiogroup" aria-label=${question.title}>
              ${question.choices.map((choice) => renderChoice(question.id, choice, intents))}
              ${
                question.allowFreeText
                  ? html`<label class="dpk-grill-choice" data-free=${String(question.freeSelected)}>
                      <input
                        type="radio"
                        name=${`dpk-grill-${question.id}`}
                        value="__free"
                        .checked=${question.freeSelected}
                        @change=${() => intents.answer(question.id, { kind: 'free', text: '' })}
                      />
                      <span class="dpk-grill-choice-text">${m.grillFreeText}</span>
                    </label>`
                  : nothing
              }
            </div>
            ${
              question.allowFreeText
                ? html`<textarea
                    class="dpk-textarea dpk-grill-free"
                    data-free-text=${question.id}
                    aria-label=${m.grillFreeTextOf(question.ref)}
                    placeholder=${m.grillFreeTextPlaceholder}
                    .value=${question.draft}
                    ?hidden=${!question.freeSelected}
                    @input=${(event: Event) => {
                      const area = event.currentTarget;
                      if (!(area instanceof HTMLTextAreaElement)) return;
                      intents.answer(question.id, { kind: 'free', text: area.value });
                    }}
                    @keydown=${(event: KeyboardEvent) => {
                      if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return;
                      event.preventDefault();
                      intents.next(question.id);
                    }}
                  ></textarea>`
                : nothing
            }
            ${
              question.answered || question.freeSelected
                ? html`<button
                    type="button"
                    class="dpk-grill-clear"
                    @click=${() => intents.answer(question.id, { kind: 'clear' })}
                  >
                    ${m.grillAnswerClear}
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
  intents: GrillPanelIntents,
): TemplateResult => html`
  <label class="dpk-grill-choice" data-choice=${choice.id}>
    <input
      type="radio"
      name=${`dpk-grill-${questionId}`}
      value=${choice.id}
      .checked=${choice.checked}
      @change=${() => intents.answer(questionId, { kind: 'option', optionId: choice.id })}
    />
    <span class="dpk-grill-choice-text">
      <span class="dpk-grill-letter">(${choice.letter})</span>
      <span>${choice.label}</span>
    </span>
  </label>
`;

/** An earlier round, read-only: each question folds to its recorded answer. */
const renderPastQuestion = (question: GrillPastQuestionViewModel): TemplateResult => html`
  <details class="dpk-grill-question" data-past data-question=${question.id} data-answered=${String(question.answered)}>
    <summary class="dpk-grill-heading">
      <span class="dpk-grill-ref">${question.ref}</span>
      <span class="dpk-grill-heading-text">
        <strong>${question.title}</strong>
        <span class="dpk-grill-summary">${question.summary}</span>
      </span>
      <span class="dpk-grill-chevron" aria-hidden="true">${iconChevronRight()}</span>
    </summary>
    <div class="dpk-grill-body">
      ${question.description ? html`<p class="dpk-grill-description">${question.description}</p>` : nothing}
      ${question.note ? html`<p class="dpk-grill-note">${question.note}</p>` : nothing}
      ${
        question.choices.length === 0
          ? nothing
          : html`<ul class="dpk-grill-past-choices">
              ${question.choices.map(
                (choice) => html`<li class="dpk-grill-past-choice" data-checked=${String(choice.checked)}>
                  <span class="dpk-grill-letter">(${choice.letter})</span>
                  <span>${choice.label}</span>
                </li>`,
              )}
            </ul>`
      }
      ${
        question.freeText === null
          ? nothing
          : html`<p class="dpk-grill-past-choice" data-checked="true">${question.freeText}</p>`
      }
    </div>
  </details>
`;
