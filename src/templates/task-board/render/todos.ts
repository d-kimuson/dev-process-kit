import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TaskBoardMessages } from '../messages';
import type { TodoStatus } from '../model';
import type { TodoFilter, TodoViewModel, TodosViewModel } from '../present';

import { iconTrash } from '../../../core/icons';
import { elementOf } from '../../../lib/dom/element';
import { onSelectChange } from '../../../lib/dom/events';
import { commentButton, type BoardHandlers } from './shared';

const UNASSIGNED = '';

const isTodoStatus = (value: string, vm: TodosViewModel): value is TodoStatus =>
  vm.statuses.some((status) => status.value === value);

/**
 * The todo list in the agent's order, with what the agent proposes on its own
 * mixed in under a "?" mark. The reader accepts a proposal to make it a todo,
 * sets the status of a todo a person has, and asks for more work with the form
 * at the end. The agent's own statuses and the assignees are the agent's to
 * write, so they only show. What was already done folds away above the rest,
 * out of the way but where the list starts.
 */
export const renderTodos = (m: TaskBoardMessages, vm: TodosViewModel, handlers: BoardHandlers): TemplateResult => html`
  <section class="board-section board-rail-section" data-section="todos" aria-labelledby="board-todos">
    <header class="board-section-head">
      <h2 id="board-todos">${m.todos}</h2>
      <span class="board-section-meta">${vm.progress.label}</span>
    </header>
    ${
      vm.progress.total === 0
        ? nothing
        : html`<div
            class="board-progress"
            role="progressbar"
            aria-label=${vm.progress.label}
            aria-valuemin="0"
            aria-valuemax=${vm.progress.total}
            aria-valuenow=${vm.progress.done}
          >
            <span class="board-progress-fill" style=${`width: ${(vm.progress.done / vm.progress.total) * 100}%`}></span>
          </div>`
    }
    ${vm.canFilter ? renderFilter(m, vm, handlers) : nothing}
    ${
      vm.todos.length === 0 && vm.done.length === 0
        ? html`<p class="board-empty">${vm.filter === 'human' ? m.noHumanTodos : m.noTodos}</p>`
        : nothing
    }
    ${
      vm.done.length === 0
        ? nothing
        : html`<details class="board-done">
            <summary class="board-done-summary">
              <span class="board-done-chevron" aria-hidden="true"></span>${m.doneGroup(vm.done.length)}
            </summary>
            ${renderList(m, vm, vm.done, handlers)}
          </details>`
    }
    ${vm.todos.length === 0 ? nothing : renderList(m, vm, vm.todos, handlers)} ${renderAddTodo(m, vm, handlers)}
  </section>
`;

const renderList = (
  m: TaskBoardMessages,
  vm: TodosViewModel,
  todos: readonly TodoViewModel[],
  handlers: BoardHandlers,
): TemplateResult => html`
  <ul class="board-todos">
    ${repeat(
      todos,
      (todo) => todo.id,
      (todo) => renderTodo(m, vm, todo, handlers),
    )}
  </ul>
`;

/** Everything, or only what people have to do: what the reader looks for first. */
const renderFilter = (m: TaskBoardMessages, vm: TodosViewModel, handlers: BoardHandlers): TemplateResult => {
  const option = (filter: TodoFilter, label: string, count: number | null): TemplateResult => html`
    <button
      type="button"
      class="board-filter-option"
      data-filter=${filter}
      aria-pressed=${vm.filter === filter ? 'true' : 'false'}
      @click=${() => handlers.filterTodos(filter)}
    >
      ${label}${count === null ? nothing : html`<span class="board-filter-count">${count}</span>`}
    </button>
  `;
  return html`<div class="board-filter" role="group" aria-label=${m.filterTodos}>
    ${option('all', m.filterAll, null)} ${option('human', m.filterHuman, vm.humanCount)}
  </div>`;
};

const renderMark = (m: TaskBoardMessages, todo: TodoViewModel): TemplateResult =>
  todo.proposal === 'pending' || todo.proposal === 'decline'
    ? html`<span
        class="board-todo-mark board-todo-mark--proposal"
        role="img"
        aria-label=${m.proposedMark}
        title=${m.proposedMark}
        >?</span
      >`
    : html`<span class="board-todo-mark" data-status=${todo.status} aria-hidden="true"></span>`;

const renderTags = (m: TaskBoardMessages, todo: TodoViewModel): TemplateResult => html`
  ${todo.proposal === 'accept' ? html`<span class="board-tag" data-tone="done">${m.acceptedTag}</span>` : nothing}
  ${todo.proposal === 'decline' ? html`<span class="board-tag" data-tone="muted">${m.declinedTag}</span>` : nothing}
  ${todo.added ? html`<span class="board-tag" data-tone="new">${m.addedTag}</span>` : nothing}
  ${todo.changed ? html`<span class="board-tag" data-tone="changed">${m.changedTag}</span>` : nothing}
`;

