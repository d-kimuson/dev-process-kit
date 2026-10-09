import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';

import type { DpkComponentInlineEdit } from '../../../components/inline-edit';
import type { DraftAction } from '../../../core/types';
import type { StoryStatus, UserStory } from '../model';
import type { CardIntent, CardMode } from '../ui-mode';

import { composerMessages } from '../../../components/comment-composer/messages';
import { presentComposer } from '../../../components/comment-composer/present';
import { renderComposer } from '../../../components/comment-composer/view';
import { commentBody } from '../../../core/comment';
import { iconComment, iconPencil, iconTrash } from '../../../core/icons';
import { LocaleController } from '../../../core/locale-controller';
import { PopoverController } from '../../../core/popover-controller';
import { controls, popoverSurface } from '../../../core/theme';
import { onCommit } from '../../../lib/dom/events';
import { usmMessages } from '../messages';

const COMPOSER_SIZE = { width: 300, height: 260 };

const cardStyles = css`
  /*
   * The card takes its activity's tone (--usm-tone, set by the map) over its
   * whole surface, like a sticky note of that activity's color: a tinted face
   * and a tinted edge, never a colored strip down one side. The tools float
   * above the top edge on hover instead of reserving an empty strip at the
   * bottom of every card.
   */
  :host {
    --card-tone: var(--usm-tone, var(--dpk-ink-faint));
    position: relative;
    display: grid;
    gap: 6px;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--card-tone) 15%, var(--dpk-paper-raised)),
      color-mix(in srgb, var(--card-tone) 6%, var(--dpk-paper-raised)) 75%
    );
    border: 1px solid color-mix(in srgb, var(--card-tone) 34%, var(--dpk-rule));
    border-radius: var(--dpk-radius);
    box-shadow:
      var(--dpk-bevel),
      0 1px 0 color-mix(in srgb, var(--card-tone) 10%, transparent),
      var(--dpk-shadow-xs);
    padding: 11px 12px 10px;
    cursor: pointer;
    transition:
      box-shadow 200ms var(--dpk-ease),
      transform 200ms var(--dpk-ease),
      border-color 200ms var(--dpk-ease);
  }

  :host(:hover) {
    border-color: color-mix(in srgb, var(--card-tone) 46%, var(--dpk-rule-strong));
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    transform: translateY(-2px);
  }

  :host([focused]) {
    border-color: var(--dpk-blue);
    box-shadow:
      var(--dpk-bevel),
      var(--dpk-shadow),
      0 0 0 2px color-mix(in srgb, var(--dpk-blue) 22%, transparent);
  }

  :host([dragging]) {
    opacity: 0.45;
    transform: none;
  }

  /* The step a card belongs to, where the column does not already say it. */
  .card-step {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: color-mix(in srgb, var(--card-tone) 55%, var(--dpk-ink-soft));
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
  }

  .card-step::before {
    content: '';
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--card-tone);
  }

  .card-step span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-name {
    font-size: 13px;
    font-weight: 620;
    letter-spacing: -0.01em;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  /* The field pads its text by 4px; pull it out by as much so the name keeps
     its place and its wrap width when editing starts. */
  .card-name dpk-component-inline-edit {
    display: block;
    margin: 0 -4px;
  }

  .card-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
    font-size: 11.5px;
    line-height: 1.55;
    color: var(--dpk-ink-soft);
    white-space: pre-wrap;
  }

  /* The story's status as a tinted pill; the native select inside it opens the choices. */
  .card-status {
    justify-self: start;
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    max-width: 100%;
    padding: 0 8px 0 7px;
    border: 1px solid color-mix(in srgb, var(--card-tone) 40%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--card-tone) 16%, var(--dpk-paper-raised));
    color: color-mix(in srgb, var(--card-tone) 70%, var(--dpk-ink));
    font-size: 10.5px;
    font-weight: 650;
    line-height: 18px;
    cursor: pointer;
  }

  .card-status:hover {
    border-color: color-mix(in srgb, var(--card-tone) 65%, transparent);
  }

  .card-status:focus-within {
    box-shadow: var(--dpk-focus);
  }

  .card-status-dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--card-tone);
  }

  .card-status select {
    appearance: none;
    field-sizing: content;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    outline: none;
  }

  /* A card with no status yet stays quiet. */
  :host([data-status='']) .card-status {
    border-style: dashed;
    background: transparent;
    color: var(--dpk-ink-faint);
    font-weight: 500;
  }

  /* Comments already left, as a small tinted chip at the foot of the card. */
  .card-meta {
    display: flex;
    justify-content: flex-end;
    margin-top: 2px;
  }

  .card-meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 7px 1px 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--card-tone) 12%, var(--dpk-paper-sunken));
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
    line-height: 18px;
  }

  .card-meta svg {
    width: 12px;
    height: 12px;
  }

  .card-tools {
    position: absolute;
    top: -13px;
    right: 8px;
    z-index: 1;
    display: flex;
    gap: 1px;
    padding: 2px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    opacity: 0;
    transform: translateY(3px);
    pointer-events: none;
    transition:
      opacity 150ms ease,
      transform 150ms var(--dpk-ease);
  }

  .card-tools .dpk-icon-btn {
    width: 24px;
    height: 24px;
  }

  :host(:hover) .card-tools,
  :host(:focus-within) .card-tools,
  :host([focused]) .card-tools,
  :host([data-mode='editing']) .card-tools,
  :host([data-mode='commenting']) .card-tools {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
`;

