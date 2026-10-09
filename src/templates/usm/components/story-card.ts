import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';

import type { DpkComponentInlineEdit } from '../../../components/inline-edit';
import type { DraftAction } from '../../../core/types';
import type { UserStory } from '../model';
import type { CardIntent, CardMode } from '../ui-mode';

import { composerMessages } from '../../../components/comment-composer/messages';
import { presentComposer } from '../../../components/comment-composer/present';
import { renderComposer } from '../../../components/comment-composer/view';
import { commentBody } from '../../../core/comment';
import { iconCheck, iconComment, iconPencil, iconTrash } from '../../../core/icons';
import { LocaleController } from '../../../core/locale-controller';
import { PopoverController } from '../../../core/popover-controller';
import { controls, popoverSurface } from '../../../core/theme';
import { onCommit } from '../../../lib/dom/events';
import { usmMessages, type UsmMessages } from '../messages';
import { statusIcon, statusStyles, statusToneStyle } from '../render/tone';
import { statusViewOf, type StatusView } from '../status-view';

const COMPOSER_SIZE = { width: 300, height: 260 };
const STATUS_OPTION_HEIGHT = 36;

const cardStyles = css`
  /*
   * The card takes its status's color (--usm-tone, set by the map) over its
   * whole surface, like a sticky note of that color: a tinted face, a tinted
   * edge and a tinted foot, never a colored strip down one side. The status
   * icon leads the title; the tools float above the top edge on hover.
   */
  :host {
    --card-tone: var(--usm-tone, var(--dpk-ink-faint));
    position: relative;
    display: grid;
    gap: 7px;
    background:
      radial-gradient(120% 70% at 0% 0%, color-mix(in srgb, var(--card-tone) 16%, transparent), transparent 70%),
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--card-tone) 9%, var(--dpk-paper-raised)),
        var(--dpk-paper-raised) 80%
      );
    border: 1px solid color-mix(in srgb, var(--card-tone) 30%, var(--dpk-rule));
    border-radius: var(--dpk-radius);
    box-shadow:
      var(--dpk-bevel),
      0 1px 0 color-mix(in srgb, var(--card-tone) 12%, transparent),
      0 6px 14px -10px color-mix(in srgb, var(--card-tone) 55%, transparent),
      var(--dpk-shadow-xs);
    padding: 11px 12px 10px;
    cursor: pointer;
    transition:
      box-shadow 200ms var(--dpk-ease),
      transform 200ms var(--dpk-ease),
      border-color 200ms var(--dpk-ease);
  }

  :host(:hover) {
    border-color: color-mix(in srgb, var(--card-tone) 50%, var(--dpk-rule-strong));
    box-shadow:
      var(--dpk-bevel),
      0 10px 22px -12px color-mix(in srgb, var(--card-tone) 65%, transparent),
      var(--dpk-shadow-sm);
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

  .card-head {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    min-width: 0;
  }

  /* The status icon is also the button that opens the status menu. */
  .card-status {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    margin: -2px -3px -2px -4px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    transition: background 140ms var(--dpk-ease);
  }

  .card-status:hover,
  .card-status[aria-expanded='true'] {
    background: color-mix(in srgb, var(--card-tone) 18%, transparent);
  }

  .card-status:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .card-name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 13px;
    font-weight: 640;
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
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-size: 11.5px;
    line-height: 1.55;
    color: var(--dpk-ink-soft);
    white-space: pre-wrap;
  }

  /* Where the story sits and what was said about it, under a tinted rule. */
  .card-foot {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    margin-top: 1px;
    padding-top: 7px;
    border-top: 1px dashed color-mix(in srgb, var(--card-tone) 28%, var(--dpk-rule));
  }

  .card-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 1px 7px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--card-tone) 12%, var(--dpk-paper-sunken));
    color: var(--dpk-ink-soft);
    font-size: 10.5px;
    font-weight: 600;
    line-height: 18px;
  }

  .card-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-chip[data-kind='comments'] {
    margin-left: auto;
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
  }

  .card-chip svg {
    flex: none;
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

  /* The status menu: every status with its icon, the current one checked. */
  .comment-pop.status-pop {
    gap: 2px;
    padding: 6px;
  }

  .status-option {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    min-height: 30px;
    padding: 4px 10px 4px 8px;
    border: 0;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    font-weight: 560;
    text-align: left;
    cursor: pointer;
  }

  .status-option:hover,
  .status-option:focus-visible {
    outline: none;
    background: color-mix(in srgb, var(--usm-tone) 14%, var(--dpk-paper-inset));
  }

  .status-option[aria-checked='true'] {
    background: color-mix(in srgb, var(--usm-tone) 12%, transparent);
  }

  .status-option .status-check {
    display: inline-flex;
    margin-left: auto;
    color: var(--dpk-ink-soft);
  }

  .status-option .status-check svg {
    width: 14px;
    height: 14px;
  }

  .status-option[data-status=''] {
    color: var(--dpk-ink-soft);
  }
`;

