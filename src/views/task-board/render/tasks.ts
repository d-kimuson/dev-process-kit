import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';

import type { SelectControllerRegistry } from '../../../core/select/controller';
import type { TaskBoardMessages } from '../messages';
import type { TodoStatus } from '../model';
import type { TaskLaneViewModel, TasksViewModel, TodoFilter, TodoViewModel } from '../present';

import { DpkSelect } from '../../../components/select/element';
import { iconTrash } from '../../../core/icons';
import { elementOf } from '../../../lib/dom/element';
import { commentButton, type BoardHandlers } from './shared';

const UNASSIGNED = '';

const isTodoStatus = (value: string, vm: TasksViewModel): value is TodoStatus =>
  vm.statuses.some((status) => status.value === value);

/**
 * The work as a board, the way `dpk-board-kanban` draws one: one column per
 * status, read left to right, each todo a card in the column it stands in.
 *
 * It is the same visual language — sunken lanes with a colored heading and a
 * count, cards on the kit's card atom — over this view's own model instead of
 * a board of its own: a card keeps its todo's actions (accept or decline a
 * proposal, set the status of a todo a person has, comment, remove one the
 * reader added), and dragging a person's card to another column records the
 * same `SET_TODO_STATUS` the select does. A lane with nothing in it keeps its
 * place, so the board's shape says where the work is without it.
 */
export const renderTasks = (
  m: TaskBoardMessages,
  vm: TasksViewModel,
  handlers: BoardHandlers,
  statusSelects: SelectControllerRegistry,
): TemplateResult => html`
  <section class="board-tasks" data-section="tasks" aria-label=${m.tasksBoard}>
    ${renderSummary(m, vm, handlers)}
    <div class="board-kanban" role="group" aria-label=${m.tasksBoard}>
      ${repeat(
        vm.lanes,
        (lane) => lane.status,
        (lane) => renderLane(m, vm, lane, handlers, statusSelects),
      )}
    </div>
  </section>
`;

/** How far the work has got, and whose it is: the whole task's, whatever a lane shows. */
const renderSummary = (m: TaskBoardMessages, vm: TasksViewModel, handlers: BoardHandlers): TemplateResult => html`
  <div class="board-tasks-bar">
    <div class="board-tasks-progress">
      <span class="board-tasks-progress-label">${vm.progress.label}</span>
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
              <span
                class="board-progress-fill"
                style=${`width: ${(vm.progress.done / vm.progress.total) * 100}%`}
              ></span>
            </div>`
      }
    </div>
    ${vm.canFilter ? renderFilter(m, vm, handlers) : nothing}
  </div>
`;

/** Everything, or only what people have to do: what the reader looks for first. */
const renderFilter = (m: TaskBoardMessages, vm: TasksViewModel, handlers: BoardHandlers): TemplateResult => {
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

const renderLane = (
  m: TaskBoardMessages,
  vm: TasksViewModel,
  lane: TaskLaneViewModel,
  handlers: BoardHandlers,
  statusSelects: SelectControllerRegistry,
): TemplateResult => html`
  <section
    class="board-lane"
    data-column=${lane.status}
    data-tone=${lane.tone}
    aria-label=${lane.label}
    @dragover=${handlers.allowTodoDrop}
    @drop=${(event: DragEvent) => {
      event.preventDefault();
      handlers.dropTodo(lane.status);
    }}
  >
    <header class="board-lane-head">
      <h3 class="board-lane-title">${lane.label}</h3>
      <span class="board-lane-count" title=${m.laneCount(lane.cards.length)}>${lane.cards.length}</span>
    </header>
    ${
      lane.cards.length === 0
        ? html`<p class="board-lane-empty">${m.laneEmpty}</p>`
        : html`<ul class="board-cards">
            ${repeat(
              lane.cards,
              (todo) => todo.id,
              (todo) => renderCard(m, vm, todo, handlers, statusSelects),
            )}
          </ul>`
    }
    ${lane.status === 'todo' ? renderAddTodo(m, vm, handlers) : nothing}
  </section>
