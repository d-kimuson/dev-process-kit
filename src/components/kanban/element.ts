import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { ElementActionResult } from '../../core/element-actions';
import type { CommentTargetOption, DraftAction } from '../../core/types';
import type { ViewportAlign } from '../diagram/viewport';

import { createEntityId } from '../../core/target';
import { DiagramChromeElement } from '../diagram/element';
import { classNames, tagStateMatches } from '../diagram/model';
import { diagramStyles } from '../diagram/styles';
import { kanbanMessages } from './messages';
import {
  ADD_CARD,
  allCards,
  emptyKanbanData,
  findCard,
  isSamePosition,
  MOVE_CARD,
  parseKanbanData,
  reduceKanbanActions,
  visibleKanban,
  type KanbanCard,
  type KanbanColumn,
  type KanbanData,
  type KanbanPosition,
} from './model';
import { kanbanStyles } from './styles';

export type KanbanSelection = { readonly kind: 'column' | 'card'; readonly id: string };

/**
 * `<dpk-component-kanban>` — columns of cards, read left to right.
 *
 * Columns and cards are comment targets. A card moves by drag and drop; a
 * column's footer adds a card. Both are
 * element actions (`MOVE_CARD`, `ADD_CARD`) recorded by the hosting template,
 * which lists them with its other draft actions; the board shows their result.
 */
export class DpkComponentKanban extends DiagramChromeElement<KanbanData, KanbanSelection> {
  static override styles: CSSResultGroup = [diagramStyles, kanbanStyles];

  #seededFrom: KanbanData | null = null;
  /** The card being typed into a column; `failed` when no template recorded it. */
  #adding: { readonly column: string; readonly title: string; readonly failed: boolean } | null = null;
  /** The card whose last move no template recorded. */
  #moveFailed: string | null = null;
  #dragging: string | null = null;
  #drop: KanbanPosition | null = null;

  protected override parseData(input: unknown): KanbanData {
    return parseKanbanData(input);
  }

  protected override emptyData(): KanbanData {
    return emptyKanbanData();
  }

  protected override reduceElementActions(
    data: KanbanData,
    actions: readonly DraftAction[],
  ): { readonly data: KanbanData; readonly results: readonly ElementActionResult[] } {
    return reduceKanbanActions(kanbanMessages(this.locale), data, actions);
  }

  protected override defaultHeading(): string {
    return kanbanMessages(this.locale).heading;
  }

  protected override shellClass(): string {
    return 'kanban';
  }

  protected override emptyMessage(): string {
    return kanbanMessages(this.locale).empty;
  }

  protected override commentItems(): readonly CommentTargetOption[] {
    const items = this.items();
    return [
      ...items.columns.map((column) => ({ value: this.commentRef('column', column.id), label: column.label })),
      ...allCards(items).map((card) => ({ value: this.commentRef('card', card.id), label: card.title })),
    ];
  }

  protected override hasSelection(selection: KanbanSelection): boolean {
    const items = this.items();
    return selection.kind === 'column'
      ? items.columns.some((column) => column.id === selection.id)
      : findCard(items, selection.id) !== undefined;
  }

  protected override tagItems(): readonly (readonly string[])[] {
    return allCards(this.items()).map((card) => card.tags);
  }

  protected override statsText(): string {
    const m = kanbanMessages(this.locale);
    const total = allCards(this.items()).length;
    const shown = allCards(this.#visible()).length;
    return shown === total ? `${total} ${m.cards}` : `${shown} / ${total} ${m.cards}`;
  }

  protected override isEmpty(): boolean {
    return this.items().columns.length === 0;
  }

  /** A board is read from its first column: it sits top-left even when it fits. */
  protected override viewAlign(): ViewportAlign {
    return 'start';
  }

  /** Cards wrap their text, so the board's size is whatever the browser laid out. */
  protected override contentSize(): { readonly width: number; readonly height: number } | null {
    if (this.isEmpty()) return null;
    const board = this.renderRoot.querySelector<HTMLElement>('.kanban-board');
    return { width: board?.offsetWidth ?? 0, height: board?.offsetHeight ?? 0 };
  }

  /** New authored data drops the input that belonged to the old board. */
  protected override refreshContent(): void {
    const authored = this.authoredItems();
    if (authored !== this.#seededFrom) {
      this.#seededFrom = authored;
      this.#adding = null;
      this.#moveFailed = null;
    }
  }

  protected override renderCanvas(): TemplateResult {
    const visible = this.#visible();
    const counts = new Map(this.items().columns.map((column) => [column.id, column.cards.length]));
    return html`<div class="kanban-board">
      ${repeat(
        visible.columns,
        (column) => column.id,
        (column) => this.#renderColumn(column, counts.get(column.id) ?? 0),
      )}
    </div>`;
  }

  // ---------------------------------------------------------------- internals

  #visible(): KanbanData {
    const tags = this.tagFilter;
    return visibleKanban(
      this.items(),
      tags.active.length === 0 ? null : (card: KanbanCard) => tagStateMatches(card.tags, tags),
    );
  }

