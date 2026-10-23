import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { LocaleController } from '../../core/locale-controller';
import { prose, tokens } from '../../core/theme';
import { elementOf } from '../../lib/dom/element';
import { renderMarkdown } from '../../lib/markdown';
import { inlineEditMessages } from './messages';

/**
 * Small inline editor used by every template for "local edits".
 * It never mutates anything: it only emits `dpk-commit`, so the edit still
 * travels through the draft action pipeline.
 *
 * Design principle: the editable surface IS the displayed surface. Outside
 * `markdown`, the same `<textarea>` is on screen at rest and while editing —
 * only its `readonly` attribute (and the caret) change, never its box, font,
 * wrapping or position. A `.mirror`, an invisible twin of the same text laid
 * out with the exact same rules, sits underneath only so the browser (not
 * script) can size that box from real content; it is never a second,
 * differently-rendered view. `markdown` is the one case that cannot keep this
 * literally (rendered HTML vs. raw source are different content), so it swaps
 * a rendered view in for rest and the same mirrored textarea for editing.
 */
export class DpkInlineEdit extends LitElement {
  static override styles = [
    tokens,
    prose,
    css`
      :host {
        display: inline-block;
        max-width: 100%;
        vertical-align: baseline;
        /* Inherit the surrounding type scale instead of forcing the chrome size:
           an inline edit inside a 17px heading must look like a 17px heading.
           Color comes along too, so an edit on a colored card stays legible. */
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        color: inherit;
      }

      :host([truncate]) {
        vertical-align: top;
      }

      .box {
        position: relative;
        display: block;
      }

      /* The mirror is never seen: visibility: hidden keeps it out of paint but
         still in flow, so the browser sizes .box from its real text layout —
         the same layout rules the field below uses, kept in lockstep by
         sharing every selector in this file. It never clips differently than
         the field, which is what used to make a click snap the box open. */
      .mirror {
        display: block;
        visibility: hidden;
        pointer-events: none;
      }

      .mirror,
      .field {
        margin: 0;
        padding: 0 4px;
        box-sizing: border-box;
        min-width: 0;
        border-radius: var(--dpk-radius-xs);
        font: inherit;
        line-height: inherit;
        letter-spacing: inherit;
        color: inherit;
        white-space: pre;
        overflow-wrap: anywhere;
      }

      :host([wrap]) .mirror,
      :host([wrap]) .field,
      :host([multiline]) .mirror,
      :host([multiline]) .field {
        white-space: pre-wrap;
      }

      /* The field always sits over the mirror at the field's natural size —
         never the other way around — so the box never depends on the field's
         own (absent) intrinsic size, only on the mirror's real text layout. */
      .field {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        resize: none;
        cursor: text;
        background: transparent;
        box-shadow: none;
        transition:
          background 140ms var(--dpk-ease),
          box-shadow 140ms var(--dpk-ease);
      }

      .field::placeholder {
        color: var(--dpk-ink-faint);
        font-style: italic;
        opacity: 1;
      }

      /* Resting: a plain, readonly textbox with a click/hover affordance. */
      .field[readonly] {
        background: transparent;
      }

      .field[readonly]:hover {
        background: var(--dpk-blue-soft);
        box-shadow:
          inset 0 -1px 0 var(--dpk-blue),
          inset 0 0 0 1px color-mix(in srgb, var(--dpk-blue) 22%, transparent);
      }

      .field[readonly]:placeholder-shown {
        box-shadow: inset 0 -1px 0 var(--dpk-rule-strong);
      }

      .field[readonly]:placeholder-shown:hover {
        box-shadow: inset 0 -1px 0 var(--dpk-blue);
      }

      .field::placeholder,
      .field[readonly]:placeholder-shown {
        color: var(--dpk-ink-faint);
        font-style: italic;
      }

      /* Editing: a subtle inset ring stands in for a focus ring (no native
         outline), so the box still reads as "being edited", not "a focused
         form control" — a deliberate a11y trade-off for seamless editing. */
      .field:not([readonly]) {
        background: var(--dpk-paper-raised);
        box-shadow: inset 0 0 0 1px var(--dpk-blue);
        animation: dpk-inline-edit-in 140ms var(--dpk-ease) backwards;
      }

      @keyframes dpk-inline-edit-in {
        from {
          opacity: 0;
        }
      }

      /* truncate, alone: the box's width is whatever the surrounding layout
         gives it (often shrunk by a flex ancestor) — never the mirror's full
         width — and only the field clips with an ellipsis. Clicking to edit
         changes nothing about the box; focusing it lets the browser scroll
         the caret into view the same way any truncated text input does. */
      :host([truncate]:not([wrap]):not([multiline])) .field {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* truncate with wrap or multiline: there is no native ellipsis for
         several wrapped lines, so the rest state is redefined as a clamp —
         a fixed number of lines, faded at the edge — instead of a line that
         pops open on hover. Editing lifts the clamp and the box grows straight
         down from the same top edge: the first line never moves. */
      :host([truncate][wrap]) .mirror,
      :host([truncate][wrap]) .field,
      :host([truncate][multiline]) .mirror,
      :host([truncate][multiline]) .field {
        overflow: hidden;
        max-height: calc(var(--dpk-inline-edit-lines, 3) * 1.6em);
      }

      @supports (height: 1lh) {
        :host([truncate][wrap]) .mirror,
        :host([truncate][wrap]) .field,
        :host([truncate][multiline]) .mirror,
        :host([truncate][multiline]) .field {
          max-height: calc(var(--dpk-inline-edit-lines, 3) * 1lh);
        }
      }

      :host([truncate][wrap]) .field[readonly],
      :host([truncate][multiline]) .field[readonly] {
        mask-image: linear-gradient(to bottom, black calc(100% - 1.4em), transparent 100%);
        -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 1.4em), transparent 100%);
      }

      /* Once editing removes readonly, the clamp lifts on both layers at once
         (the box grows; nothing jumps) — :has() keeps this a pure CSS rule
         instead of a second class the script would have to keep in sync. */
      .box:has(.field:not([readonly])) .mirror,
      .box:has(.field:not([readonly])) .field {
        max-height: none;
        mask-image: none;
        -webkit-mask-image: none;
      }

      /* seamless: no field chrome at all — the text sits exactly where a
         plain run of text would, in both states. .view is included so the
         markdown-at-rest case lines up with the field's own zero padding;
         otherwise the two states would read at different left edges. */
      :host([seamless]) .mirror,
      :host([seamless]) .field,
      :host([seamless]) .view {
        padding: 0;
      }

      :host([seamless]) .field[readonly] {
        border-radius: 0;
        background: transparent;
        box-shadow: none;
      }

      :host([seamless]) .field[readonly]:hover {
        background: transparent;
      }

      /* seamless, editing: still no border or padding (the text must not
         move), but a paint-only outline keeps "this is being edited" visible
         — an outline sits outside the box and never affects layout. */
      :host([seamless]) .field:not([readonly]) {
        border-radius: var(--dpk-radius-xs);
        background: transparent;
        box-shadow: none;
        outline: 1px solid var(--dpk-blue);
        outline-offset: 1px;
      }

      /* markdown, at rest: rendered HTML, since there is no plain text box
         that could show bold or a list. The field (raw source) replaces it
         entirely once editing starts, rather than existing underneath it —
         same font and block layout are kept as close as the two can get, but
         the trade-off (a rendered line is not a source line) is real. */
      .view {
        display: block;
        padding: 0 4px;
        border-radius: var(--dpk-radius-xs);
        cursor: text;
        transition:
          background 140ms var(--dpk-ease),
          box-shadow 140ms var(--dpk-ease);
      }

      .view:hover {
        background: var(--dpk-blue-soft);
        box-shadow:
          inset 0 -1px 0 var(--dpk-blue),
          inset 0 0 0 1px color-mix(in srgb, var(--dpk-blue) 22%, transparent);
      }

      :host([truncate]) .view {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--dpk-inline-edit-lines, 3);
        overflow: hidden;
      }

      :host([truncate]:not([wrap]):not([multiline])) .view {
        -webkit-line-clamp: 1;
      }
    `,
  ];