const renderTodo = (
  m: TaskBoardMessages,
  vm: TodosViewModel,
  todo: TodoViewModel,
  handlers: BoardHandlers,
): TemplateResult => html`
  <li
    class="board-todo"
    data-todo=${todo.id}
    data-status=${todo.status}
    data-proposal=${todo.proposal ?? 'none'}
    data-added=${String(todo.added)}
    data-changed=${String(todo.changed)}
  >
    ${renderMark(m, todo)}
    <div class="board-todo-body">
      <div class="board-todo-title"><span class="board-todo-text">${todo.title}</span>${renderTags(m, todo)}</div>
      ${todo.note === null ? nothing : html`<p class="board-todo-note">${todo.note}</p>`}
      ${
        todo.reason === null || todo.proposal === 'accept'
          ? nothing
          : html`<p class="board-reason"><span class="board-reason-label">${m.reason}</span>${todo.reason}</p>`
      }
      <div class="board-todo-controls">
        ${
          todo.proposal === 'pending'
            ? renderDecision(m, todo, handlers)
            : todo.proposal === 'decline'
              ? nothing
              : renderStatus(m, vm, todo, handlers)
        }
        ${
          todo.assigneeName === null
            ? nothing
            : html`<span class="board-assignee" data-kind=${todo.assigneeKind ?? 'agent'} title=${m.assignee}
                >${todo.assigneeName}</span
              >`
        }
        ${
          todo.proposal === 'accept' || todo.proposal === 'decline'
            ? html`<button
                type="button"
                class="dpk-btn dpk-btn--ghost board-undo"
                @click=${() => handlers.decide(todo.id, 'clear')}
              >
                ${m.undoDecision}
              </button>`
            : nothing
        }
        ${commentButton(`todo:${todo.id}`, m.commentOn(todo.title), todo.comments, handlers)}
        ${
          todo.added
            ? html`<button
                class="dpk-icon-btn board-todo-remove"
                type="button"
                aria-label=${m.removeAdded}
                title=${m.removeAdded}
                @click=${() => handlers.deleteTodo(todo.id)}
              >
                ${iconTrash()}
              </button>`
            : nothing
        }
      </div>
    </div>
  </li>
`;

const renderDecision = (m: TaskBoardMessages, todo: TodoViewModel, handlers: BoardHandlers): TemplateResult => html`
  <div class="board-decision" role="group" aria-label=${m.decisionOf(todo.title)}>
    <button
      type="button"
      class="dpk-btn board-decide"
      data-decision="accept"
      @click=${() => handlers.decide(todo.id, 'accept')}
    >
      ${m.accept}
    </button>
    <button
      type="button"
      class="dpk-btn dpk-btn--ghost board-decide"
      data-decision="decline"
      @click=${() => handlers.decide(todo.id, 'decline')}
    >
      ${m.decline}
    </button>
  </div>
`;

/** A person's todo takes a status from the reader; the agent's own only shows where it stands. */
const renderStatus = (
  m: TaskBoardMessages,
  vm: TodosViewModel,
  todo: TodoViewModel,
  handlers: BoardHandlers,
): TemplateResult =>
  todo.editable
    ? html`<select
        class="dpk-select board-todo-status"
        data-status=${todo.status}
        aria-label=${m.statusOf(todo.title)}
        @change=${onSelectChange((value) => {
          if (isTodoStatus(value, vm) && value !== todo.status) handlers.setStatus(todo.id, value);
        })}
      >
        ${vm.statuses.map(
          (status) =>
            html`<option value=${status.value} ?selected=${status.value === todo.status}>${status.label}</option>`,
        )}
      </select>`
    : html`<span class="board-todo-state" data-status=${todo.status}>${todo.statusLabel}</span>`;

/** A new todo is a request to the agent: a title and, when the board names people, who should do it. */
const renderAddTodo = (m: TaskBoardMessages, vm: TodosViewModel, handlers: BoardHandlers): TemplateResult => html`
  <form
    class="board-add-todo"
    @submit=${(event: SubmitEvent) => {
      event.preventDefault();
      const form = elementOf(event.currentTarget, HTMLFormElement);
      if (form === null) return;
      const title = elementOf(form.elements.namedItem('title'), HTMLInputElement);
      const assignee = elementOf(form.elements.namedItem('assignee'), HTMLSelectElement);
      const text = title?.value.trim() ?? '';
      if (title === null || text === '') return;
      handlers.addTodo(text, assignee === null || assignee.value === UNASSIGNED ? null : assignee.value);
      title.value = '';
    }}
  >
    <input
      class="dpk-input board-add-title"
      name="title"
      type="text"
      autocomplete="off"
      aria-label=${m.newTodo}
      placeholder=${m.newTodoPlaceholder}
    />
    <div class="board-add-row">
      ${
        vm.members.length === 0
          ? nothing
          : html`<select class="dpk-select board-add-assignee" name="assignee" aria-label=${m.newTodoAssignee}>
              <option value=${UNASSIGNED}>${m.unassigned}</option>
              ${vm.members.map((member) => html`<option value=${member.id}>${member.label}</option>`)}
            </select>`
      }
      <button class="dpk-btn board-add-submit" type="submit">${m.addTodo}</button>
    </div>
  </form>
`;
