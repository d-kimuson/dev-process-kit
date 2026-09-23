import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';

import type { ArtifactInlineEdit } from '../../../components/inline-edit';
import type { DraftAction } from '../../../core/types';
import type { UserStory } from '../model';
import type { CardIntent, CardMode } from '../ui-mode';

import { presentComposer } from '../../../components/comment-composer/present';
import { renderComposer } from '../../../components/comment-composer/view';
import { commentBody } from '../../../core/comment';
import { iconComment, iconPencil, iconTrash } from '../../../core/icons';
import { PopoverController } from '../../../core/popover-controller';
import { controls, popoverSurface } from '../../../core/theme';
import { onCommit } from '../../../lib/dom/events';

const COMPOSER_SIZE = { width: 300, height: 260 };

const cardStyles = css`
  :host {
    display: grid;
    gap: 5px;
    background: var(--af-paper-raised);
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius);
    box-shadow: var(--af-shadow-xs);
    padding: 10px 12px 8px;
    cursor: pointer;
    transition:
      box-shadow 200ms ease,
      transform 200ms ease,
      border-color 200ms ease;
  }

  :host(:hover) {
    border-color: var(--af-rule-strong);
    box-shadow: var(--af-shadow-sm);
    transform: translateY(-1px);
  }

  :host([focused]) {
    border-color: var(--af-blue);
    box-shadow:
      var(--af-shadow),
      0 0 0 2px rgba(51, 102, 204, 0.12);
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
    color: var(--af-ink-soft);
    white-space: pre-wrap;
  }

  .card-tools {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: flex-end;
    margin-top: 2px;
    padding-top: 5px;
    border-top: 1px solid var(--af-rule);
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
 * `<artifact-usm-card>` — one user story on the map.
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
export class UsmStoryCard extends LitElement {
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
        this.renderRoot.querySelector<ArtifactInlineEdit>('artifact-inline-edit')?.startEditing();
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
    const editing = this.mode === 'editing';
    const commenting = this.mode === 'commenting';
    return html`
      <div class="card-name">
        ${
          editing
            ? html`<artifact-inline-edit
                .value=${story.name}
                .label=${'ストーリー名'}
                @artifact-commit=${onCommit((name) => this.#report({ kind: 'rename', name }))}
              ></artifact-inline-edit>`
            : html`<span>${story.name}</span>`
        }
      </div>
      ${story.description ? html`<div class="card-text">${story.description}</div>` : nothing}
      <div class="card-tools">
        <button
          class="af-icon-btn"
          type="button"
          data-role="edit"
          aria-label="タイトルを編集"
          data-active=${String(editing)}
          @click=${this.#tool({ kind: 'toggle-edit' })}
        >
          ${iconPencil()}
        </button>
        <button
          class="af-icon-btn"
          type="button"
          data-role="comment"
          aria-label="コメント"
          data-active=${String(commenting)}
          @click=${this.#tool({ kind: 'toggle-comment' })}
        >
          ${iconComment()}
          ${this.notes.length > 0 ? html`<span class="af-icon-badge">${this.notes.length}</span>` : nothing}
        </button>
        <button
          class="af-icon-btn"
          type="button"
          data-role="delete"
          aria-label="削除"
          @click=${this.#tool({ kind: 'delete' })}
        >
          ${iconTrash()}
        </button>
      </div>
      ${commenting ? this.#renderComposer() : nothing}
    `;
  }

  #renderComposer(): TemplateResult {
    return renderComposer(presentComposer(this.#draft, this.notes.map(commentBody)), (intent) => {
      if (intent.kind === 'input') {
        this.#draft = intent.body;
        this.requestUpdate();
      } else this.#report(intent);
    });
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

export const defineUsmStoryCard = (tag = 'artifact-usm-card'): void => {
  if (!customElements.get(tag)) customElements.define(tag, UsmStoryCard);
};
