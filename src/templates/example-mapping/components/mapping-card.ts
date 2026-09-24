import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';

import type { DpkComponentInlineEdit } from '../../../components/inline-edit';
import type { DraftAction } from '../../../core/types';
import type { MappingCard, MappingCardKind } from '../model';
import type { MappingCardIntent, MappingCardMode } from '../ui-mode';

import { composerMessages } from '../../../components/comment-composer/messages';
import { presentComposer } from '../../../components/comment-composer/present';
import { renderComposer } from '../../../components/comment-composer/view';
import { commentBody } from '../../../core/comment';
import { iconComment, iconTrash } from '../../../core/icons';
import { LocaleController } from '../../../core/locale-controller';
import { PopoverController } from '../../../core/popover-controller';
import { controls, popoverSurface } from '../../../core/theme';
import { onCommit } from '../../../lib/dom/events';
import { exampleMappingMessages } from '../messages';

const COMPOSER_SIZE = { width: 300, height: 260 };

/** Board order of the four card kinds: the order the legend reads them in. */
export const CARD_KINDS = ['story', 'rule', 'example', 'question'] as const satisfies readonly MappingCardKind[];

/** Card color per kind — the single source for the cards and the legend. */
const CARD_PALETTE = {
  story: { bg: 'linear-gradient(178deg, #fff3a6, #fde77a)', ink: '#4a3a06' },
  rule: { bg: 'linear-gradient(178deg, #a3d1f5, #7cb8ea)', ink: '#0e2c4b' },
  example: { bg: 'linear-gradient(178deg, #c9eb95, #a8dc63)', ink: '#22380a' },
  question: { bg: 'linear-gradient(178deg, #fbc6d9, #f4a0c0)', ink: '#4b1029' },
} as const satisfies Record<MappingCardKind, { readonly bg: string; readonly ink: string }>;

/** The palette travels as custom properties, so the legend can reuse it. */
export const cardPaletteStyle = (kind: MappingCardKind): string => {
  const { bg, ink } = CARD_PALETTE[kind];
  return `--em-card-bg:${bg};--em-card-ink:${ink}`;
};

const cardStyles = css`
  :host {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-sizing: border-box;
    min-height: 76px;
    padding: 17px 11px 11px;
    border-radius: 3px;
    background: var(--em-card-bg, var(--dpk-paper-raised));
    color: var(--em-card-ink, var(--dpk-ink));
    box-shadow:
      0 1px 2px rgba(30, 24, 10, 0.14),
      0 5px 10px -4px rgba(30, 24, 10, 0.24);
    cursor: grab;
    transform: rotate(var(--em-tilt, 0deg));
    transition:
      transform 180ms ease,
      box-shadow 180ms ease,
      opacity 180ms ease;
  }

  :host(:hover) {
    z-index: 6;
    transform: rotate(0deg) translateY(-2px);
    box-shadow:
      0 2px 4px rgba(30, 24, 10, 0.16),
      0 12px 22px -6px rgba(30, 24, 10, 0.3);
  }

  :host([focused]) {
    z-index: 5;
    outline: 2px solid var(--dpk-blue);
    outline-offset: 2px;
    transform: rotate(0deg);
  }

  :host([data-mode='editing']),
  :host([data-mode='commenting']) {
    z-index: 7;
    transform: rotate(0deg);
  }

  :host([dragging]) {
    opacity: 0.4;
  }

  :host([data-kind='story']) {
    min-height: 68px;
    padding: 19px 14px 13px;
  }

  /* Small, faint, top-left: readable when looked for, quiet when not. */
  .card-kind {
    position: absolute;
    top: 5px;
    left: 8px;
    font-family: var(--dpk-mono);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.12em;
    opacity: 0.5;
  }

  .card-name {
    min-width: 0;
    font-size: 13px;
    font-weight: 680;
    line-height: 1.35;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
    cursor: text;
  }

  :host([data-kind='story']) .card-name {
    font-size: 15.5px;
    line-height: 1.3;
  }

  .card-text {
    font-size: 11.5px;
    line-height: 1.5;
    opacity: 0.72;
    white-space: pre-wrap;
  }

  /* Comments already left: a corner flag, readable without hover. */
  .card-flag {
    position: absolute;
    top: -7px;
    right: -7px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    box-sizing: border-box;
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 9.5px;
    font-weight: 650;
    line-height: 17px;
    text-align: center;
    box-shadow: 0 1px 4px rgba(217, 73, 32, 0.35);
  }

  /* A side rail of round buttons that fades in on hover, like Event Storming:
     nothing crosses the card's face. */
  .card-tools {
    position: absolute;
    top: 9px;
    right: -11px;
    z-index: 8;
    display: flex;
    flex-direction: column;
    gap: 3px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 140ms ease;
  }

  :host(:hover) .card-tools,
  :host([data-mode='commenting']) .card-tools,
  .card-tools:focus-within {
    opacity: 1;
    pointer-events: auto;
  }

  .card-tools .dpk-icon-btn {
    width: 22px;
    height: 22px;
    border: 1px solid var(--dpk-rule);
    border-radius: 50%;
    background: color-mix(in srgb, var(--dpk-paper-raised) 94%, transparent);
    box-shadow: var(--dpk-shadow-xs);
  }
`;