/**
 * `<dpk-internal-usm-story-card>` — one user story on the map.
 *
 * The card owns only what is ephemeral *to itself*: the comment draft while it
 * is typed and the placement of its popovers. Which card is being edited,
 * commented on or re-statused is the host's decision (`UsmUiMode`); the card
 * just renders the `mode` it is given and reports `CardIntent`s through
 * `onIntent`. It never dispatches actions.
 *
 * Drag & drop is bound by the host on this element (it is the draggable), so
 * `dragging` is a plain reflected input like `focused`.
 */
export class DpkInternalUsmStoryCard extends LitElement {
  static override styles = [controls, statusStyles, cardStyles, popoverSurface];

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
  declare statuses: readonly StatusView[];
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
    // Popovers float in the top layer so opening one never moves the card;
    // each hangs off the button that opened it.
    if (this.mode === 'commenting')
      this.#float('.comment-pop:not(.status-pop)', '[data-role="comment"]', COMPOSER_SIZE);
    if (this.mode === 'status') {
      const size = { width: 200, height: 16 + (this.statuses.length + 1) * STATUS_OPTION_HEIGHT };
      this.#float('.status-pop', '[data-role="status"]', size);
      if (changed.has('mode'))
        this.renderRoot.querySelector<HTMLElement>('.status-option[aria-checked="true"]')?.focus();
    }
  }

  #float(surfaceSelector: string, anchorSelector: string, size: { width: number; height: number }): void {
    const surface = this.renderRoot.querySelector<HTMLElement>(surfaceSelector);
    const anchor = this.renderRoot.querySelector(anchorSelector);
    if (surface && anchor) this.#popovers.open(surface, anchor, size);
  }

  protected override render(): TemplateResult | typeof nothing {
    const story = this.story;
    if (!story) return nothing;
    const m = usmMessages(this.#i18n.locale);
    const editing = this.mode === 'editing';
    const commenting = this.mode === 'commenting';
    const hasFoot = this.stepName !== '' || this.notes.length > 0;
    return html`
      <div class="card-head">
        ${this.statuses.length === 0 ? nothing : this.#renderStatusButton(m, story)}
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
      </div>
      ${story.description ? html`<div class="card-text">${story.description}</div>` : nothing}
      ${
        hasFoot
          ? html`<div class="card-foot">
              ${this.stepName === '' ? nothing : html`<span class="card-chip" data-kind="step"><span>${this.stepName}</span></span>`}
              ${
                this.notes.length > 0
                  ? html`<span
                      class="card-chip"
                      data-kind="comments"
                      aria-label=${m.commentCountAria(this.notes.length)}
                    >
                      ${iconComment()}<span>${this.notes.length}</span>
                    </span>`
                  : nothing
              }
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
      ${this.mode === 'status' ? this.#renderStatusMenu(m, story) : nothing}
      ${commenting ? this.#renderComposer() : nothing}
    `;
  }

  #renderStatusButton(m: UsmMessages, story: UserStory): TemplateResult {
    const current = statusViewOf(this.statuses, story);
    return html`<button
      class="card-status"
      type="button"
      data-role="status"
      aria-haspopup="menu"
      aria-expanded=${String(this.mode === 'status')}
      aria-label=${m.storyStatusAria(current?.name ?? m.statusUnset)}
      title=${current?.name ?? m.statusUnset}
      @click=${this.#tool({ kind: 'toggle-status' })}
    >
      ${statusIcon(current?.progress)}
    </button>`;
  }

  /** Every status, then "no status"; picking one reports it and the host turns it into an action. */
  #renderStatusMenu(m: UsmMessages, story: UserStory): TemplateResult {
    const current = story.statusId ?? null;
    const options = [
      ...this.statuses.map((status) => ({ id: status.id as string | null, name: status.name, view: status })),
      { id: null, name: m.statusUnset, view: undefined },
    ];
    return html`<div
      class="comment-pop status-pop"
      popover="manual"
      role="menu"
      aria-label=${m.storyStatusLabel}
      @click=${(event: Event) => event.stopPropagation()}
      @keydown=${(event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        this.#report({ kind: 'toggle-status' });
      }}
    >
      ${options.map(
        (option) => html`<button
          class="status-option"
          type="button"
          role="menuitemradio"
          data-status=${option.id ?? ''}
          aria-checked=${String(option.id === current)}
          style=${statusToneStyle(option.view?.tone)}
          @click=${() => {
            if (option.id === current) this.#report({ kind: 'toggle-status' });
            else this.#report({ kind: 'set-status', statusId: option.id });
          }}
        >
          ${statusIcon(option.view?.progress)}
          <span>${option.name}</span>
          ${option.id === current ? html`<span class="status-check" aria-hidden="true">${iconCheck()}</span>` : nothing}
        </button>`,
      )}
    </div>`;
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
