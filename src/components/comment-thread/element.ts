import { LitElement, css, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { CommentThreadItem } from './model';

import { iconNote, iconTrash } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { PopoverController } from '../../core/popover-controller';
import { controls, popoverSurface, tokens } from '../../core/theme';
import { commentThreadMessages, type CommentThreadMessages } from './messages';

const threadStyles = css`
  :host {
    display: inline-block;
  }

  .thread-trigger {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 1px 7px;
    border: none;
    border-radius: 6px;
    background: color-mix(in oklab, var(--dpk-ink-faint) 10%, var(--dpk-paper-sunken));
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 10.5px;
    font-weight: 600;
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
    line-height: 18px;
    white-space: nowrap;
    cursor: pointer;
  }

  .thread-trigger:hover,
  .thread-trigger[aria-expanded='true'] {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .thread-trigger:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .thread-trigger svg {
    flex: none;
    width: 12px;
    height: 12px;
  }

  .thread-pop {
    width: 320px;
    max-height: 360px;
  }

  .thread-heading {
    font-size: 12.5px;
    overflow-wrap: anywhere;
  }

  .thread-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
    max-height: 180px;
    overflow: auto;
  }

  .thread-list li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 6px 8px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-accent-soft);
  }

  .thread-item-main {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .thread-item-body {
    margin: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    font-size: 12px;
    color: var(--dpk-ink);
  }

  .thread-item-time {
    font-size: 10.5px;
    color: var(--dpk-ink-faint);
  }

  .thread-empty {
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 12px;
  }

  .thread-form {
    display: grid;
    gap: 8px;
  }

  .thread-error {
    margin: 0;
    font-size: 11px;
    color: var(--dpk-danger);
  }

  .thread-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
`;

/**
 * `<dpk-comment-thread>` — a thread of comments kept on one card, part of the
 * host template's own domain data (like a description or a label), not a
 * review comment for the agent.
 *
 * With `inline`, it renders the list and the add field directly, for a
 * surface that is already open (a panel, a drawer). Without it, a badge shows
 * the count and opens the thread in a popover anchored to itself — the usual
 * way to put a persisted comment thread on a card.
 *
 * It owns no storage: the host template passes `comments` and listens for
 * `dpk-thread-comment-add` / `dpk-thread-comment-delete`, each cancelable —
 * the template calls `preventDefault()` once it has applied the change to its
 * own data, the same protocol as `dpk-comment-submit` and `dpk-element-action`.
 * Rejected, the add field keeps the reader's text and shows an error.
 */
export class DpkCommentThread extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, popoverSurface, threadStyles];

  static override properties = {
    comments: { attribute: false },
    label: { type: String },
    inline: { type: Boolean, reflect: true },
    draftKey: { type: String, attribute: 'draft-key' },
    open: { state: true },
  };

  declare comments: readonly CommentThreadItem[];
  /** What the thread is about (a story's name, a task's title); used in the trigger's and popover's labels. */
  declare label: string | null;
  /** Renders the list and the add field directly, without a trigger or a popover. */
  declare inline: boolean;
  /** Forwarded to the add field as `data-dpk-text-key`, so unsent text survives a reload. */
  declare draftKey: string | null;
  declare private open: boolean;

  #error = false;
  #wasOpen = false;
  readonly #i18n = new LocaleController(this);
  readonly #popovers = new PopoverController(this);

  constructor() {
    super();
    this.comments = [];
    this.label = null;
    this.inline = false;
    this.draftKey = null;
    this.open = false;
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    // A reused instance shown for a different card (its `comments` identity
    // changed from outside) drops an error left over from the previous card.
    if (changed.has('comments')) this.#error = false;
  }

  protected override updated(): void {
    if (this.inline) return;
    const surface = this.renderRoot.querySelector<HTMLElement>('.thread-pop');
    const anchor = this.renderRoot.querySelector<HTMLElement>('.thread-trigger');
    const opened = !this.#wasOpen && this.open;
    this.#wasOpen = this.open;
    if (!surface || !anchor) return;
    this.#popovers.open(surface, anchor, { width: 320, height: 360 }, { placement: 'bottom-end' });
    if (opened) surface.querySelector('textarea')?.focus({ preventScroll: true });
  }

  protected override render(): TemplateResult {
    if (this.inline) return this.#renderContent();
    return html`${this.#renderTrigger()}${this.open ? this.#renderPopover() : nothing}`;
  }

  get #m(): CommentThreadMessages {
    return commentThreadMessages(this.#i18n.locale);
  }

  #heading(): string {
    return this.label ? this.#m.commentsOn(this.label) : this.#m.heading;
  }

  #renderTrigger(): TemplateResult {
    const m = this.#m;
    const count = this.comments.length;
    const heading = this.#heading();
    const title = count > 0 ? `${heading} (${m.commentCountAria(count)})` : heading;
    return html`<button
      class="thread-trigger"
      type="button"
      aria-haspopup="dialog"
      aria-expanded=${this.open ? 'true' : 'false'}
      aria-label=${title}
      title=${title}
      @click=${() => {
        this.open = !this.open;
      }}
    >
      ${iconNote()}${count > 0 ? html`<span>${count}</span>` : nothing}
    </button>`;
  }

  #renderPopover(): TemplateResult {
    return html`<div
      class="comment-pop thread-pop"
      popover="manual"
      role="dialog"
      aria-label=${this.#heading()}
      @keydown=${(event: KeyboardEvent) => {
        if (event.isComposing || event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        this.open = false;
      }}
    >
      ${this.#renderContent()}
    </div>`;
  }

  #renderContent(): TemplateResult {
    const m = this.#m;
    return html`
      ${this.inline ? nothing : html`<strong class="thread-heading">${this.#heading()}</strong>`}
      ${
        this.comments.length === 0
          ? html`<p class="thread-empty">${m.empty}</p>`
          : html`<ol class="thread-list">
              ${repeat(
                this.comments,
                (comment) => comment.id,
                (comment) => html`<li>
                  <div class="thread-item-main">
                    <p class="thread-item-body">${comment.body}</p>
                    ${
                      comment.createdAt === undefined
                        ? nothing
                        : html`<time class="thread-item-time" datetime=${comment.createdAt}
                            >${m.commentDate(comment.createdAt)}</time
                          >`
                    }
                  </div>
                  <button
                    class="dpk-icon-btn"
                    type="button"
                    data-role="delete-comment"
                    aria-label=${m.deleteComment}
                    title=${m.deleteComment}
                    @click=${() => {
                      this.#delete(comment.id);
                    }}
                  >
                    ${iconTrash()}
                  </button>
                </li>`,
              )}
            </ol>`
      }
      <form
        class="thread-form"
        @submit=${(event: Event) => {
          event.preventDefault();
          if (event.currentTarget instanceof HTMLFormElement) this.#submit(event.currentTarget);
        }}
      >
        <textarea
          class="dpk-textarea"
          rows="2"
          aria-label=${m.heading}
          data-dpk-text-key=${this.draftKey ?? nothing}
          @keydown=${(event: KeyboardEvent) => {
            if (event.isComposing || event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            const form = event.currentTarget instanceof HTMLElement ? event.currentTarget.closest('form') : null;
            if (form) this.#submit(form);
          }}
        ></textarea>
        ${this.#error ? html`<p class="thread-error" role="alert">${m.sendFailed}</p>` : nothing}
        <div class="thread-actions">
          ${
            this.inline
              ? nothing
              : html`<button
                  class="dpk-btn dpk-btn--ghost"
                  type="button"
                  data-dpk-text-discard
                  @click=${() => {
                    this.open = false;
                  }}
                >
                  ${m.cancel}
                </button>`
          }
          <button class="dpk-btn dpk-btn--accent" type="submit">${m.add}</button>
        </div>
      </form>
    `;
  }

  #submit(form: HTMLFormElement): void {
    const field = form.querySelector('textarea');
    const body = field?.value.trim() ?? '';
    if (!field || body === '') return;
    const accepted = !this.dispatchEvent(
      new CustomEvent('dpk-thread-comment-add', { detail: { body }, bubbles: true, composed: true, cancelable: true }),
    );
    this.#error = !accepted;
    if (accepted) field.value = '';
    this.requestUpdate();
  }

  #delete(id: string): void {
    this.dispatchEvent(
      new CustomEvent('dpk-thread-comment-delete', { detail: { id }, bubbles: true, composed: true, cancelable: true }),
    );
  }
}
