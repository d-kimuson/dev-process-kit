import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { ContextMenuGroup, ContextMenuRequest } from '../../core/context-menu/types';
import type { ElementActionResult } from '../../core/element-actions';
import type { ActionTarget, CommentTargetOption, DraftAction } from '../../core/types';

import { cardAtom } from '../../components/atoms/card';
import { createEntityId, targetRef } from '../../core/target';
import { copyText } from '../../lib/dom/clipboard';
import { BoardChromeBase } from '../base/element';
import { classNames, elementRefSegments, tagStateMatches } from '../base/model';
import { chromeStyles } from '../base/styles';
import { kanbanMessages } from './messages';
import {
  ADD_CARD,
  allCards,
  cardKey,
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
 * `<dpk-board-kanban>` — columns of cards, read left to right.
 *
 * A board, not a diagram: it sits in the page's normal flow at its natural
 * height (no pan/zoom canvas) and only scrolls sideways, on its own, when its
 * columns are wider than the panel.
 *
 * Columns and cards are comment targets. A card moves by drag and drop; a
 * column's footer adds a card. Both are
 * element actions (`MOVE_CARD`, `ADD_CARD`) recorded by the hosting template,
 * which lists them with its other draft actions; the board shows their result.
 */
export class DpkBoardKanban extends BoardChromeBase<KanbanData, KanbanSelection> {
  protected override boardAddable(): boolean {
    return true;
  }
  static override styles: CSSResultGroup = [chromeStyles, cardAtom, kanbanStyles];

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

  /**
   * Right-clicking a card copies its key (`TASK-3`), alone or with its title.
   * Anything else — a column, the board, another board's card — keeps the
   * inherited menu as it is.
   */
  override getContextMenuItems(request: ContextMenuRequest): readonly ContextMenuGroup[] | null {
    const inherited = super.getContextMenuItems(request);
    const card = this.#cardOfTarget(request.target);
    if (card === undefined) return inherited;
    const m = kanbanMessages(this.locale);
    const key = cardKey(card);
    return [
      {
        id: 'kanban-card',
        entries: [
          { kind: 'item', id: 'copy-card-key', label: m.copyKey, run: () => void copyText(key) },
          {
            kind: 'item',
            id: 'copy-card-key-title',
            label: m.copyKeyTitle,
            run: () => void copyText(`${key} ${card.title}`),
          },
        ],
      },
      ...(inherited ?? []),
    ];
  }

  /** The card a menu target names, when that ref is one of this board's own cards. */
  #cardOfTarget(target: ActionTarget | null): KanbanCard | undefined {
    if (target === null || target.type !== 'element') return undefined;
    const segments = elementRefSegments(target.id);
    if (segments === null || segments.length !== 3 || segments[1] !== 'card') return undefined;
    const id = segments[2];
    const card = id === undefined ? undefined : findCard(this.items(), id);
    // A nested sibling board may carry a card with the same id: only this board's own ref counts.
    return card !== undefined && this.commentRef('card', card.id) === targetRef(target) ? card : undefined;
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

  /** New authored data drops the input that belonged to the old board. */
  protected override refreshContent(): void {
    const authored = this.authoredItems();
    if (authored !== this.#seededFrom) {
      this.#seededFrom = authored;
      this.#adding = null;
      this.#moveFailed = null;
    }
  }

  protected override render(): TemplateResult {
    this.prepareRender();
    const m = this.chromeMessages;
    const subject = this.subject ?? this.defaultSubject();
    return html`
      <dpk-dialog-panel
        class=${this.shellClass()}
        ?maximizable=${this.frameControls}
        ?resizable=${this.frameControls}
        heading=${this.heading ?? this.defaultHeading()}
        subject=${subject === '' ? nothing : subject}
        @dpk-maximize-change=${() => this.closeComposer()}
      >
        ${this.renderToolbarActionsSlot()} ${this.renderTagFilterRow()}
        ${
          this.dataError !== null
            ? html`<p class="kanban-notice" role="alert">${m.dataError}<br />${this.dataError}</p>`
            : this.isEmpty()
              ? html`<p class="kanban-empty">${this.emptyMessage()}</p>`
              : this.#renderBoard()
        }
      </dpk-dialog-panel>
      ${this.renderSelection()}
    `;
  }

  #renderBoard(): TemplateResult {
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
            data-dpk-target=${this.commentRef('column', column.id)}
            title=${column.description ?? column.label}
            @click=${() => this.select({ kind: 'column', id: column.id })}
          >
            <span class="kanban-column-label">${column.label}</span>
            <span class="kanban-count" title=${column.limit === null ? nothing : m.wipLimit(column.limit)}>
              ${column.limit === null ? count : `${count} / ${column.limit}`}
            </span>
          </button>
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
            'dpk-card',
            'kanban-card',
            card.change === 'added' && 'is-added',
            card.change === 'moved' && 'is-moved',
          )}
          data-state=${this.#dragging === card.id ? 'dragging' : nothing}
          data-card=${card.id}
          data-grill-questions=${this.questionsOf(card)}
          data-dpk-target=${this.commentRef('card', card.id)}
          title=${card.description ?? card.title}
          aria-pressed=${selected ? 'true' : 'false'}
          @click=${() => this.select({ kind: 'card', id: card.id })}
          @keydown=${(event: KeyboardEvent) => this.#onCardKey(event, card.id)}
          @dragstart=${(event: DragEvent) => this.#onDragStart(event, card.id)}
          @dragend=${() => this.#endDrag()}
        >
          <div class="dpk-card-head">
            <div class="dpk-card-title">${card.title}</div>
            <span class="dpk-card-key">${cardKey(card)}</span>
          </div>
          ${card.description === null ? nothing : html`<div class="dpk-card-text">${card.description}</div>`}
          ${
            card.tags.length === 0 && card.assignee === null
              ? nothing
              : html`<div class="dpk-card-row kanban-card-meta">
                  ${card.tags.map((tag) => html`<span class="dpk-pill">${tag}</span>`)}
                  ${
                    card.assignee === null
                      ? nothing
                      : html`<span class="kanban-assignee"
                          ><span class="dpk-avatar" aria-hidden="true">${Array.from(card.assignee)[0] ?? ''}</span
                          >${card.assignee}</span
                        >`
                  }
                </div>`
          }
        </div>
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
    // A catalog-hosted board may not have authored an id; give its action a provider address.
    if (!this.id) {
      const taken = [...document.querySelectorAll<HTMLElement>('[id]')].map((element) => element.id);
      this.id = createEntityId('kanban', taken);
    }
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
