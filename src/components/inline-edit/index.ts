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
 */
export class DpkComponentInlineEdit extends LitElement {
  static override styles = [
    tokens,
    prose,
    css`
      /* One atomic box in both states, so the text can be edited where it sits:
         while editing, the text stays (hidden) underneath and keeps sizing the
         box, and the field lies over it. Starting an edit moves nothing; the
         box grows only as the draft does. */
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

      .box {
        position: relative;
        display: block;
      }

      /* No vertical padding or border: the box is exactly the lines of text.
         The underline and ring are shadows, which never move the layout. */
      .view {
        display: block;
        padding: 0 4px;
        border-radius: var(--dpk-radius-xs);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
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

      /* Formatted text keeps its own line breaks: a break in the source is a <br>. */
      .view.dpk-prose {
        white-space: normal;
      }

      .view[data-empty='true'] {
        box-shadow: inset 0 -1px 0 var(--dpk-rule-strong);
        color: var(--dpk-ink-faint);
        font-style: italic;
      }

      .view[data-empty='true']:hover {
        box-shadow: inset 0 -1px 0 var(--dpk-blue);
      }

      .view[aria-hidden='true'] {
        visibility: hidden;
        transition: none;
      }

      .field {
        position: absolute;
        inset: 0;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        min-width: 0;
        margin: 0;
        padding: 0 4px;
        border: none;
        border-radius: var(--dpk-radius-xs);
        outline: none;
        background: var(--dpk-paper-raised);
        box-shadow:
          inset 0 0 0 1px var(--dpk-blue),
          var(--dpk-focus);
        font: inherit;
        line-height: inherit;
        letter-spacing: inherit;
        color: inherit;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        overflow: hidden;
        resize: none;
        animation: dpk-inline-edit-in 140ms var(--dpk-ease) backwards;
      }

      .field::placeholder {
        color: var(--dpk-ink-faint);
        font-style: italic;
        opacity: 1;
      }

      @keyframes dpk-inline-edit-in {
        from {
          opacity: 0;
        }
      }

      /* seamless: no field chrome at all — the text is edited where it sits. */
      :host([seamless]) .view,
      :host([seamless]) .field {
        padding: 0;
      }

      :host([seamless]) .field {
        border-radius: 0;
        background: transparent;
        box-shadow: none;
      }
    `,
  ];

  static override properties = {
    value: { type: String },
    placeholder: { type: String },
    multiline: { type: Boolean },
    /** A wrapping field whose value stays one line: Enter commits. */
    wrap: { type: Boolean, reflect: true },
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
    const field = this.renderRoot.querySelector<HTMLInputElement | HTMLTextAreaElement>('.field');
    const root = this.renderRoot;
    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    if (field && active !== field) {
      field.focus();
      field.select();
    }
  }

  protected override render(): TemplateResult {
    const m = inlineEditMessages(this.#i18n.locale);
    const hint = this.placeholder || m.unset;
    const { editing } = this;
    const text = editing ? this.#draft : this.value;
    // While editing, the same text element stays underneath, hidden, and keeps
    // sizing the box: the hint while empty, and a last empty line still takes a line.
    const shown = text === '' ? hint : editing && text.endsWith('\n') ? `${text}\u200b` : text;
    if (this.markdown && !editing && text !== '') {
      return html`<span class="box"
        ><div
          class="view dpk-prose"
          data-empty="false"
          role="button"
          tabindex="0"
          title=${m.clickToEdit}
          @click=${this.#start}
          @keydown=${this.#onKeydownView}
        >
          ${unsafeHTML(renderMarkdown(text))}
        </div></span
      >`;
    }
    return html`<span class="box"
      ><span
        class="view"
        data-empty=${String(text === '')}
        aria-hidden=${editing ? 'true' : nothing}
        role=${editing ? nothing : 'button'}
        tabindex=${editing ? nothing : '0'}
        title=${editing ? nothing : m.clickToEdit}
        @click=${this.#start}
        @keydown=${this.#onKeydownView}
        >${shown}</span
      >${editing ? this.#renderField(this.label || this.placeholder || m.edit, hint) : nothing}</span
    >`;
  }

  #renderField(name: string, hint: string): TemplateResult {
    return this.multiline || this.wrap
      ? html`<textarea
          class="field"
          rows="1"
          .value=${live(this.#draft)}
          placeholder=${hint}
          aria-label=${name}
          @input=${this.#onInput}
          @keydown=${this.#onKeydownField}
          @blur=${this.#onBlur}
        ></textarea>`
      : html`<input
          class="field"
          .value=${live(this.#draft)}
          placeholder=${hint}
          aria-label=${name}
          @input=${this.#onInput}
          @keydown=${this.#onKeydownField}
          @blur=${this.#onBlur}
        />`;
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

  #onInput = (event: Event): void => {
    const target = elementOf(event.target, HTMLInputElement) ?? elementOf(event.target, HTMLTextAreaElement);
    if (target === null) return;
    this.#draft = target.value;
    this.requestUpdate();
  };

  #onKeydownField = (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#draft = this.value;
      this.editing = false;
      return;
    }
    if (event.key === 'Enter' && (!this.multiline || this.wrap || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.#commit();
    }
  };

  #onBlur = (event: FocusEvent): void => {
    const field = event.currentTarget;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
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
  if (!customElements.get('dpk-component-inline-edit'))
    customElements.define('dpk-component-inline-edit', DpkComponentInlineEdit);
};
