import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { KanbanMessages } from './messages';

import { cardAtom } from '../../components/atoms/card';
import { linkIcon, linkStyles } from '../../components/atoms/link';
import { iconClose } from '../../core/icons';
import { controls, tokens } from '../../core/theme';
import { onCommit } from '../../lib/dom/events';
import { describeLink } from '../../lib/link-label';
import {
  ADD_CARD_LINK,
  ADD_CARD_TAG,
  REMOVE_CARD_LINK,
  REMOVE_CARD_TAG,
  SET_CARD_ASSIGNEE,
  SET_CARD_DESCRIPTION,
  SET_CARD_TITLE,
  type KanbanCard,
  type KanbanColumn,
} from './model';

/** What the detail asks of its board: each returns whether a template recorded it. */
export type CardDetailActions = {
  edit(type: string, payload: Readonly<Record<string, unknown>>): boolean;
  move(column: string): boolean;
};

const detailStyles = css`
  :host {
    display: grid;
    align-content: start;
    gap: 18px;
  }
  .kanban-detail-title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: -0.01em;
  }
  .kanban-detail-title dpk-inline-edit,
  .kanban-detail-field > dpk-inline-edit {
    display: block;
    margin: 0 -4px;
  }
  .kanban-detail-field {
    display: grid;
    gap: 7px;
    min-width: 0;
  }
  .kanban-statuses {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .kanban-status {
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
  .kanban-status[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }
  .kanban-status:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .kanban-tag-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .kanban-tag {
    gap: 2px;
    padding-right: 2px;
  }
  .kanban-tag-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 0;
    border-radius: 999px;
    background: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
  }
  .kanban-tag-remove:hover,
  .kanban-tag-remove:focus-visible {
    background: color-mix(in srgb, var(--dpk-ink) 8%, transparent);
    opacity: 1;
    outline: none;
  }
  .kanban-tag-remove svg {
    width: 11px;
    height: 11px;
  }
  .kanban-tag-add {
    flex: 1 1 110px;
    min-width: 90px;
    font-size: 12px;
  }
  .kanban-link-list {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .kanban-link-list li {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }
  .kanban-link {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 6px 8px;
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 11.5px;
    font-weight: 600;
    text-decoration: none;
  }
  .kanban-link span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .kanban-link:hover span {
    text-decoration: underline;
  }
  .kanban-link svg {
    flex: none;
    width: 12px;
    height: 12px;
  }
  .kanban-link-remove {
    flex: none;
    width: 24px;
    height: 24px;
    margin-right: 4px;
  }
  .kanban-link-add {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .kanban-link-add [data-role='link-url'] {
    flex: 1 1 100%;
    font-size: 12px;
  }
  .kanban-link-add [data-role='link-label'] {
    flex: 1 1 120px;
    font-size: 12px;
  }
  .kanban-link-add .dpk-btn {
    flex: none;
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
 * A card's detail, drawn in the side panel: its title, status, assignee,
 * tags, description and links, each edited in place through the board's
 * element actions. The panel keys it on the card, so what is half typed here
 * never moves to another card.
 */
export class DpkInternalKanbanCardDetail extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, cardAtom, linkStyles, detailStyles];

  static override properties = {
    card: { attribute: false },
    columns: { attribute: false },
    messages: { attribute: false },
    actions: { attribute: false },
    failed: { state: true },
  };

  declare card: KanbanCard | null;
  declare columns: readonly KanbanColumn[];
  declare messages: KanbanMessages | null;
  declare actions: CardDetailActions | null;
  /** An edit from here that no template recorded. */
  declare failed: boolean;

  constructor() {
    super();
    this.card = null;
    this.columns = [];
    this.messages = null;
    this.actions = null;
    this.failed = false;
  }

  #edit(type: string, payload: Readonly<Record<string, unknown>>): boolean {
    const accepted = this.actions?.edit(type, payload) ?? false;
    this.failed = !accepted;
    return accepted;
  }

  #move(column: string): void {
    this.failed = !(this.actions?.move(column) ?? false);
  }

  #onTagKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const tag = input.value.trim();
    if (tag === '') return;
    if (this.#edit(ADD_CARD_TAG, { tag })) input.value = '';
  }

  #onAddLink(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;
    const url = form.querySelector<HTMLInputElement>('[data-role="link-url"]')?.value.trim() ?? '';
    const label = form.querySelector<HTMLInputElement>('[data-role="link-label"]')?.value.trim() ?? '';
    if (url === '') return;
    if (this.#edit(ADD_CARD_LINK, label === '' ? { url } : { url, label })) form.reset();
  }

  protected override render(): TemplateResult | typeof nothing {
    const card = this.card;
    const m = this.messages;
    if (card === null || m === null) return nothing;
    return html`
      <div class="kanban-detail-title">
        <dpk-inline-edit
          wrap
          .value=${card.title}
          .label=${m.cardTitleLabel}
          @dpk-commit=${onCommit((title) => this.#edit(SET_CARD_TITLE, { title }))}
        ></dpk-inline-edit>
      </div>
      <section class="kanban-detail-field">
        <span class="dpk-label">${m.cardStatusLabel}</span>
        <div class="kanban-statuses">
          ${this.columns.map(
            (column) => html`<button
              class="kanban-status"
              type="button"
              aria-pressed=${String(column.id === card.column)}
              @click=${() => this.#move(column.id)}
            >
              ${column.label}
            </button>`,
          )}
        </div>
      </section>
      <section class="kanban-detail-field">
        <span class="dpk-label">${m.cardAssigneeLabel}</span>
        <dpk-inline-edit
          .value=${card.assignee ?? ''}
          .label=${m.cardAssigneeLabel}
          .placeholder=${m.cardAssigneePlaceholder}
          @dpk-commit=${onCommit((assignee) => this.#edit(SET_CARD_ASSIGNEE, { assignee }))}
        ></dpk-inline-edit>
      </section>
      <section class="kanban-detail-field">
        <span class="dpk-label">${m.cardTagsLabel}</span>
        <div class="kanban-tag-row">
          ${card.tags.map(
            (tag) => html`<span class="dpk-pill kanban-tag"
              >${tag}<button
                type="button"
                class="kanban-tag-remove"
                aria-label=${m.removeTagAria(tag)}
                @click=${() => this.#edit(REMOVE_CARD_TAG, { tag })}
              >
                ${iconClose()}
              </button></span
            >`,
          )}
          <input
            class="dpk-input kanban-tag-add"
            aria-label=${m.cardTagsPlaceholder}
            placeholder=${m.cardTagsPlaceholder}
            @keydown=${(event: KeyboardEvent) => this.#onTagKey(event)}
          />
        </div>
      </section>
      <section class="kanban-detail-field">
        <span class="dpk-label">${m.cardDescriptionLabel}</span>
        <dpk-inline-edit
          multiline
          markdown
          .value=${card.description ?? ''}
          .label=${m.cardDescriptionLabel}
          .placeholder=${m.cardDescriptionPlaceholder}
          @dpk-commit=${onCommit((description) => this.#edit(SET_CARD_DESCRIPTION, { description }))}
        ></dpk-inline-edit>
      </section>
      <section class="kanban-detail-field">
        <span class="dpk-label">${m.cardLinksLabel}</span>
        ${
          card.links.length === 0
            ? nothing
            : html`<ul class="kanban-link-list">
                ${card.links.map((link) => {
                  const described = describeLink(link.url);
                  return html`<li>
                    <a class="kanban-link" href=${link.url} target="_blank" rel="noopener noreferrer"
                      >${linkIcon(described.kind)}<span>${link.label ?? described.text}</span></a
                    >
                    <button
                      type="button"
                      class="dpk-icon-btn kanban-link-remove"
                      aria-label=${m.removeLinkAria(link.url)}
                      @click=${() => this.#edit(REMOVE_CARD_LINK, { url: link.url })}
                    >
                      ${iconClose()}
                    </button>
                  </li>`;
                })}
              </ul>`
        }
        <form class="kanban-link-add" @submit=${(event: Event) => this.#onAddLink(event)}>
          <input
            class="dpk-input"
            data-role="link-url"
            type="url"
            inputmode="url"
            autocomplete="off"
            aria-label=${m.cardLinkUrlPlaceholder}
            placeholder=${m.cardLinkUrlPlaceholder}
          />
          <input
            class="dpk-input"
            data-role="link-label"
            autocomplete="off"
            aria-label=${m.cardLinkLabelPlaceholder}
            placeholder=${m.cardLinkLabelPlaceholder}
          />
          <button class="dpk-btn" type="submit">${m.addLinkButton}</button>
        </form>
      </section>
      ${this.failed ? html`<p class="kanban-error" role="alert">${m.notRecorded}</p>` : nothing}
    `;
  }
}

export const defineKanbanCardDetail = (): void => {
  if (!customElements.get('dpk-internal-kanban-card-detail'))
    customElements.define('dpk-internal-kanban-card-detail', DpkInternalKanbanCardDetail);
};