  #isSelected(kind: KanbanSelection['kind'], id: string): boolean {
    const selection = this.selection;
    return selection !== null && selection.kind === kind && selection.id === id;
  }

  #renderColumn(column: KanbanColumn, count: number): TemplateResult {
    const m = kanbanMessages(this.locale);
    const over = column.limit !== null && count > column.limit;
    const drop = this.#drop?.column === column.id ? this.#drop : null;
    return html`
      <section
        class=${classNames(
          'kanban-column',
          over && 'is-over',
          this.#isSelected('column', column.id) && 'is-selected',
          drop !== null && 'is-drop-target',
        )}
        data-column=${column.id}
        data-color=${column.color ?? nothing}
        aria-label=${column.label}
      >
        <div class="kanban-column-head">
          <button
            type="button"
            class="kanban-column-title"
            aria-pressed=${this.#isSelected('column', column.id) ? 'true' : 'false'}
            title=${column.description ?? column.label}
            @click=${() => this.select({ kind: 'column', id: column.id })}
          >
            <span class="kanban-column-label">${column.label}</span>
            <span class="kanban-count" title=${column.limit === null ? nothing : m.wipLimit(column.limit)}>
              ${column.limit === null ? count : `${count} / ${column.limit}`}
            </span>
          </button>
          ${this.renderCommentTrigger({ kind: 'column', id: column.id }, column.label)}
        </div>
        ${column.description === null ? nothing : html`<p class="kanban-column-description">${column.description}</p>`}
        <div
          class="kanban-cards"
          @dragover=${(event: DragEvent) => this.#onDragOver(event, column.id)}
          @dragleave=${(event: DragEvent) => this.#onDragLeave(event)}
          @drop=${(event: DragEvent) => this.#onDrop(event, column.id)}
        >
          ${repeat(
            column.cards,
            (card) => card.id,
            (card) =>
              html`${drop?.before === card.id ? this.#renderDropMarker() : nothing}${this.#renderCard(card, m)}`,
          )}
          ${drop !== null && drop.before === null ? this.#renderDropMarker() : nothing}
        </div>
        ${this.#renderAdd(column, m)}
      </section>
    `;
  }

  #renderDropMarker(): TemplateResult {
    return html`<div class="kanban-drop-marker" aria-hidden="true"></div>`;
  }

  #renderCard(card: KanbanCard, m: ReturnType<typeof kanbanMessages>): TemplateResult {
    const selected = this.#isSelected('card', card.id);
    return html`
      <div class="kanban-card-slot">
        <div
          role="button"
          tabindex="0"
          draggable="true"
          class=${classNames(
            'kanban-card',
            selected && 'is-selected',
            card.change === 'added' && 'is-added',
            card.change === 'moved' && 'is-moved',
            this.#dragging === card.id && 'is-dragging',
          )}
          data-card=${card.id}
          data-grill-questions=${this.questionsOf(card)}
          title=${card.description ?? card.title}
          aria-pressed=${selected ? 'true' : 'false'}
          @click=${() => this.select({ kind: 'card', id: card.id })}
          @keydown=${(event: KeyboardEvent) => this.#onCardKey(event, card.id)}
          @dragstart=${(event: DragEvent) => this.#onDragStart(event, card.id)}
          @dragend=${() => this.#endDrag()}
        >
          <span class="kanban-card-title">${card.title}</span>
          ${card.description === null ? nothing : html`<span class="kanban-card-description">${card.description}</span>`}
          ${
            card.tags.length === 0 && card.assignee === null
              ? nothing
              : html`<span class="kanban-card-meta">
                  ${card.tags.map((tag) => html`<span class="kanban-tag">${tag}</span>`)}
                  ${card.assignee === null ? nothing : html`<span class="kanban-assignee">${card.assignee}</span>`}
                </span>`
          }
        </div>
        ${this.renderCommentTrigger({ kind: 'card', id: card.id }, card.title)}
        ${this.#moveFailed === card.id ? html`<p class="kanban-error" role="alert">${m.notRecorded}</p>` : nothing}
      </div>
    `;
  }

  #renderAdd(column: KanbanColumn, m: ReturnType<typeof kanbanMessages>): TemplateResult {
    const adding = this.#adding?.column === column.id ? this.#adding : null;
    return html`<div class="kanban-add">
      ${
        adding === null
          ? html`<button
              type="button"
              class="kanban-add-button"
              data-action="add"
              @click=${() => this.#startAdding(column.id)}
            >
              ${m.addCardButton}
            </button>`
          : html`
              <input
                class="dpk-input"
                aria-label="${m.addCardAriaLabel(column.label)}"
                placeholder="${m.addCardPlaceholder}"
                .value=${adding.title}
                @input=${(event: Event) => {
                  const input = event.currentTarget;
                  if (input instanceof HTMLInputElement)
                    this.#adding = { ...adding, title: input.value, failed: false };
                }}
                @keydown=${(event: KeyboardEvent) => this.#onAddKey(event, column.id)}
              />
              ${adding.failed ? html`<span class="kanban-error" role="alert">${m.notRecorded}</span>` : nothing}
            `
      }
    </div>`;
  }

  #onCardKey(event: KeyboardEvent, id: string): void {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    this.select({ kind: 'card', id });
  }

  /** A template that records the move has already replayed it; otherwise the card says so. */
  #move(id: string, position: KanbanPosition): void {
    const accepted = this.dispatchElementAction(MOVE_CARD, ['card', id], {
      column: position.column,
      before: position.before,
    });
    this.#moveFailed = accepted ? null : id;
    this.select({ kind: 'card', id });
    this.requestUpdate();
  }

  // ------------------------------------------------------------ drag and drop

  #onDragStart(event: DragEvent, id: string): void {
    this.#dragging = id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    }
    this.requestUpdate();
  }

  #onDragOver(event: DragEvent, column: string): void {
    if (this.#dragging === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const position = this.#dropPosition(event, column);
    if (this.#drop?.column === position.column && this.#drop.before === position.before) return;
    this.#drop = position;
    this.requestUpdate();
  }

  #onDragLeave(event: DragEvent): void {
    const list = event.currentTarget;
    if (!(list instanceof HTMLElement) || (event.relatedTarget instanceof Node && list.contains(event.relatedTarget))) {
      return;
    }
    this.#drop = null;
    this.requestUpdate();
  }

  #onDrop(event: DragEvent, column: string): void {
    const id = this.#dragging;
    if (id === null) return;
    event.preventDefault();
    const position = this.#dropPosition(event, column);
    this.#endDrag();
    if (!isSamePosition(this.items(), id, position.column, position.before)) this.#move(id, position);
  }

  #endDrag(): void {
    if (this.#dragging === null && this.#drop === null) return;
    this.#dragging = null;
    this.#drop = null;
    this.requestUpdate();
  }

  /** Before the first card whose middle is below the pointer; the end of the column otherwise. */
  #dropPosition(event: DragEvent, column: string): KanbanPosition {
    const list = event.currentTarget;
    const cards = list instanceof HTMLElement ? [...list.querySelectorAll<HTMLElement>('[data-card]')] : [];
    const below = cards.find((card) => {
      if (card.dataset['card'] === this.#dragging) return false;
      const box = card.getBoundingClientRect();
      return box.top + box.height / 2 > event.clientY;
    });
    return { column, before: below?.dataset['card'] ?? null };
  }

  // ------------------------------------------------------------------ adding

  #startAdding(column: string): void {
    this.#adding = { column, title: '', failed: false };
    this.requestUpdate();
    void this.updateComplete.then(() =>
      this.renderRoot
        .querySelector<HTMLInputElement>(`[data-column="${CSS.escape(column)}"] .kanban-add input`)
        ?.focus({ preventScroll: true }),
    );
  }

  #onAddKey(event: KeyboardEvent, column: string): void {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#adding = null;
      this.requestUpdate();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const title = this.#adding?.title.trim() ?? '';
    if (title.length === 0) return;
    // Titles are often not ASCII; the prefix keeps such ids readable (`card-2`).
    const taken = [...this.items().columns.map((item) => item.id), ...allCards(this.items()).map((card) => card.id)];
    const id = createEntityId(`card ${title}`, taken);
    if (!this.dispatchElementAction(ADD_CARD, ['column', column], { id, title })) {
      this.#adding = { column, title, failed: true };
      this.requestUpdate();
      return;
    }
    // The template replayed the action synchronously: the card exists now.
    this.#adding = null;
    this.select({ kind: 'card', id });
    this.requestUpdate();
  }
}
