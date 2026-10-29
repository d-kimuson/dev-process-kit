import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';

import type { DpkInlineEdit } from '../../../components/inline-edit';
import type { StickyNote } from '../model';
import type { NoteCardMode, NoteIntent } from '../ui-mode';

import { iconComment, iconPencil, iconTrash } from '../../../core/icons';
import { LocaleController } from '../../../core/locale-controller';
import { controls, popoverSurface } from '../../../core/theme';
import { onCommit } from '../../../lib/dom/events';
import { eventStormingMessages } from '../messages';

/**
 * What a note card may ask its host for: the board's own intents
 * (`NoteIntent`, `ui-mode.ts`) plus `comment`, which is the chrome's trigger
 * rather than a change to board state — it opens the contextual composer over
 * this very note and leaves the mode and the selection exactly as they were.
 */
export type NoteCardIntent = NoteIntent | { readonly kind: 'comment' };

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
  /*
   * The host is the note's box and its ink. It is never rotated, scaled or
   * filtered: any transform here promotes the note to a composited layer that
   * is rasterized and then resampled, and the sub-degree --es-tilt alone is
   * enough to make the whole name look out of focus. The hand-placed tilt
   * lives on .paper instead — the silhouette leans, the text stays
   * axis-aligned and crisp in every state.
   */
  :host {
    display: flex;
    flex-direction: column;
    /* Top-aligned: the name stays put when the editor takes its place. */
    justify-content: flex-start;
    position: relative;
    box-sizing: border-box;
    padding: 16px 9px 8px;
    border-radius: 3px;
    color: var(--es-note-ink, var(--dpk-ink));
    cursor: pointer;
    /* Whole-pixel lifts only: a fractional offset would soften the ink again. */
    transition: transform 180ms var(--dpk-ease);
    overflow: visible;
  }

  /* The paper: gradient, bevel, shadow and the dog-eared corner. It alone
     carries the tilt, so a note still looks hand-placed while its text stays
     sharp. It never takes a pointer, so clicks land on the note (and its
     editor) underneath. */
  .paper {
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: 3px;
    background:
      linear-gradient(165deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 40%),
      var(--es-note-bg, var(--dpk-paper-raised));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 1px 2px rgba(30, 24, 10, 0.14),
      0 5px 10px -4px rgba(30, 24, 10, 0.24);
    transform: rotate(var(--es-tilt, 0deg));
    transition:
      transform 180ms var(--dpk-ease),
      box-shadow 180ms var(--dpk-ease);
    pointer-events: none;
  }

  /* A dog-eared corner: a quiet cue that this is a paper note, not a flat chip. */
  .paper::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 13px;
    height: 13px;
    background: linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.16) 50%);
    border-bottom-left-radius: 3px;
    opacity: 0.6;
  }

  :host(:hover) {
    transform: translateY(-2px);
    z-index: 6;
  }

  :host(:hover) .paper {
    transform: rotate(0deg);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.32),
      0 2px 4px rgba(30, 24, 10, 0.16),
      0 12px 22px -6px rgba(30, 24, 10, 0.3);
  }

  /* Selected: no outline. The note is picked off the wall — straightened,
     lifted, and lit with a soft glow that reads as "chosen", not as a border. */
  :host([focused]) {
    transform: translateY(-2px);
    z-index: 5;
  }

  :host([focused]) .paper {
    transform: rotate(0deg);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.32),
      0 2px 4px rgba(30, 24, 10, 0.16),
      0 12px 22px -6px rgba(30, 24, 10, 0.3),
      0 0 15px 1px color-mix(in srgb, var(--dpk-blue) 42%, transparent);
  }

  /* Editing — which is the editor's own state, so it is true whether the board
     opened the edit (the data-mode it is given) or the reader clicked straight
     onto the name. No outline and no box: the note is lifted off the wall, its
     paper is straightened, and its type label gives way to a pencil. The side
     rail stays out so delete is still in reach while typing. */
  :host([data-editing]) {
    transform: translateY(-3px);
    z-index: 7;
  }

  :host([data-editing]) .paper {
    transform: rotate(0deg);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.34),
      0 3px 6px rgba(30, 24, 10, 0.2),
      0 18px 30px -8px rgba(30, 24, 10, 0.4);
  }

  /* The type label and the pencil share the top-left corner: one or the other. */
  :host([data-editing]) .note-type {
    display: none;
  }

  :host([data-editing]) .note-editing {
    display: block;
  }

  /* --------------------------------------------------- sticky note palette */

  /* Small, faint, top-left: readable when looked for, quiet when not. */
  .note-type {
    position: absolute;
    z-index: 2;
    top: 5px;
    left: 7px;
    font-family: var(--dpk-mono);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.12em;
    opacity: 0.5;
  }

  /* The editing cue that replaces the type label: a pencil in the same corner,
     plus the raised paper — an affordance that is not a box around the note. */
  .note-editing {
    position: absolute;
    z-index: 2;
    display: none;
    top: 5px;
    left: 7px;
    width: 11px;
    height: 11px;
    opacity: 0.7;
  }

  .note-editing svg {
    display: block;
    width: 11px;
    height: 11px;
  }

  /* Pinned hotspots are small: the type label is off and the name is centered. */
  :host([compact]) {
    justify-content: center;
    padding: 7px 9px 8px;
  }

  :host([compact]) .note-type,
  :host([compact]) .note-editing {
    display: none;
  }

  .note-name {
    position: relative;
    z-index: 1;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    font-size: 13px;
    font-weight: 680;
    line-height: 1.32;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
    /* As many lines as the fixed-size card holds; the rest ends in an ellipsis. */
    --dpk-inline-edit-lines: 4;
    /*
     * The card marks the edit on its own surface (the raised, straightened paper
     * and the pencil that replaces the type label), so the shared editor paints
     * no ring around the name: a blue box over sticky-note text is exactly the
     * "outline" this card does not have anywhere else.
     */
    --dpk-inline-edit-ring: none;
  }

  :host([compact]) .note-name {
    flex: 0 1 auto;
    font-size: 11.5px;
    line-height: 1.3;
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
    border: 1px solid color-mix(in srgb, var(--dpk-danger) 45%, transparent);
    border-radius: 999px;
    font-size: 9.5px;
    font-weight: 620;
    white-space: nowrap;
    color: var(--dpk-danger);
    background: color-mix(in srgb, var(--dpk-paper-raised) 94%, transparent);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 140ms var(--dpk-ease),
      transform 140ms var(--dpk-ease-spring),
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }

  /* The tools come out on hover, and while anything in the card has focus
     (the name being edited, or a tool reached with the keyboard): with no
     outline marking the editing note, its controls must not hide behind the
     pointer having to leave the text. */
  :host(:hover) .note-hotspot,
  :host(:focus-within) .note-hotspot,
  .note-hotspot:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .note-hotspot:hover {
    border-color: var(--dpk-danger);
    background: var(--dpk-danger-soft);
    transform: translateY(-1px);
  }

  :host(:hover) .note-tools,
  :host(:focus-within) .note-tools,
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
    backdrop-filter: blur(4px);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }
