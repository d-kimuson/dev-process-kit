import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { KanbanMessages } from './messages';

import { controls, tokens } from '../../core/theme';
import { allInColumn, tagCoverage } from './bulk';
import { allCards, cardKey, type KanbanData } from './model';

/** What the section asks of its board: each returns whether a template recorded it. */
export type BulkActions = {
  move(column: string): boolean;
  tag(tag: string, present: boolean): boolean;
  clear(): void;
};

const bulkStyles = css`
  :host {
    display: grid;
    align-content: start;
    gap: 18px;
  }
  .kanban-bulk-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .kanban-bulk-summary {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
  }
  .kanban-bulk-field {
    display: grid;
    gap: 7px;
    min-width: 0;
  }
  .kanban-bulk-cards {
    display: grid;
    gap: 2px;
    max-height: 168px;
    margin: 0;
    padding: 6px 8px;
    overflow-y: auto;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
    list-style: none;
    font-size: 12.5px;
  }
  .kanban-bulk-cards li {
    display: flex;
    gap: 8px;
    min-width: 0;
  }
  .kanban-bulk-key {
    flex: none;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 11.5px;
  }
  .kanban-bulk-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .kanban-bulk-options {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .kanban-bulk-option {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .kanban-bulk-option:hover:not([disabled]) {
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
  }
  .kanban-bulk-option[disabled] {
    cursor: default;
    opacity: 0.45;
  }
  .kanban-bulk-option[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }
  .kanban-bulk-option[aria-pressed='mixed'] {
    border-style: dashed;
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
    color: var(--dpk-blue);
  }
  .kanban-bulk-option:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .kanban-bulk-count {
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 500;
    opacity: 0.8;
  }
  .kanban-bulk-tag-add {
    flex: 1 1 140px;
    min-width: 110px;
    font-size: 12px;
  }
  .kanban-error {
    margin: 0;
    padding: 4px 7px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
    font-size: 11.5px;
    line-height: 1.4;
  }
`;

/**
 * The bulk actions on the cards the reader picked, drawn in the side panel:
 * move them all to a column, and put a tag on all of them or take it off.
 * Each press records one batch through the board.
 */
export class DpkInternalKanbanBulk extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, bulkStyles];

  static override properties = {
    data: { attribute: false },
    picked: { attribute: false },
    messages: { attribute: false },
    actions: { attribute: false },
    failed: { state: true },
  };

  declare data: KanbanData | null;
  declare picked: readonly string[];
  declare messages: KanbanMessages | null;
  declare actions: BulkActions | null;
  /** A bulk action from here that no template recorded. */
  declare failed: boolean;

  constructor() {
    super();
    this.data = null;
    this.picked = [];
    this.messages = null;
    this.actions = null;
    this.failed = false;
  }

  #record(accepted: boolean): boolean {
    this.failed = !accepted;
    return accepted;
  }

  #onTagKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const tag = input.value.trim();
    if (tag === '') return;
    if (this.#record(this.actions?.tag(tag, true) ?? false)) input.value = '';
  }

  protected override render(): TemplateResult | typeof nothing {
    const data = this.data;
    const m = this.messages;
    if (data === null || m === null) return nothing;
    const cards = allCards(data).filter((card) => this.picked.includes(card.id));
    const tags = [...new Set(allCards(data).flatMap((card) => card.tags))];
    return html`
      <div class="kanban-bulk-head">
        <p class="kanban-bulk-summary">${m.bulkSummary(cards.length)}</p>
        <button class="dpk-btn" type="button" @click=${() => this.actions?.clear()}>${m.bulkClear}</button>
      </div>
      <ul class="kanban-bulk-cards" aria-label=${m.bulkCards}>
        ${cards.map(
          (card) =>
            html`<li>
              <span class="kanban-bulk-key">${cardKey(card)}</span><span class="kanban-bulk-title">${card.title}</span>
            </li>`,
        )}
      </ul>
      <section class="kanban-bulk-field">
        <span class="dpk-label">${m.bulkMoveLabel}</span>
        <div class="kanban-bulk-options" data-role="move">
          ${data.columns.map(
            (column) =>
              html`<button
                class="kanban-bulk-option"
                type="button"
                data-column=${column.id}
                ?disabled=${allInColumn(data, this.picked, column.id)}
                @click=${() => this.#record(this.actions?.move(column.id) ?? false)}
              >
                ${column.label}
              </button>`,
          )}
        </div>
      </section>
      <section class="kanban-bulk-field">
        <span class="dpk-label">${m.bulkTagsLabel}</span>
        <div class="kanban-bulk-options" data-role="tags">
          ${tags.map((tag) => {
            const coverage = tagCoverage(data, this.picked, tag);
            const tagged = cards.filter((card) => card.tags.includes(tag)).length;
            return html`<button
              class="kanban-bulk-option"
              type="button"
              data-tag=${tag}
              aria-pressed=${coverage === 'all' ? 'true' : coverage === 'some' ? 'mixed' : 'false'}
              aria-label=${m.bulkTagAria(tag, tagged, cards.length)}
              @click=${() => this.#record(this.actions?.tag(tag, coverage !== 'all') ?? false)}
            >
              ${tag}<span class="kanban-bulk-count" aria-hidden="true">${tagged}/${cards.length}</span>
            </button>`;
          })}
          <input
            class="dpk-input kanban-bulk-tag-add"
            aria-label=${m.bulkTagPlaceholder}
            placeholder=${m.bulkTagPlaceholder}
            @keydown=${(event: KeyboardEvent) => this.#onTagKey(event)}
          />
        </div>
      </section>
      ${this.failed ? html`<p class="kanban-error" role="alert">${m.notRecorded}</p>` : nothing}
    `;
  }
}

export const defineKanbanBulk = (): void => {
  if (!customElements.get('dpk-internal-kanban-bulk'))
    customElements.define('dpk-internal-kanban-bulk', DpkInternalKanbanBulk);
};
