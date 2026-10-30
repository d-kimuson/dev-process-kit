import { html, nothing, type TemplateResult } from 'lit';

import type { Locale } from '../../core/i18n';
import type { SidebarLayout } from '../../core/layouts/sidebar/model';
import type { ShellRegions, ViewRenderContext } from '../../core/shell/contracts';
import type { ActionTarget } from '../../core/types';

import { atomStyles } from '../../components/atoms/styles';
import { defineSelect } from '../../components/select';
import { ViewElement } from '../../core/element';
import { SelectControllerRegistry } from '../../core/select/controller';
import { createEntityId } from '../../core/target';
import { copyText } from '../../lib/dom/clipboard';
import { addTodo, answerQuestion, decideProposal, deleteTodo, setTodoStatus, type AnswerInput } from './actions';
import { taskBoardDefinitionFor } from './definition';
import { taskBoardMessages, type TaskBoardMessages } from './messages';
import { findTodo, isHumanTodo, type TaskBoardState, type TodoStatus } from './model';
import {
  presentDesigns,
  presentOutputs,
  presentQuestions,
  presentTasks,
  taskStatusLabel,
  type TodoFilter,
} from './present';
import { renderDesigns } from './render/designs';
import { renderQuestions } from './render/questions';
import { renderOutputs } from './render/records';
import { type BoardHandlers } from './render/shared';
import { renderTabPanel, renderTabs, tabAfterKey, type BoardTab } from './render/tabs';
import { renderTasks } from './render/tasks';
import { taskBoardStyles } from './styles';

/** How long a copy button shows its check mark. */
const COPIED_MS = 1500;

/**
 * `<dpk-view-task-board>` — where a body of work shared with a person stands.
 *
 * The main area is one tab at a time: the design docs (each with the todos it
 * groups, and the author's diagrams under them), what the agent asks, and the
 * work itself as a board of todos by status. The left rail is what the agent
 * has produced — the outputs to open or copy — and stays in view: on the left
 * it is out of the way of the review, which floats over the page's right-hand
 * edge. Every reply, decision and edit is a draft action the review hands back.
 */
export class DpkViewTaskBoard extends ViewElement<TaskBoardState> {
  static override styles = [ViewElement.styles, atomStyles, taskBoardStyles];

  static override properties = {
    tab: { state: true },
    todoFilter: { state: true },
    selectedDesign: { state: true },
  };

  declare private tab: BoardTab;
  declare private todoFilter: TodoFilter;
  declare private selectedDesign: string | null;

  /** The answer box to focus once "answer differently" is picked. */
  #focusAnswer: string | null = null;
  /** The output whose copy button shows the check mark. */
  #copied: string | null = null;
  #copiedTimer: ReturnType<typeof setTimeout> | undefined;
  /** The todo a card is being dragged by, if any; dropping it sets its status. */
  #draggingTodo: string | null = null;
  /** One status select per todo, since each card needs its own stable open/active state. */
  readonly #statusSelects = new SelectControllerRegistry(this);

  constructor() {
    super();
    this.tab = 'designs';
    this.todoFilter = 'all';
    this.selectedDesign = null;
  }

  protected override get sidebarLayout(): SidebarLayout {
    return { side: 'left', defaultWidth: 288, narrow: 'drawer' };
  }

  protected override definitionFor(locale: Locale) {
    return taskBoardDefinitionFor(locale);
  }

  /** The board has no navigation: a change's target is brought forward by its tab, or by the todo filter. */
  protected override showTarget(target: ActionTarget): void {
    switch (target.type) {
      case 'design':
        this.tab = 'designs';
        this.selectedDesign = target.id;
        return;
      case 'question':
        this.tab = 'questions';
        return;
      case 'todo':
        this.tab = 'tasks';
        this.todoFilter = 'all';
        return;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.#copiedTimer);
  }

  protected override renderRegions(context: ViewRenderContext<TaskBoardState>): ShellRegions {
    const m = taskBoardMessages(this.locale);
    const count = (target: string): number => context.commentCount(target);
    const questions = presentQuestions(context.state, count);
    const handlers = this.#handlers();
    const tab = this.tab;
    return {
      header: this.#renderHeaderStatus(m, context.state),
      // The outputs sit on the left, clear of the review's own right-hand rail.
      sidebar: html`<div class="board-rail">
        ${renderOutputs(m, presentOutputs(context.state), this.#copied, handlers)}
      </div>`,
      main: html`
        <div class="board">
          ${renderTabs(
            m,
            tab,
            { questions: questions.open, alert: questions.blockingOpen > 0 },
            (next) => {
              this.tab = next;
            },
            (event) => this.#tabKey(event),
          )}
          ${renderTabPanel(
            'designs',
            tab,
            renderDesigns(m, presentDesigns(m, context.state, count, this.selectedDesign), handlers),
          )}
          ${renderTabPanel(
            'questions',
            tab,
            questions.total === 0
              ? html`<p class="dpk-empty board-empty" data-variant="dashed">${m.noQuestions}</p>`
              : renderQuestions(m, questions, handlers),
          )}
          ${renderTabPanel(
            'tasks',
            tab,
            renderTasks(
              m,
              presentTasks(m, context.state, context.base, count, this.todoFilter),
              handlers,
              this.#statusSelects,
            ),
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
    return html`<span class="dpk-status board-status board-status--header" data-status=${state.status}>
      ${taskStatusLabel(m, state.status)}
    </span>`;
  }

  #handlers(): BoardHandlers {
    return {
      answer: (questionId, answer) => this.#answer(questionId, answer),
      answerOther: (questionId) => this.#answerOther(questionId),
      decide: (todoId, decision) => this.dispatch(decideProposal(todoId, decision)),
      selectDesign: (designId) => {
        this.selectedDesign = designId;
      },
      setStatus: (todoId, status) => this.dispatch(setTodoStatus(todoId, status)),
      filterTodos: (filter) => {
        this.todoFilter = filter;
      },
      addTodo: (title, assignee) => this.#addTodo(title, assignee),
      deleteTodo: (todoId) => this.dispatch(deleteTodo(todoId)),
      beginTodoDrag: (todoId) => {
        this.#draggingTodo = todoId;
      },
      endTodoDrag: () => {
        this.#draggingTodo = null;
      },
      allowTodoDrop: (event) => {
        // Only a card being carried can be dropped; anything else is the page's own drag.
        if (this.#draggingTodo === null) return;
        event.preventDefault();
      },
      dropTodo: (status) => this.#dropTodo(status),
      copy: (outputId, href) => void this.#copy(outputId, href),
      comment: (target) => this.requestComment(target),
    };
  }

  /** A dropped card takes the status of the column it landed in: the same change its select makes. */
  #dropTodo(status: TodoStatus): void {
    const id = this.#draggingTodo;
    this.#draggingTodo = null;
    if (id === null) return;
    const { state } = this.derivation;
    const todo = findTodo(state, id);
    // Only a todo a person has: the agent reports its own progress by rewriting the board.
    if (todo === undefined || todo.status === status || !isHumanTodo(state, todo)) return;
    this.dispatch(setTodoStatus(id, status));
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
  defineSelect();
  if (!customElements.get('dpk-view-task-board')) {
    customElements.define('dpk-view-task-board', DpkViewTaskBoard);
  }
};
