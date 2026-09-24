import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';

import type { DpkComponentInlineEdit } from '../../../components/inline-edit';
import type { DraftAction } from '../../../core/types';
import type { UserStory } from '../model';
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
  :host {
    position: relative;
    display: grid;
    gap: 5px;
    background: var(--dpk-paper-raised);
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    padding: 10px 12px 8px 14px;
    cursor: pointer;
    transition:
      box-shadow 200ms var(--dpk-ease),
      transform 200ms var(--dpk-ease),
      border-color 200ms var(--dpk-ease);
  }

  /* Left accent: a quiet claim that this card belongs to the board's story
     lane, without a hard border changing the card's shape. */
  :host::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 3px 0 0 color-mix(in srgb, var(--dpk-usm-accent) 65%, transparent);
    pointer-events: none;
  }

  :host(:hover) {
    border-color: var(--dpk-rule-strong);
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

  .card-name {
    font-size: 13px;
    font-weight: 620;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }

  .card-text {
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--dpk-ink-soft);
    white-space: pre-wrap;
  }

  .card-tools {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: flex-end;
    margin-top: 2px;
    padding-top: 5px;
    border-top: 1px solid var(--dpk-rule);
    opacity: 0;
    transition: opacity 150ms ease;
  }

  :host(:hover) .card-tools,
  :host([focused]) .card-tools,
  :host([data-mode='editing']) .card-tools,
  :host([data-mode='commenting']) .card-tools {
    opacity: 1;
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
    notes: { attribute: false },
    mode: { type: String, reflect: true, attribute: 'data-mode' },
    focused: { type: Boolean, reflect: true },
    dragging: { type: Boolean, reflect: true },
    onIntent: { attribute: false },
  };

  declare story: UserStory | null;
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
      <div class="card-name">
        ${
          editing
            ? html`<dpk-component-inline-edit
                .value=${story.name}
                .label=${m.storyNameLabel}
                @dpk-commit=${onCommit((name) => this.#report({ kind: 'rename', name }))}
              ></dpk-component-inline-edit>`
            : html`<span>${story.name}</span>`
        }
      </div>
      ${story.description ? html`<div class="card-text">${story.description}</div>` : nothing}
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

  #renderComposer(): TemplateResult {
    return renderComposer(
      composerMessages(this.#i18n.locale),
      presentComposer(this.#draft, this.notes.map(commentBody)),
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