/**
 * `<dpk-internal-example-mapping-card>` — one story, rule, example or question,
 * drawn as a sticky note whose name is edited where it sits.
 *
 * The board positions the host; the card only paints itself and reports
 * `MappingCardIntent`s. Which card is being edited or commented on is the
 * host's decision (`ExampleMappingUiMode`); the card renders the mode it is
 * given and never dispatches actions itself.
 */
export class DpkInternalExampleMappingCard extends LitElement {
  static override styles = [controls, cardStyles, popoverSurface];

  static override properties = {
    card: { attribute: false },
    notes: { attribute: false },
    tilt: { attribute: false },
    mode: { type: String, reflect: true, attribute: 'data-mode' },
    focused: { type: Boolean, reflect: true },
    dragging: { type: Boolean, reflect: true },
    onIntent: { attribute: false },
  };

  declare card: MappingCard | null;
  /** Comments already left on this card. */
  declare notes: readonly DraftAction[];
  /** Degrees of hand-placed tilt. */
  declare tilt: number;
  declare mode: MappingCardMode;
  declare focused: boolean;
  declare dragging: boolean;
  declare onIntent: ((intent: MappingCardIntent) => void) | null;

  /** Typed text is read on submit; the textarea owns it while typing. */
  #draft = '';
  readonly #popovers = new PopoverController(this);
  readonly #i18n = new LocaleController(this);

  constructor() {
    super();
    this.card = null;
    this.notes = [];
    this.tilt = 0;
    this.mode = 'view';
    this.focused = false;
    this.dragging = false;
    this.onIntent = null;
    this.addEventListener('click', () => this.#report({ kind: 'select' }));
    // Text in a draggable element cannot be selected: typing turns dragging off.
    this.addEventListener('focusin', () => (this.draggable = false));
    this.addEventListener('focusout', () => (this.draggable = true));
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('card') && this.card) {
      const { bg, ink } = CARD_PALETTE[this.card.kind];
      this.setAttribute('data-kind', this.card.kind);
      this.style.setProperty('--em-card-bg', bg);
      this.style.setProperty('--em-card-ink', ink);
    }
    if (changed.has('tilt')) this.style.setProperty('--em-tilt', `${this.tilt}deg`);
    if (changed.has('mode')) {
      if (this.mode !== 'commenting') this.#draft = '';
      if (this.mode === 'editing') {
        this.renderRoot.querySelector<DpkComponentInlineEdit>('dpk-component-inline-edit')?.startEditing();
      }
    }
    if (this.mode !== 'commenting') return;
    // The composer floats in the top layer so opening it never moves the card.
    const composer = this.renderRoot.querySelector<HTMLElement>('.comment-pop');
    const button = this.renderRoot.querySelector('[data-role="comment"]');
    if (composer && button) this.#popovers.open(composer, button, COMPOSER_SIZE);
  }

  protected override render(): TemplateResult | typeof nothing {
    const card = this.card;
    if (!card) return nothing;
    const m = exampleMappingMessages(this.#i18n.locale);
    const label = m.kindLabel(card.kind);
    return html`
      <div class="card-kind">${label}</div>
      <dpk-component-inline-edit
        class="card-name"
        ?wrap=${true}
        ?seamless=${true}
        .value=${card.name}
        .label=${m.nameField(label)}
        @dpk-commit=${onCommit((name) => this.#report({ kind: 'rename', name }))}
      ></dpk-component-inline-edit>
      ${card.description ? html`<div class="card-text">${card.description}</div>` : nothing}
      ${this.notes.length > 0 ? html`<span class="card-flag">${this.notes.length}</span>` : nothing}
      <div class="card-tools">
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="comment"
          aria-label=${m.commentButton}
          data-active=${String(this.mode === 'commenting')}
          @click=${this.#tool({ kind: 'toggle-comment' })}
        >
          ${iconComment()}
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="delete"
          aria-label=${m.deleteButton}
          @click=${this.#tool({ kind: 'delete' })}
        >
          ${iconTrash()}
        </button>
      </div>
      ${this.mode === 'commenting' ? this.#renderComposer(card) : nothing}
    `;
  }

  #renderComposer(card: MappingCard): TemplateResult {
    return renderComposer(
      composerMessages(this.#i18n.locale),
      presentComposer(this.#draft, this.notes.map(commentBody), { label: card.name }),
      (intent) => {
        if (intent.kind === 'input') {
          this.#draft = intent.body;
          this.requestUpdate();
        } else this.#report(intent);
      },
    );
  }

  /** Tool buttons must not also select the card. */
  #tool(intent: MappingCardIntent): (event: Event) => void {
    return (event) => {
      event.stopPropagation();
      this.#report(intent);
    };
  }

  #report(intent: MappingCardIntent): void {
    this.onIntent?.(intent);
  }
}

export const defineExampleMappingCard = (): void => {
  if (!customElements.get('dpk-internal-example-mapping-card'))
    customElements.define('dpk-internal-example-mapping-card', DpkInternalExampleMappingCard);
};
