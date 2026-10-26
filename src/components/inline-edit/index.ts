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

      /* Resting: a plain, readonly textbox. cursor: text (above) and the
         click-to-edit title are the only hover affordance — an earlier
         hover ring/tint was removed as jarring on a box that does nothing
         until clicked. */
      .field[readonly] {
        background: transparent;
      }

      .field[readonly]:placeholder-shown {
        box-shadow: inset 0 -1px 0 var(--dpk-rule-strong);
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

      /* The fade says "there is more below the clamp" — so it may only paint when
         the clamp really hides text. Painted unconditionally, a box that is only
         as tall as its (short) value sits entirely inside the gradient: the name
         is then drawn through a partial alpha ramp and reads as blurred,
         washed-out ink. The data-clipped attribute is that measurement (see
         #measureClipped). */
      :host([truncate][wrap][data-clipped]) .field[readonly],
      :host([truncate][multiline][data-clipped]) .field[readonly] {
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

      /* seamless, editing: still no border or padding (the text must not
         move), but a paint-only ring keeps "this is being edited" visible
         — an outline sits outside the box and never affects layout. A
         surface that marks the edit itself (a sticky note raises its paper
         and swaps its type label for a pencil) sets
         --dpk-inline-edit-ring: none and paints no box at all. */
      :host([seamless]) .field:not([readonly]) {
        border-radius: var(--dpk-radius-xs);
        background: transparent;
        box-shadow: none;
        outline: var(--dpk-inline-edit-ring, 1px solid var(--dpk-blue));
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
    /**
     * Reflected so a host can key its own chrome on the editor's real state
     * (a card may mark the edit on its surface instead of on a box here).
     */
    editing: { type: Boolean, reflect: true, attribute: 'data-editing' },
    /**
     * Derived, not authored: the rest state really hides part of the value
     * under the `truncate` clamp. Only then does the fade paint.
     */
    clipped: { type: Boolean, reflect: true, attribute: 'data-clipped' },
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
  declare clipped: boolean;

  #draft = '';
  #connectionVersion = 0;
  // Which caret behavior the *next* transition into editing should use: 'end'
  // (keyboard-initiated — Enter/Space/F2, or startEditing()) places the caret
  // after the text as before; 'click' (a real pointer click on the field
  // itself) leaves whatever caret/selection the browser's own mousedown
  // already placed, so a click lands where the pointer landed instead of
  // always jumping to the end.
  #caretIntent: 'end' | 'click' = 'end';
  readonly #i18n = new LocaleController(this);
  /**
   * Re-measures the clamp when the box changes size: a wider box holds more of
   * the text, so whether anything is hidden is a function of the width.
   */
  readonly #sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.#measureClipped());

  override connectedCallback(): void {
    super.connectedCallback();
    this.#connectionVersion += 1;
    this.#sizes?.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#sizes?.disconnect();
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
    this.clipped = false;
    this.#draft = '';
  }

  /**
   * Enter edit mode as if the reader had clicked the text. Lets a template's own
   * "edit" affordance put the caret straight into the field.
   */
  startEditing(): void {
    this.#caretIntent = 'end';
    this.#draft = this.value;
    this.editing = true;
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('value') && !this.editing) this.#draft = this.value;
  }

  protected override updated(): void {
    this.#measureClipped();
    if (!this.editing) return;
    const field = this.renderRoot.querySelector<HTMLTextAreaElement>('.field');
    if (!field) return;
    const root = this.renderRoot;
    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    const caretIntent = this.#caretIntent;
    this.#caretIntent = 'end'; // consumed; the next transition defaults back to end-of-text.
    if (active !== field) field.focus();
    if (caretIntent === 'end') {
      // Caret at the end, nothing selected: the first keystroke appends instead of
      // wiping the value. Only for keyboard-initiated edits — a click already placed
      // its own caret below, and must not be overridden here.
      const end = field.value.length;
      field.setSelectionRange(end, end);
    }
  }

  /**
   * Records whether the `truncate` clamp hides any of the value. The mirror is
   * the layer the browser sizes from real text layout (the field is absolutely
   * positioned over it), so its unclamped `scrollHeight` against its clamped
   * `clientHeight` is exactly "there is more". Without layout (tests) both are
   * zero, which reads as "nothing hidden" — the safe answer, since the fade is
   * only a hint.
   */
  #measureClipped(): void {
    if (!this.truncate || !(this.wrap || this.multiline)) {
      if (this.clipped) this.clipped = false;
      return;
    }
    const mirror = this.renderRoot.querySelector<HTMLElement>('.box > .mirror');
    const next = mirror !== null && mirror.scrollHeight > mirror.clientHeight + 1;
    if (next !== this.clipped) this.clipped = next;
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
    // The markdown view (rendered HTML) is a different element than the field
    // (raw source) it is replaced by, so a click position in the view has no
    // corresponding offset in the source text — end-of-text is the only
    // sensible caret here.
    this.#caretIntent = 'end';
    this.#draft = this.value;
    this.editing = true;
  };

  #onKeydownView = (event: KeyboardEvent): void => {
    if (event.isComposing || this.editing || event.target instanceof HTMLAnchorElement) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#caretIntent = 'end';
      this.editing = true;
    }
  };

  #onFieldClick = (event: Event): void => {
    event.stopPropagation();
    if (this.editing) return;
    // The field is the same element at rest and while editing, so the native
    // mousedown that led to this click already placed the real caret/selection
    // at the pointer position (readonly still allows that) — keep it instead
    // of jumping to the end.
    this.#caretIntent = 'click';
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
        this.#caretIntent = 'end';
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