  static override properties = {
    value: { type: String },
    placeholder: { type: String },
    multiline: { type: Boolean },
    /** A wrapping field whose value stays one line: Enter commits. */
    wrap: { type: Boolean, reflect: true },
    /**
     * At rest, clamps to one line (or, with `wrap`/`multiline`, as many as
     * `--dpk-inline-edit-lines`, 3 unless set); editing lifts the clamp and
     * the box grows in place to show the rest.
     */
    truncate: { type: Boolean, reflect: true },
    /** Chromeless: the field looks like the text it edits. */
    seamless: { type: Boolean, reflect: true },
    /** Shows the value as Markdown while not editing; the field edits the source. */
    markdown: { type: Boolean },
    label: { type: String },
    editing: { state: true },
  };

  declare value: string;
  declare placeholder: string;
  declare multiline: boolean;
  declare wrap: boolean;
  declare truncate: boolean;
  declare seamless: boolean;
  declare markdown: boolean;
  declare label: string;
  declare private editing: boolean;

  #draft = '';
  #connectionVersion = 0;
  readonly #i18n = new LocaleController(this);

  override connectedCallback(): void {
    super.connectedCallback();
    this.#connectionVersion += 1;
  }

  constructor() {
    super();
    this.value = '';
    this.placeholder = '';
    this.multiline = false;
    this.wrap = false;
    this.truncate = false;
    this.seamless = false;
    this.markdown = false;
    this.label = '';
    this.editing = false;
    this.#draft = '';
  }

