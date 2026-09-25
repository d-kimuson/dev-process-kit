import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TaskBoardMessages } from '../messages';
import type { QuestionViewModel, QuestionsViewModel } from '../present';

import { iconCheck } from '../../../core/icons';
import { commentButton, sectionHead, type BoardHandlers } from './shared';

/**
 * What the agent asks the reader. Blocking questions come first: the agent
 * waits on them. The rest it works on under an assumption, so the reader only
 * approves it or says what they expect instead — the work never stops for them.
 */
export const renderQuestions = (
  m: TaskBoardMessages,
  vm: QuestionsViewModel,
  handlers: BoardHandlers,
): TemplateResult | typeof nothing => {
  if (vm.total === 0) return nothing;
  return html`
    <section class="board-section" data-section="questions" aria-labelledby="board-questions">
      ${sectionHead('board-questions', m.questions, m.questionsProgress(vm.resolved, vm.total))}
      ${renderGroup(m, 'blocking', m.blockingGroup, vm.blocking, handlers)}
      ${renderGroup(m, 'provisional', m.provisionalGroup, vm.provisional, handlers)}
    </section>
  `;
};

const renderGroup = (
  m: TaskBoardMessages,
  group: 'blocking' | 'provisional',
  title: string,
  questions: readonly QuestionViewModel[],
  handlers: BoardHandlers,
): TemplateResult | typeof nothing =>
  questions.length === 0
    ? nothing
    : html`<div class="board-group" data-group=${group}>
        <h3 class="board-group-title">${title}</h3>
        <ol class="board-questions">
          ${repeat(
            questions,
            (question) => question.id,
            (question) => renderQuestion(m, question, handlers),
          )}
        </ol>
      </div>`;

const renderQuestion = (m: TaskBoardMessages, question: QuestionViewModel, handlers: BoardHandlers): TemplateResult => {
  const hasAssumption = question.assumption !== null;
  return html`
    <li
      class="board-card board-question"
      data-question=${question.id}
      data-blocking=${String(question.blocking)}
      data-reply=${question.reply}
      data-resolved=${String(question.resolved)}
    >
      <div class="board-card-head">
        <span class="board-ref">${question.ref}</span>
        <h4 class="board-card-title">${question.title}</h4>
        ${
          question.resolved
            ? html`<span class="board-tag" data-tone="done">
                ${question.reply === 'approve' ? m.approvedTag : m.answeredTag}
              </span>`
            : nothing
        }
        ${commentButton(`question:${question.id}`, m.commentOn(question.ref), question.comments, handlers)}
      </div>
      ${question.description === null ? nothing : html`<p class="board-card-text">${question.description}</p>`}
      ${hasAssumption ? renderAssumption(m, question, handlers) : nothing}
      <textarea
        class="dpk-textarea board-answer"
        data-answer-text=${question.id}
        rows="2"
        aria-label=${m.answerOf(question.ref)}
        placeholder=${hasAssumption ? m.answerPlaceholder : m.blockingPlaceholder}
        .value=${question.draft}
        ?hidden=${hasAssumption && question.reply !== 'answer'}
        @input=${(event: Event) => {
          const area = event.currentTarget;
          if (!(area instanceof HTMLTextAreaElement)) return;
          // With no assumption to fall back on, an emptied box is no reply at all.
          handlers.answer(
            question.id,
            !hasAssumption && area.value === '' ? { kind: 'clear' } : { kind: 'answer', text: area.value },
          );
        }}
      ></textarea>
    </li>
  `;
};

/** The assumption (or, on a blocking question, the recommendation) and the two ways to reply to it. */
const renderAssumption = (
  m: TaskBoardMessages,
  question: QuestionViewModel,
  handlers: BoardHandlers,
): TemplateResult => html`
  <div class="board-assumption">
    <span class="board-assumption-label">${question.blocking ? m.recommendation : m.assumption}</span>
    <p class="board-assumption-text">${question.assumption}</p>
  </div>
  <div class="board-reply" role="group" aria-label=${m.answerOf(question.ref)}>
    <button
      type="button"
      class="dpk-btn board-approve"
      aria-pressed=${question.reply === 'approve' ? 'true' : 'false'}
      @click=${() => handlers.answer(question.id, question.reply === 'approve' ? { kind: 'clear' } : { kind: 'approve' })}
    >
      ${iconCheck()} ${question.blocking ? m.approveRecommendation : m.approveAssumption}
    </button>
    <button
      type="button"
      class="dpk-btn dpk-btn--ghost board-other"
      aria-pressed=${question.reply === 'answer' ? 'true' : 'false'}
      @click=${() =>
        question.reply === 'answer'
          ? handlers.answer(question.id, { kind: 'clear' })
          : handlers.answerOther(question.id)}
    >
      ${m.answerOther}
    </button>
  </div>
`;
