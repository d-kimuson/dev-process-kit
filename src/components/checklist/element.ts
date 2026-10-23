import { LitElement, css, html, nothing, type CSSResultGroup } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { ElementActionResult } from '../../core/element-actions';
import type { CommentTargetOption, DraftAction } from '../../core/types';

import { iconCheck, iconComment } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { tokens } from '../../core/theme';
import { observeJsonChild } from '../../lib/dom/base-data';
import { checklistMessages, type ChecklistMessages } from './messages';
import {
  checklistProgress,
  emptyChecklistData,
  parseChecklistData,
  reduceChecklistActions,
  SET_CHECKED,
  type ChecklistData,
  type ChecklistItem,
} from './model';

/**
 * `<dpk-checklist>` — items the reviewer ticks off.
 *
 * Each item is a comment target, and each tick is a `SET_CHECKED` element
 * action recorded by the hosting template: the agent learns which items the
 * reviewer confirmed (or un-confirmed) through the hand-off.
 */
export class DpkChecklist extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    css`
      :host {
        display: block;
        color: var(--dpk-ink);
      }

      .card {
        border: 1px solid var(--dpk-rule);
        border-radius: var(--dpk-radius-lg);
        background: var(--dpk-paper-raised);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
        padding: 14px 16px 12px;
      }

      .head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }

      .heading {
        font-family: var(--dpk-display);
        font-size: 15px;
        font-weight: 650;
        letter-spacing: -0.01em;
      }

      .count {
        font-family: var(--dpk-mono);
        font-size: 12.5px;
        font-variant-numeric: tabular-nums;
      }

      .count-done {
        color: var(--dpk-ink);
        font-weight: 650;
      }

      .count-total {
        color: var(--dpk-ink-soft);
      }

      .track {
        height: 6px;
        margin: 10px 0 14px;
        border-radius: 999px;
        background: var(--dpk-paper-sunken);
        overflow: hidden;
      }

      .fill {
        height: 100%;
        border-radius: 999px;
        background: var(--dpk-accent);
        transition: width 0.3s var(--dpk-ease);
      }

      ul {
        display: grid;
        gap: 2px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      li {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 10px;
        min-height: 36px;
        padding: 2px 8px;
        border-radius: var(--dpk-radius-sm);
      }

      li:hover,
      li:focus-within,
      li:active {
        background: var(--dpk-paper-sunken);
      }

      li[data-changed] {
        background: color-mix(in srgb, var(--dpk-blue-soft) 60%, transparent);
      }

      .check {
        position: relative;
        display: inline-grid;
        place-items: center;
        width: 20px;
        height: 20px;
      }

      .check-input {
        position: absolute;
        inset: 0;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }

      .check-mark {
        display: inline-grid;
        place-items: center;
        width: 20px;
        height: 20px;
        border: 2px solid var(--dpk-rule-strong);
        border-radius: 50%;
        background: transparent;
        color: var(--dpk-accent-ink);
        pointer-events: none;
        transition:
          background 0.15s var(--dpk-ease),
          border-color 0.15s var(--dpk-ease);
      }

      .check-mark svg {
        width: 12px;
        height: 12px;
        opacity: 0;
        transform: scale(0.5);
        transition:
          opacity 0.15s var(--dpk-ease),
          transform 0.15s var(--dpk-ease-spring);
      }

      .check-input:checked ~ .check-mark {
        border-color: var(--dpk-accent);
        background: var(--dpk-accent);
      }

      .check-input:checked ~ .check-mark svg {
        opacity: 1;
        transform: scale(1);
      }

      .check-input:focus-visible ~ .check-mark {
        box-shadow: var(--dpk-focus);
      }

      label {
        display: grid;
        gap: 2px;
        cursor: pointer;
      }

      [data-checked] .label {
        color: var(--dpk-ink-soft);
        text-decoration: line-through;
      }

      .note {
        color: var(--dpk-ink-soft);
        font-size: 12px;
      }

      .comment {
        display: inline-grid;
        place-items: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: 0;
        border-radius: var(--dpk-radius-sm);
        background: transparent;
        color: var(--dpk-ink-soft);
        opacity: 0;
        cursor: pointer;
      }

      li:hover .comment,
      li:focus-within .comment {
        opacity: 1;
      }

      .comment:hover {
        color: var(--dpk-blue);
      }

      .comment:focus-visible {
        outline: none;
        box-shadow: var(--dpk-focus);
      }

      .comment svg {
        width: 14px;
        height: 14px;
      }

      .error,
      .empty {
        color: var(--dpk-ink-soft);
        font-size: 13px;
      }

      .error {
        color: var(--dpk-danger);
      }
    `,
  ];

  static override properties = {
    id: { type: String, reflect: true },
    heading: { type: String },
  };

  declare heading: string | null;

  readonly #i18n = new LocaleController(this);
  #disposeData: (() => void) | null = null;
  #authored: ChecklistData | null = null;
  #error: string | null = null;
  #data: ChecklistData = emptyChecklistData();
  #elementActions: readonly DraftAction[] = [];
  #results: readonly ElementActionResult[] = [];
  /** The item whose last tick no template recorded. */
  #unrecorded: string | null = null;

  constructor() {
    super();
    this.id = this.getAttribute('id') ?? '';
    this.heading = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disposeData = observeJsonChild(this, parseChecklistData, (result) => {
      if (result.ok) {
        this.#authored = result.value;
        this.#error = null;
      } else {
        this.#authored = null;
        this.#error = result.error;
      }
      this.#replay();
      this.dispatchEvent(new CustomEvent('dpk-comment-targets-change', { bubbles: true, composed: true }));
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disposeData?.();
    this.#disposeData = null;
  }

  get commentTargets(): readonly CommentTargetOption[] {
    if (!this.id) return [];
    const group = `${this.#heading} · ${this.id}`;
    return this.#data.items.map((item) => ({ value: this.#ref(item.id), label: item.label, group }));
  }

  get elementActions(): readonly DraftAction[] {
    return this.#elementActions;
  }

  set elementActions(actions: readonly DraftAction[]) {
    this.#elementActions = actions;
    this.#replay();
  }

  get elementActionResults(): readonly ElementActionResult[] {
    return this.#results;
  }

  protected override render(): unknown {
    const m = this.#m;
    if (this.#error !== null) return html`<p class="error">${this.#error}</p>`;
    const progress = checklistProgress(this.#data);
    const ratio = progress.total === 0 ? 0 : progress.done / progress.total;
    const progressLabel = m.progress(progress.done, progress.total);
    return html`<div class="card">
      <div class="head">
        <span class="heading">${this.#heading}</span>
        <span class="count" aria-label=${progressLabel}
          ><span class="count-done">${progress.done}</span><span class="count-total">/${progress.total}</span></span
        >
      </div>
      <div
        class="track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax=${progress.total}
        aria-valuenow=${progress.done}
        aria-valuetext=${progressLabel}
      >
        <div class="fill" style=${`width: ${ratio * 100}%`}></div>
      </div>
      ${
        this.#data.items.length === 0
          ? html`<p class="empty">${m.empty}</p>`
          : html`<ul>
              ${repeat(
                this.#data.items,
                (item) => item.id,
                (item) => this.#renderItem(m, item),
              )}
            </ul>`
      }
    </div>`;
  }

  get #m(): ChecklistMessages {
    return checklistMessages(this.#i18n.locale);
  }

  get #heading(): string {
    return this.heading ?? this.#m.heading;
  }

  #renderItem(m: ChecklistMessages, item: ChecklistItem): unknown {
    const inputId = `item-${item.id}`;
    return html`<li ?data-checked=${item.checked} ?data-changed=${item.changed}>
      <span class="check">
        <input
          id=${inputId}
          class="check-input"
          type="checkbox"
          .checked=${item.checked}
          @change=${(event: Event) => {
            if (event.currentTarget instanceof HTMLInputElement) this.#toggle(item, event.currentTarget.checked);
          }}
        />
        <span class="check-mark">${iconCheck()}</span>
      </span>
      <label for=${inputId}>
        <span class="label">${item.label}</span>
        ${item.note === null ? nothing : html`<span class="note">${item.note}</span>`}
        ${this.#unrecorded === item.id ? html`<span class="error">${m.unrecorded}</span>` : nothing}
      </label>
      ${
        this.id
          ? html`<button
              class="comment"
              type="button"
              aria-label=${m.commentOn(item.label)}
              title=${m.commentOn(item.label)}
              @click=${() => {
                this.#requestComment(item.id);
              }}
            >
              ${iconComment()}
            </button>`
          : nothing
      }
    </li>`;
  }

  #toggle(item: ChecklistItem, checked: boolean): void {
    const event = new CustomEvent('dpk-element-action', {
      detail: { type: SET_CHECKED, target: this.#ref(item.id), payload: { checked } },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    this.dispatchEvent(event);
    // An accepted action comes back through `elementActions`; otherwise keep the reader's tick visible.
    this.#unrecorded = event.defaultPrevented ? null : item.id;
    this.requestUpdate();
  }

  #requestComment(itemId: string): void {
    this.dispatchEvent(
      new CustomEvent('dpk-comment-request', { detail: { target: this.#ref(itemId) }, bubbles: true, composed: true }),
    );
  }

  #ref(itemId: string): string {
    return `element:${encodeURIComponent(this.id)}/item/${encodeURIComponent(itemId)}`;
  }

  #replay(): void {
    if (this.#authored === null) {
      this.#data = emptyChecklistData();
      this.#results = this.#elementActions.map((action) => ({
        id: action.id,
        title: action.type,
        stale: 'target-missing',
      }));
    } else {
      const replayed = reduceChecklistActions(this.#m, this.#authored, this.#elementActions);
      this.#data = replayed.data;
      this.#results = replayed.results;
    }
    this.requestUpdate();
  }
}
