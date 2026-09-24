import { LitElement, css, html, type TemplateResult } from 'lit';

import { LocaleController } from '../../core/locale-controller';
import { controls, tokens } from '../../core/theme';
import { elementOf } from '../../lib/dom/element';
import { inlineEditMessages } from './messages';

/**
 * Small inline editor used by every template for "local edits".
 * It never mutates anything: it only emits `dpk-commit`, so the edit still
 * travels through the draft action pipeline.
 */
export class DpkComponentInlineEdit extends LitElement {
  static override styles = [
    tokens,
    controls,
    css`
      :host {
        display: inline;
        /* Inherit the surrounding type scale instead of forcing the chrome size:
           an inline edit inside a 17px heading must look like a 17px heading.
           Color comes along too, so an edit on a colored card stays legible. */
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        color: inherit;
      }

      .view {
        cursor: text;
        border-bottom: 1px dashed transparent;
        border-radius: 3px;
        padding: 1px 3px;
        transition:
          background 140ms ease,
          border-color 140ms ease;
      }

      .view:hover {
        border-bottom-color: var(--dpk-blue);
        background: var(--dpk-blue-soft);
      }

      .view[data-empty='true'] {
        color: var(--dpk-ink-faint);
        font-style: italic;
      }

      input,
      textarea {
        font: inherit;
        color: inherit;
        background: var(--dpk-paper-raised);
        border: 1px solid var(--dpk-blue);
        border-radius: var(--dpk-radius-sm);
        box-shadow: var(--dpk-focus);
        padding: 3px 7px;
        min-width: 0;
        width: 100%;
        transition: box-shadow 140ms ease;
      }

      textarea {
        min-height: var(--dpk-inline-textarea-min-height, 90px);
        resize: vertical;
        font-family: var(--dpk-body);
        line-height: 1.5;
      }

      /* wrap: the field wraps like the text it replaces, and Enter still
         commits, so a one-line value is edited without losing sight of it. */
      :host([wrap]) textarea {
        min-height: 0;
        resize: none;
        line-height: inherit;
      }

      /* seamless: no field chrome at all — the text is edited where it sits.
         The chrome theme paints fields with its own ink and size, so the
         seamless field re-states the inherited type and color. */
      :host([seamless]) input,
      :host([seamless]) textarea {
        padding: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        height: 100%;
        min-height: 0;
        overflow: auto;
        resize: none;
        font: inherit;
        font-size: inherit;
        line-height: inherit;
        color: inherit;
      }

      :host([seamless]) .view {
        padding: 0;
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
    label: { type: String },
    editing: { state: true },
  };

  declare value: string;
  declare placeholder: string;
  declare multiline: boolean;
  declare wrap: boolean;
  declare seamless: boolean;
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
    const field = this.renderRoot.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    const root = this.renderRoot;
    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    if (field && active !== field) {
      field.focus();
      field.select();
    }
  }

  protected override render(): TemplateResult {
    const m = inlineEditMessages(this.#i18n.locale);
    if (!this.editing) {
      const empty = this.value.length === 0;
      return html`<span
        class="view"
        data-empty=${String(empty)}
        role="button"
        tabindex="0"
        title=${m.clickToEdit}
        @click=${this.#start}
        @keydown=${this.#onKeydownView}
        >${empty ? this.placeholder || m.unset : this.value}</span
      >`;
    }
    const name = this.label || this.placeholder || m.edit;
    return html`
      ${
        this.multiline || this.wrap
          ? html`<textarea
              class="dpk-textarea"
              .value=${this.#draft}
              aria-label=${name}
              @input=${this.#onInput}
              @keydown=${this.#onKeydownField}
              @blur=${this.#onBlur}
            ></textarea>`
          : html`<input
              class="dpk-input"
              .value=${this.#draft}
              aria-label=${name}
              @input=${this.#onInput}
              @keydown=${this.#onKeydownField}
              @blur=${this.#onBlur}
            />`
      }
    `;
  }

  #start = (event: Event): void => {
    event.stopPropagation();
    this.editing = true;
  };

  #onKeydownView = (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.editing = true;
    }
  };

  #onInput = (event: Event): void => {
    const target = elementOf(event.target, HTMLInputElement) ?? elementOf(event.target, HTMLTextAreaElement);
    if (target !== null) this.#draft = target.value;
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
