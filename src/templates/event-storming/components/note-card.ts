import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';

import type { DpkComponentInlineEdit } from '../../../components/inline-edit';
import type { DraftAction } from '../../../core/types';
import type { StickyNote } from '../model';
import type { NoteCardMode, NoteIntent } from '../ui-mode';

import { presentComposer } from '../../../components/comment-composer/present';
import { renderComposer } from '../../../components/comment-composer/view';
import { commentBody } from '../../../core/comment';
import { iconComment, iconTrash } from '../../../core/icons';
import { PopoverController } from '../../../core/popover-controller';
import { controls, popoverSurface } from '../../../core/theme';
import { onCommit } from '../../../lib/dom/events';

const COMPOSER_SIZE = { width: 300, height: 260 };

export const NOTE_TYPE_LABELS: Record<StickyNote['type'], string> = {
  actor: 'アクター',
  command: 'コマンド',
  aggregate: '集約',
  event: 'イベント',
  policy: 'ポリシー',
  readmodel: 'リードモデル',
  external: '外部システム',
  hotspot: 'ホットスポット',
};

/** Sticky color per type — the single source for the notes and the legend. */
const NOTE_TYPE_COLORS: Record<StickyNote['type'], { readonly bg: string; readonly ink: string }> = {
  event: { bg: 'linear-gradient(178deg, #ffbc55, #f8a52e)', ink: '#402703' },
  command: { bg: 'linear-gradient(178deg, #93c9f2, #74b4e8)', ink: '#0e2c4b' },
  aggregate: { bg: 'linear-gradient(178deg, #fff3a6, #fdea7e)', ink: '#4a3a06' },
  actor: { bg: 'linear-gradient(178deg, #ffdf63, #fdd23e)', ink: '#423204' },
  policy: { bg: 'linear-gradient(178deg, #dcc2f7, #c9a6f0)', ink: '#32195c' },
  readmodel: { bg: 'linear-gradient(178deg, #c0e788, #a8dc63)', ink: '#22380a' },
  external: { bg: 'linear-gradient(178deg, #f9bcd3, #f4a0c0)', ink: '#4b1029' },
  // Deep red with white ink: a hotspot has to read as a warning at a glance,
  // and the ink must stay AA-legible across the whole gradient.
  hotspot: { bg: 'linear-gradient(178deg, #d63550, #b81c33)', ink: '#ffffff' },
};

/** The palette travels as custom properties, so the legend can reuse it. */
export const notePaletteStyle = (type: StickyNote['type']): string => {
  const { bg, ink } = NOTE_TYPE_COLORS[type];
  return `--es-note-bg:${bg};--es-note-ink:${ink}`;
};

const cardStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    /* Top-aligned: the name stays put when the editor takes its place. */
    justify-content: flex-start;
    position: relative;
    box-sizing: border-box;
    padding: 16px 9px 8px;
    border-radius: 3px;
    background: var(--es-note-bg, var(--dpk-paper-raised));
    color: var(--es-note-ink, var(--dpk-ink));
    box-shadow:
      0 1px 2px rgba(30, 24, 10, 0.14),
      0 5px 10px -4px rgba(30, 24, 10, 0.24);
    cursor: pointer;
    transform: rotate(var(--es-tilt, 0deg));
    transition:
      transform 180ms ease,
      box-shadow 180ms ease;
    overflow: visible;
  }

  :host(:hover) {
    transform: rotate(0deg) translateY(-2px);
    box-shadow:
      0 2px 4px rgba(30, 24, 10, 0.16),
      0 12px 22px -6px rgba(30, 24, 10, 0.3);
    z-index: 6;
  }

  :host([focused]) {
    outline: 2px solid var(--dpk-blue);
    outline-offset: 2px;
    transform: rotate(0deg);
    z-index: 5;
  }

  :host([data-mode='editing']),
  :host([data-mode='commenting']) {
    z-index: 7;
    transform: rotate(0deg);
  }

  /* --------------------------------------------------- sticky note palette */

  /* Small, faint, top-left: readable when looked for, quiet when not. */
  .note-type {
    position: absolute;
    top: 5px;
    left: 7px;
    font-family: var(--dpk-mono);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.12em;
    opacity: 0.5;
  }

  /* Pinned hotspots are small: the type label is off and the name is centered. */
  :host([compact]) {
    justify-content: center;
    padding: 7px 9px 8px;
  }

  :host([compact]) .note-type {
    display: none;
  }

  .note-name {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    font-size: 13px;
    font-weight: 680;
    line-height: 1.32;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }

  :host([compact]) .note-name {
    flex: 0 1 auto;
    font-size: 11.5px;
    line-height: 1.3;
  }

  /* Comments already left: a passive corner flag, readable without hover. */
  .note-flag {
    position: absolute;
    top: -7px;
    right: -7px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
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

  /* A side rail of round buttons that fades in on hover, like the hotspot chip:
     nothing crosses the card's face, and it stays clear of the pins above. */
  .note-tools {
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

  /* Labelled, not a glyph: the hotspot affordance names itself on the card's
     top-right corner. It stays above the pins, which hang above that corner. */
  .note-hotspot {
    position: absolute;
    top: -9px;
    right: -4px;
    z-index: 9;
    padding: 2px 7px;
    border: 1px solid color-mix(in srgb, #e02c44 45%, transparent);
    border-radius: 999px;
    font-size: 9.5px;
    font-weight: 620;
    white-space: nowrap;
    color: #c2213a;
    background: color-mix(in srgb, var(--dpk-paper-raised) 94%, transparent);
    box-shadow: var(--dpk-shadow-xs);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 140ms ease;
  }

  :host(:hover) .note-hotspot,
  :host([data-mode='editing']) .note-hotspot,
  .note-hotspot:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .note-hotspot:hover {
    border-color: #e02c44;
    background: #fff1f3;
  }

  :host(:hover) .note-tools,
  :host([data-mode='commenting']) .note-tools,
  .note-tools:focus-within {
    opacity: 1;
    pointer-events: auto;
  }

  .note-tools .dpk-icon-btn {
    width: 22px;
    height: 22px;
    border: 1px solid var(--dpk-rule);
    border-radius: 50%;
    background: color-mix(in srgb, var(--dpk-paper-raised) 94%, transparent);
    backdrop-filter: blur(2px);
    box-shadow: var(--dpk-shadow-xs);
  }
`;

/**
 * `<dpk-internal-event-storming-note>` — one sticky note on the wall.
 *
 * The board positions and sizes the host; the note only paints itself and
 * reports `NoteIntent`s. Which note is being edited or commented on is the
 * host element's decision (`EsUiMode`); the card renders the mode it is given
 * and never dispatches actions itself.
 */
export class DpkInternalEventStormingNote extends LitElement {
  static override styles = [controls, cardStyles, popoverSurface];

  static override properties = {
    note: { attribute: false },
    notes: { attribute: false },
    mode: { type: String, reflect: true, attribute: 'data-mode' },
    focused: { type: Boolean, reflect: true },
    /** A pin-sized card: keeps the type label off it. */
    compact: { type: Boolean, reflect: true },
    onIntent: { attribute: false },
  };

  declare note: StickyNote | null;
  /** Comments already left on this note. */
  declare notes: readonly DraftAction[];
  declare mode: NoteCardMode;
  declare focused: boolean;
  declare compact: boolean;
  declare onIntent: ((intent: NoteIntent) => void) | null;

  /** Typed text is read on submit; the textarea owns it while typing. */
  #draft = '';
  readonly #popovers = new PopoverController(this);

  constructor() {
    super();
    this.note = null;
    this.notes = [];
    this.mode = 'view';
    this.focused = false;
    this.compact = false;
    this.onIntent = null;
    this.addEventListener('click', () => this.#report({ kind: 'select' }));
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('note') && this.note) {
      this.setAttribute('data-type', this.note.type);
      // The description is not painted on the card: it is only a tooltip.
      if (this.note.description === undefined) this.removeAttribute('title');
      else this.setAttribute('title', this.note.description);
    }
    if (changed.has('mode')) {
      if (this.mode !== 'commenting') this.#draft = '';
      if (this.mode === 'editing') {
        this.renderRoot.querySelector<DpkComponentInlineEdit>('dpk-component-inline-edit')?.startEditing();
      }
    }
    if (this.mode !== 'commenting') return;
    const composer = this.renderRoot.querySelector<HTMLElement>('.comment-pop');
    const button = this.renderRoot.querySelector('[data-role="comment"]');
    if (composer && button) this.#popovers.open(composer, button, COMPOSER_SIZE);
  }

  protected override render(): TemplateResult | typeof nothing {
    const note = this.note;
    if (!note) return nothing;
    return html`
      <div class="note-type">${NOTE_TYPE_LABELS[note.type]}</div>
      <dpk-component-inline-edit
        class="note-name"
        ?wrap=${true}
        ?seamless=${true}
        .value=${note.name}
        .label=${'付箋名'}
        @dpk-commit=${onCommit((name) => this.#report({ kind: 'rename', name }))}
      ></dpk-component-inline-edit>
      ${this.notes.length > 0 ? html`<span class="note-flag">${this.notes.length}</span>` : nothing}
      ${
        note.type === 'hotspot'
          ? nothing
          : html`<button
              class="note-hotspot"
              type="button"
              data-role="hotspot"
              title="この付箋にホットスポットを立てる"
              @click=${this.#tool(() => ({ kind: 'add-hotspot' }))}
            >
              ＋ ホットスポット
            </button>`
      }
      <div class="note-tools">
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="comment"
          aria-label="コメント"
          data-active=${String(this.mode === 'commenting')}
          @click=${this.#tool(() => ({ kind: 'toggle-comment' }))}
        >
          ${iconComment()}
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="delete"
          aria-label="削除"
          @click=${this.#tool(() => ({ kind: 'delete' }))}
        >
          ${iconTrash()}
        </button>
      </div>
      ${this.mode === 'commenting' ? this.#renderComposer() : nothing}
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

  /** Tool buttons must not also select the note. */
  #tool(make: (event: Event) => NoteIntent): (event: Event) => void {
    return (event) => {
      event.stopPropagation();
      this.#report(make(event));
    };
  }

  #report(intent: NoteIntent): void {
    this.onIntent?.(intent);
  }
}

export const defineEsNoteCard = (): void => {
  if (!customElements.get('dpk-internal-event-storming-note'))
    customElements.define('dpk-internal-event-storming-note', DpkInternalEventStormingNote);
};
