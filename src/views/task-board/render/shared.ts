import { html, nothing, type TemplateResult } from 'lit';

import type { AnswerInput } from '../actions';
import type { ProposalDecision, TodoStatus } from '../model';
import type { TodoFilter } from '../present';

import { iconComment } from '../../../core/icons';

/** What the board's controls ask the element to do. The renderers own no state. */
export type BoardHandlers = {
  readonly answer: (questionId: string, answer: AnswerInput) => void;
  /** Starts an answer that differs from the assumption, and moves focus to its box. */
  readonly answerOther: (questionId: string) => void;
  readonly decide: (todoId: string, decision: ProposalDecision | 'clear') => void;
  /** Opens another design doc in the master-detail tab. */
  readonly selectDesign: (designId: string) => void;
  readonly setStatus: (todoId: string, status: TodoStatus) => void;
  readonly filterTodos: (filter: TodoFilter) => void;
  readonly addTodo: (title: string, assignee: string | null) => void;
  readonly deleteTodo: (todoId: string) => void;
  /** A card the reader picked up: dropped on a column, it takes that column's status. */
  readonly beginTodoDrag: (todoId: string) => void;
  readonly endTodoDrag: () => void;
  /** Keeps the browser from refusing the drop while a card is being carried. */
  readonly allowTodoDrop: (event: DragEvent) => void;
  /** The pointer let go over the column of `status`. */
  readonly dropTodo: (status: TodoStatus) => void;
  /** Copies an output's URL or path to the clipboard. */
  readonly copy: (outputId: string, href: string) => void;
  /** Opens the review rail with a note on `target` (`todo:write-tests`). */
  readonly comment: (target: string) => void;
};

/** The note button every item carries, with how many notes it already has. */
export const commentButton = (
  target: string,
  label: string,
  count: number,
  handlers: BoardHandlers,
): TemplateResult => html`
  <button
    class="dpk-icon-btn board-comment"
    type="button"
    data-comment=${target}
    aria-label=${label}
    title=${label}
    @click=${() => handlers.comment(target)}
  >
    ${iconComment()} ${count > 0 ? html`<span class="dpk-icon-badge">${count}</span>` : nothing}
  </button>
`;

export const sectionHead = (
  id: string,
  title: string,
  meta: string | null,
  lede: string | null = null,
): TemplateResult => html`
  <header class="board-section-head">
    <h2 id=${id}>${title}</h2>
    ${meta === null ? nothing : html`<span class="board-section-meta">${meta}</span>`}
  </header>
  ${lede === null ? nothing : html`<p class="board-lede">${lede}</p>`}
`;
