import { html, nothing, type TemplateResult } from 'lit';

import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { TaskBoardState } from './model';

import { TemplateElement } from '../../core/element';
import { createEntityId } from '../../core/target';
import { copyText } from '../../lib/dom/clipboard';
import { addTodo, answerQuestion, decideProposal, deleteTodo, setTodoStatus, type AnswerInput } from './actions';
import { taskBoardDefinitionFor } from './definition';
import { taskBoardMessages, type TaskBoardMessages } from './messages';
import {
  presentContext,
  presentLog,
  presentOutputs,
  presentQuestions,
  presentTodos,
  taskStatusLabel,
  type TodoFilter,
} from './present';
import { renderContext } from './render/context';
import { renderQuestions } from './render/questions';
import { renderLog, renderOutputs } from './render/records';
import { type BoardHandlers } from './render/shared';
import { renderTabPanel, renderTabs, tabAfterKey, type BoardTab } from './render/tabs';
import { renderTodos } from './render/todos';
import { taskBoardStyles } from './styles';

/** How long a copy button shows its check mark. */
const COPIED_MS = 1500;

/**
 * `<dpk-template-task-board>` — where one collaborative task stands.
 *
 * The main area is one tab at a time: what the task is about (a short design
 * doc with the author's diagrams), the conversation so far — its newest entry
 * says where the task stands — and what the agent asks. The right rail is the work itself — the
 * outputs to open or copy and the todo list, proposals included — and stays in
 * view. Every reply, decision and edit is a draft action the review hands back;
 * the review floats over the rail rather than pushing the board aside.
 */
export class DpkTemplateTaskBoard extends TemplateElement<TaskBoardState> {
  static override styles = [TemplateElement.styles, taskBoardStyles];

  static override properties = {
    tab: { state: true },
    todoFilter: { state: true },
  };

  declare private tab: BoardTab;
  declare private todoFilter: TodoFilter;

  /** The answer box to focus once "answer differently" is picked. */
  #focusAnswer: string | null = null;
  /** The output whose copy button shows the check mark. */
  #copied: string | null = null;
  #copiedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.tab = 'context';
    this.todoFilter = 'all';
  }

  protected override definitionFor(locale: Locale) {
    return taskBoardDefinitionFor(locale);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.#copiedTimer);
  }

  protected override renderRegions(context: TemplateRenderContext<TaskBoardState>): ShellRegions {
    const m = taskBoardMessages(this.locale);
    const count = (target: string): number => context.commentCount(target);
    const questions = presentQuestions(context.state, count);
    const log = presentLog(m, context.state, count);
    const handlers = this.#handlers();
    const tab = this.tab;
    return {
      header: this.#renderHeaderStatus(m, context.state),
      sidebar: html`
        <div class="board-rail">
          ${renderOutputs(m, presentOutputs(context.state), this.#copied, handlers)}
          ${renderTodos(m, presentTodos(m, context.state, context.base, count, this.todoFilter), handlers)}
        </div>
      `,
      main: html`
        <div class="board">
          ${renderTabs(
            m,
            tab,
            { log: log.entries.length, questions: questions.open, alert: questions.blockingOpen > 0 },
            (next) => {
              this.tab = next;
            },
            (event) => this.#tabKey(event),
          )}
          ${renderTabPanel(
            'context',
            tab,
            renderContext(m, presentContext(m, context.state, count), this.#hasFigures(), handlers),
          )}
          ${renderTabPanel('log', tab, renderLog(m, log, handlers))}
          ${renderTabPanel(
            'questions',
            tab,
            questions.total === 0
              ? html`<p class="board-empty">${m.noQuestions}</p>`
              : renderQuestions(m, questions, handlers),
          )}
        </div>
      `,
    };
  }

  protected override updated(): void {
    super.updated();
    const focus = this.#focusAnswer;
    if (focus === null) return;
    this.#focusAnswer = null;
    this.renderRoot.querySelector<HTMLTextAreaElement>(`[data-answer-text="${focus}"]`)?.focus();
  }

  #tabKey(event: KeyboardEvent): void {
    const next = tabAfterKey(this.tab, event.key);
    if (next === null) return;
    event.preventDefault();
    this.tab = next;
    void this.updateComplete.then(() =>
      this.renderRoot.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus(),
    );
  }

  /** The agent's status stays in view while the reader scrolls the board. */
  #renderHeaderStatus(m: TaskBoardMessages, state: TaskBoardState): TemplateResult | typeof nothing {
    if (state.status === null) return nothing;
    return html`<span class="board-status board-status--header" data-status=${state.status}>
      <span class="board-status-dot" aria-hidden="true"></span>${taskStatusLabel(m, state.status)}
    </span>`;
  }

  /** The author put diagrams (or any markup) in `slot="main"`: they are context too. */
  #hasFigures(): boolean {
    return this.querySelector(':scope > [slot="main"]') !== null;
  }

  #handlers(): BoardHandlers {
    return {
      answer: (questionId, answer) => this.#answer(questionId, answer),
      answerOther: (questionId) => this.#answerOther(questionId),
      decide: (todoId, decision) => this.dispatch(decideProposal(todoId, decision)),
      setStatus: (todoId, status) => this.dispatch(setTodoStatus(todoId, status)),
      filterTodos: (filter) => {
        this.todoFilter = filter;
      },
      addTodo: (title, assignee) => this.#addTodo(title, assignee),
      deleteTodo: (todoId) => this.dispatch(deleteTodo(todoId)),
      copy: (outputId, href) => void this.#copy(outputId, href),
      comment: (target) => this.requestComment(target),
    };
  }

  #answer(questionId: string, answer: AnswerInput): void {
    this.dispatch(answerQuestion(questionId, answer));
  }

  /** An empty answer opens the box; it counts as a reply once it says something. */
  #answerOther(questionId: string): void {
    const outcome = this.dispatch(answerQuestion(questionId, { kind: 'answer', text: '' }));
    if (outcome.ok) this.#focusAnswer = questionId;
  }

  /** A new todo's id is taken from its title, clear of every todo the board has had. */
  #addTodo(title: string, assignee: string | null): void {
    const { base, state } = this.derivation;
    const taken = [...base.todos, ...state.todos].map((todo) => todo.id);
    this.dispatch(addTodo(createEntityId(title, taken), title, assignee));
  }

  async #copy(outputId: string, href: string): Promise<void> {
    if (!(await copyText(href))) return;
    clearTimeout(this.#copiedTimer);
    this.#copied = outputId;
    this.requestUpdate();
    this.#copiedTimer = setTimeout(() => {
      this.#copied = null;
      this.requestUpdate();
    }, COPIED_MS);
  }
}

export const defineTaskBoardElement = (): void => {
  if (!customElements.get('dpk-template-task-board')) {
    customElements.define('dpk-template-task-board', DpkTemplateTaskBoard);
  }
};