/**
 * `<dpk-internal-usm-story-card>` — one user story on the map.
 *
 * The card owns only what is ephemeral *to itself*: the comment draft while it
 * is typed and the placement of its composer popover. Which card is being
 * edited or commented on is the host's decision (`UsmUiMode`); the card just
 * renders the `mode` it is given and reports `CardIntent`s through `onIntent`.
 * It never dispatches actions.
 *
 * Drag & drop is bound by the host on this element (it is the draggable), so
 * `dragging` is a plain reflected input like `focused`.
 */
export class DpkInternalUsmStoryCard extends LitElement {
  static override styles = [controls, cardStyles, popoverSurface];

  static override properties = {
    story: { attribute: false },
    stepName: { attribute: false },
    statuses: { attribute: false },
    notes: { attribute: false },
    mode: { type: String, reflect: true, attribute: 'data-mode' },
    focused: { type: Boolean, reflect: true },
    dragging: { type: Boolean, reflect: true },
    onIntent: { attribute: false },
  };

  declare story: UserStory | null;
  /** The story's step, shown where the column does not already say it; `''` hides it. */
  declare stepName: string;
  /** The statuses the map defines; with none, the card shows no status. */
  declare statuses: readonly StoryStatus[];
  /** Comments already left on this story. */
  declare notes: readonly DraftAction[];
  declare mode: CardMode;
  declare focused: boolean;
  declare dragging: boolean;
  declare onIntent: ((intent: CardIntent) => void) | null;

  /** Typed text is read on submit; the textarea owns it while typing. */
  #draft = '';
  readonly #popovers = new PopoverController(this);
  readonly #i18n = new LocaleController(this);

  constructor() {
    super();
    this.story = null;
    this.stepName = '';
    this.statuses = [];
    this.notes = [];
    this.mode = 'view';
    this.focused = false;
    this.dragging = false;
    this.onIntent = null;
    this.addEventListener('click', () => this.#report({ kind: 'select' }));
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('mode')) {
      if (this.mode !== 'commenting') this.#draft = '';
      if (this.mode === 'editing') {
        this.renderRoot.querySelector<DpkComponentInlineEdit>('dpk-component-inline-edit')?.startEditing();
      }
    }
    if (this.mode !== 'commenting') return;
    // The composer floats in the top layer so opening it never moves the card;
    // it hangs off the comment button that opened it.
    const composer = this.renderRoot.querySelector<HTMLElement>('.comment-pop');
    const button = this.renderRoot.querySelector('[data-role="comment"]');
    if (composer && button) this.#popovers.open(composer, button, COMPOSER_SIZE);
  }