`;

/**
 * `<dpk-internal-event-storming-note>` — one sticky note on the wall.
 *
 * The board positions and sizes the host; the note only paints itself and
 * reports `NoteCardIntent`s. Which note is being edited is the host element's
 * decision (`EsUiMode`); the card renders the mode it is given and never
 * dispatches actions itself. The hover rail's comment button asks the chrome
 * for the composer over this note (see `NoteCardIntent`); right-clicking the
 * note reaches the very same composer from the chrome's menu
 * (ADR 20261023_diagram-as-board).
 */
export class DpkInternalEventStormingNote extends LitElement {
  static override styles = [controls, cardStyles, popoverSurface];

  static override properties = {
    note: { attribute: false },
    mode: { type: String, reflect: true, attribute: 'data-mode' },
    focused: { type: Boolean, reflect: true },
    /** A pin-sized card: keeps the type label off it. */
    compact: { type: Boolean, reflect: true },
    onIntent: { attribute: false },
  };

  declare note: StickyNote | null;
  declare mode: NoteCardMode;
  declare focused: boolean;
  declare compact: boolean;
  declare onIntent: ((intent: NoteCardIntent) => void) | null;

  readonly #i18n = new LocaleController(this);
  /**
   * The card's own "being edited" chrome keys on the name editor's real state,
   * never on focus: a click straight onto the name starts an edit the board
   * never hears about, and a committed name leaves the field focused. The
   * editor reflects that state on itself (`data-editing`), so the card watches
   * its one child and mirrors it onto its own attribute for the styles.
   */
  readonly #editor = new MutationObserver(() => this.#mirrorEditorState());

  constructor() {
    super();
    this.note = null;
    this.mode = 'view';
    this.focused = false;
    this.compact = false;
    this.onIntent = null;
    this.addEventListener('click', () => this.#report({ kind: 'select' }));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#watchEditor();
    this.#mirrorEditorState();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#editor.disconnect();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('note') && this.note) {
      this.setAttribute('data-type', this.note.type);
      // The description is not painted on the card: it is only a tooltip.
      if (this.note.description === undefined) this.removeAttribute('title');
      else this.setAttribute('title', this.note.description);
    }
    if (changed.has('mode') && this.mode === 'editing') {
      this.renderRoot.querySelector<DpkInlineEdit>('dpk-inline-edit')?.startEditing();
    }
    this.#watchEditor();
    this.#mirrorEditorState();
  }

  /** Re-attached on connect and after every render: the editor is our one child. */
  #watchEditor(): void {
    const editor = this.renderRoot.querySelector<DpkInlineEdit>('dpk-inline-edit');
    if (editor) this.#editor.observe(editor, { attributes: true, attributeFilter: ['data-editing'] });
  }

  /** `data-editing` on the card is the editor's state, not the board's or focus's. */
  #mirrorEditorState(): void {
    const editing = this.renderRoot.querySelector('dpk-inline-edit')?.hasAttribute('data-editing') ?? false;
    this.toggleAttribute('data-editing', editing);
  }

  protected override render(): TemplateResult | typeof nothing {
    const note = this.note;
    if (!note) return nothing;
    const m = eventStormingMessages(this.#i18n.locale);
    return html`
      <div class="paper" aria-hidden="true"></div>
      <div class="note-type">${m.noteTypeLabel(note.type)}</div>
      <div class="note-editing" aria-hidden="true">${iconPencil()}</div>
      <dpk-inline-edit
        class="note-name"
        ?wrap=${true}
        ?truncate=${!this.compact}
        ?seamless=${true}
        .value=${note.name}
        .label=${m.noteNameLabel}
        @dpk-commit=${onCommit((name) => this.#report({ kind: 'rename', name }))}
      ></dpk-inline-edit>
      ${
        note.type === 'hotspot'
          ? nothing
          : html`<button
              class="note-hotspot"
              type="button"
              data-role="hotspot"
              title=${m.pinHotspotTitle}
              @click=${this.#tool(() => ({ kind: 'add-hotspot' }))}
            >
              ${m.addHotspot}
            </button>`
      }
      <div class="note-tools">
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="comment"
          aria-label=${m.commentNote}
          @click=${this.#tool(() => ({ kind: 'comment' }))}
        >
          ${iconComment()}
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="delete"
          aria-label=${m.deleteNote}
          @click=${this.#tool(() => ({ kind: 'delete' }))}
        >
          ${iconTrash()}
        </button>
      </div>
    `;
  }

  /** Tool buttons must not also select the note. */
  #tool(make: (event: Event) => NoteCardIntent): (event: Event) => void {
    return (event) => {
      event.stopPropagation();
      this.#report(make(event));
    };
  }

  #report(intent: NoteCardIntent): void {
    this.onIntent?.(intent);
  }
}

export const defineEsNoteCard = (): void => {
  if (!customElements.get('dpk-internal-event-storming-note'))
    customElements.define('dpk-internal-event-storming-note', DpkInternalEventStormingNote);
};