  /**
   * Enter edit mode as if the reader had clicked the text. Lets a template's own
   * "edit" affordance put the caret straight into the field.
   */
  startEditing(): void {
    this.#draft = this.value;
    this.editing = true;
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('value') && !this.editing) this.#draft = this.value;
  }

  protected override updated(): void {
    if (!this.editing) return;
    const field = this.renderRoot.querySelector<HTMLTextAreaElement>('.field');
    const root = this.renderRoot;
    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    if (field && active !== field) {
      field.focus();
      // Caret at the end, nothing selected: the first keystroke appends instead of
      // wiping the value. A native click that lands inside the text may still have
      // put the caret there itself; this only settles the common "click to start
      // editing" case, so it never leaves everything selected.
      const end = field.value.length;
      field.setSelectionRange(end, end);
    }
  }

  protected override render(): TemplateResult {
    const m = inlineEditMessages(this.#i18n.locale);
    const hint = this.placeholder || m.unset;
    const { editing } = this;
    const text = editing ? this.#draft : this.value;
    const name = this.label || this.placeholder || m.edit;
    if (this.markdown && !editing && text !== '') {
      return html`<span class="box"
        ><div
          class="view dpk-prose"
          role="button"
          tabindex="0"
          title=${m.clickToEdit}
          @click=${this.#start}
          @keydown=${this.#onKeydownView}
        >
          ${unsafeHTML(renderMarkdown(text).trim())}
        </div></span
      >`;
    }
    // While editing, the same text stays on the mirror underneath and keeps
    // sizing the box: the hint while empty, and a last empty line still takes a
    // line (a trailing \n alone collapses in most engines' line box math).
    const mirrorText = text === '' ? hint : text.endsWith('\n') ? `${text}​` : text;
    return html`<span class="box"
      ><span class="mirror" aria-hidden="true">${mirrorText}</span
      ><textarea
        class="field"
        ?readonly=${!editing}
        rows="1"
        wrap=${this.multiline || this.wrap ? 'soft' : 'off'}
        .value=${live(text)}
        placeholder=${hint}
        aria-label=${name}
        title=${editing ? nothing : m.clickToEdit}
        @mousedown=${this.#onFieldMousedown}
        @click=${this.#onFieldClick}
        @input=${this.#onInput}
        @keydown=${this.#onKeydownField}
        @blur=${this.#onBlur}
      ></textarea>
    </span>`;
  }

  #start = (event: Event): void => {
    // A link in formatted text goes where it points; the rest of the text edits.
    if (event.composedPath().some((node) => node instanceof HTMLAnchorElement)) return;
    event.stopPropagation();
    if (this.editing) return;
    this.#draft = this.value;
    this.editing = true;
  };

  #onKeydownView = (event: KeyboardEvent): void => {
    if (event.isComposing || this.editing || event.target instanceof HTMLAnchorElement) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.editing = true;
    }
  };

  #onFieldMousedown = (event: MouseEvent): void => {
    // Readonly still lets the browser place a native caret/selection on
    // mousedown; suppressed only at rest, so the click-to-end-of-text logic
    // below decides the caret instead. While editing, a normal click should
    // place the caret exactly where the pointer landed, as any textarea does.
    if (!this.editing) event.preventDefault();
  };

  #onFieldClick = (event: Event): void => {
    event.stopPropagation();
    if (this.editing) return;
    this.#draft = this.value;
    this.editing = true;
  };

  #onInput = (event: Event): void => {
    const target = elementOf(event.target, HTMLTextAreaElement);
    if (target === null) return;
    this.#draft = target.value;
    this.requestUpdate();
  };

  #onKeydownField = (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    if (!this.editing) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.#draft = this.value;
        this.editing = true;
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#draft = this.value;
      this.editing = false;
      return;
    }
    if (event.key === 'Enter') {
      // Shift+Enter inserts a line break when multiline allows one; plain
      // Enter always commits, the same as blur does.
      if (event.shiftKey && this.multiline) return;
      event.preventDefault();
      if (event.shiftKey) return;
      this.#commit();
    }
  };

  #onBlur = (event: FocusEvent): void => {
    const field = elementOf(event.currentTarget, HTMLTextAreaElement);
    if (field === null) return;
    const version = this.#connectionVersion;
    const { selectionStart, selectionEnd } = field;
    // insertBefore (used by keyed lists) blurs a focused descendant before its
    // disconnect/reconnect callbacks. Distinguish that move from a user blur.
    queueMicrotask(() => {
      if (!this.isConnected || !this.editing) return;
      if (version !== this.#connectionVersion) {
        field.focus();
        field.setSelectionRange(selectionStart, selectionEnd);
      } else this.#commit();
    });
  };

  #commit = (): void => {
    if (!this.editing) return;
    this.editing = false;
    // A wrap field never keeps a line break: the value stays one line.
    const raw = this.wrap ? this.#draft.replace(/\r?\n/g, ' ') : this.#draft;
    const next = raw.trim();
    if (next === this.value) return;
    this.dispatchEvent(
      new CustomEvent('dpk-commit', {
        detail: { value: next },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

export const defineInlineEdit = (): void => {
  if (!customElements.get('dpk-inline-edit')) customElements.define('dpk-inline-edit', DpkInlineEdit);
};