  protected override render(): TemplateResult | typeof nothing {
    const story = this.story;
    if (!story) return nothing;
    const m = usmMessages(this.#i18n.locale);
    const editing = this.mode === 'editing';
    const commenting = this.mode === 'commenting';
    return html`
      ${this.stepName === '' ? nothing : html`<div class="card-step"><span>${this.stepName}</span></div>`}
      ${this.statuses.length === 0 ? nothing : this.#renderStatus(m, story)}
      <div class="card-name">
        ${
          editing
            ? html`<dpk-component-inline-edit
                wrap
                .value=${story.name}
                .label=${m.storyNameLabel}
                @dpk-commit=${onCommit((name) => this.#report({ kind: 'rename', name }))}
              ></dpk-component-inline-edit>`
            : html`<span>${story.name}</span>`
        }
      </div>
      ${story.description ? html`<div class="card-text">${story.description}</div>` : nothing}
      ${
        this.notes.length > 0
          ? html`<div class="card-meta">
              <span class="card-meta-chip" aria-label=${m.commentCountAria(this.notes.length)}>
                ${iconComment()}<span>${this.notes.length}</span>
              </span>
            </div>`
          : nothing
      }
      <div class="card-tools">
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="edit"
          aria-label=${m.editTitleAria}
          data-active=${String(editing)}
          @click=${this.#tool({ kind: 'toggle-edit' })}
        >
          ${iconPencil()}
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="comment"
          aria-label=${m.commentAria}
          data-active=${String(commenting)}
          @click=${this.#tool({ kind: 'toggle-comment' })}
        >
          ${iconComment()}
          ${this.notes.length > 0 ? html`<span class="dpk-icon-badge">${this.notes.length}</span>` : nothing}
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="delete"
          aria-label=${m.deleteAria}
          @click=${this.#tool({ kind: 'delete' })}
        >
          ${iconTrash()}
        </button>
      </div>
      ${commenting ? this.#renderComposer() : nothing}
    `;
  }

  /** The story's status as a pill; picking another one reports it, the host turns it into an action. */
  #renderStatus(m: ReturnType<typeof usmMessages>, story: UserStory): TemplateResult {
    const current = story.statusId ?? '';
    return html`<label class="card-status" @click=${(event: Event) => event.stopPropagation()}>
      <span class="card-status-dot" aria-hidden="true"></span>
      <select
        aria-label=${m.storyStatusLabel}
        draggable="false"
        @mousedown=${(event: Event) => event.stopPropagation()}
        @change=${(event: Event) => {
          const value = event.target instanceof HTMLSelectElement ? event.target.value : current;
          if (value !== current) this.#report({ kind: 'set-status', statusId: value === '' ? null : value });
        }}
      >
        <option value="" ?selected=${current === ''}>${m.statusUnset}</option>
        ${this.statuses.map(
          (status) => html`<option value=${status.id} ?selected=${status.id === current}>${status.name}</option>`,
        )}
      </select>
    </label>`;
  }

  #renderComposer(): TemplateResult {
    return renderComposer(
      composerMessages(this.#i18n.locale),
      presentComposer(this.#draft, this.notes.map(commentBody), this.story ? { key: `story:${this.story.id}` } : {}),
      (intent) => {
        if (intent.kind === 'input') {
          this.#draft = intent.body;
          this.requestUpdate();
        } else this.#report(intent);
      },
    );
  }

  /** Tool buttons must not also select the card. */
  #tool(intent: CardIntent): (event: Event) => void {
    return (event) => {
      event.stopPropagation();
      this.#report(intent);
    };
  }

  #report(intent: CardIntent): void {
    this.onIntent?.(intent);
  }
}

export const defineUsmStoryCard = (): void => {
  if (!customElements.get('dpk-internal-usm-story-card'))
    customElements.define('dpk-internal-usm-story-card', DpkInternalUsmStoryCard);
};