`;

/** A proposal is not work yet: a question mark in place of the status it would have. */
const renderMark = (m: TaskBoardMessages, todo: TodoViewModel): TemplateResult | typeof nothing =>
  todo.proposal === 'pending' || todo.proposal === 'decline'
    ? html`<span
        class="board-card-mark"
        data-proposal=${todo.proposal}
        role="img"
        aria-label=${m.proposedMark}
        title=${m.proposedMark}
        >?</span
      >`
    : nothing;

const renderTags = (m: TaskBoardMessages, todo: TodoViewModel): TemplateResult => html`
  ${todo.proposal === 'accept' ? html`<span class="board-tag" data-tone="done">${m.acceptedTag}</span>` : nothing}
  ${todo.proposal === 'decline' ? html`<span class="board-tag" data-tone="muted">${m.declinedTag}</span>` : nothing}
  ${todo.added ? html`<span class="board-tag" data-tone="new">${m.addedTag}</span>` : nothing}
  ${todo.changed ? html`<span class="board-tag" data-tone="changed">${m.changedTag}</span>` : nothing}
`;

const renderCard = (
  m: TaskBoardMessages,
  vm: TasksViewModel,
  todo: TodoViewModel,
  handlers: BoardHandlers,
  statusSelects: SelectControllerRegistry,
): TemplateResult => html`
  <li class="board-card-slot">
    <article
      class="dpk-card board-card"
      data-todo=${todo.id}
      data-dpk-target=${`todo:${todo.id}`}
      data-grill-questions=${ifDefined(todo.questions)}
      data-status=${todo.status}
      data-proposal=${todo.proposal ?? 'none'}
      data-added=${String(todo.added)}
      data-changed=${String(todo.changed)}
      draggable=${ifDefined(todo.editable ? 'true' : undefined)}
      title=${ifDefined(todo.editable ? m.dragHint : undefined)}
      @dragstart=${() => handlers.beginTodoDrag(todo.id)}
      @dragend=${() => handlers.endTodoDrag()}
    >
      <div class="board-card-head">
        ${renderMark(m, todo)}
        <h4 class="dpk-card-title board-card-title">${todo.title}</h4>
        <div class="board-card-tags">${renderTags(m, todo)}</div>
      </div>
      ${
        todo.design === null
          ? nothing
          : html`<div class="board-card-design">
              <span class="board-tag" data-tone="design" title=${todo.design.title}>${todo.design.title}</span>
            </div>`
      }
      ${todo.note === null ? nothing : html`<p class="dpk-card-text board-card-note">${todo.note}</p>`}
      ${
        todo.reason === null || todo.proposal === 'accept'
          ? nothing
          : html`<p class="board-reason"><span class="board-reason-label">${m.reason}</span>${todo.reason}</p>`
      }
      <div class="board-card-controls">
        ${
          todo.proposal === 'pending'
            ? renderDecision(m, todo, handlers)
            : todo.proposal === 'decline'
              ? nothing
              : renderStatus(m, vm, todo, handlers, statusSelects)
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
    </article>
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
  vm: TasksViewModel,
  todo: TodoViewModel,
  handlers: BoardHandlers,
  statusSelects: SelectControllerRegistry,
): unknown =>
  todo.editable
    ? statusSelects.get(todo.id).render({
        options: vm.statuses.map((status) => ({ value: status.value, label: status.label })),
        value: todo.status,
        onChange: (value) => {
          if (isTodoStatus(value, vm) && value !== todo.status) handlers.setStatus(todo.id, value);
        },
        ariaLabel: m.statusOf(todo.title),
        className: 'board-todo-status',
      })
    : html`<span class="board-todo-state" data-status=${todo.status}>${todo.statusLabel}</span>`;

/** A new todo is a request to the agent: a title and, when the board names people, who should do it. */
const renderAddTodo = (m: TaskBoardMessages, vm: TasksViewModel, handlers: BoardHandlers): TemplateResult => html`
  <form
    class="board-add-todo"
    @submit=${(event: SubmitEvent) => {
      event.preventDefault();
      const form = elementOf(event.currentTarget, HTMLFormElement);
      if (form === null) return;
      const title = elementOf(form.elements.namedItem('title'), HTMLInputElement);
      // `dpk-select` is form-associated, but jsdom/happy-dom don't list it in
      // `form.elements` (see dev-docs/guidelines/architecture.md on browser
      // capability assumptions), so it's queried directly instead.
      const assignee = elementOf(form.querySelector('dpk-select[name="assignee"]'), DpkSelect);
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
          : html`<dpk-select
              class="board-add-assignee"
              name="assignee"
              aria-label=${m.newTodoAssignee}
              .options=${[
                { value: UNASSIGNED, label: m.unassigned },
                ...vm.members.map((member) => ({ value: member.id, label: member.label })),
              ]}
              .value=${UNASSIGNED}
            ></dpk-select>`
      }
      <button class="dpk-btn board-add-submit" type="submit">${m.addTodo}</button>
    </div>
  </form>
`;
