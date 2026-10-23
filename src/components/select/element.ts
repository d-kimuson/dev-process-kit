import { LitElement, css, html, type CSSResultGroup } from 'lit';

import { LocaleController } from '../../core/locale-controller';
import { SelectController } from '../../core/select/controller';
import { controls, tokens } from '../../core/theme';
import { observeJsonChild } from '../../lib/dom/base-data';
import { selectMessages } from './messages';
import { parseSelectData, type SelectOption } from './model';

/**
 * `<dpk-select>` — a labelled trigger button that opens a listbox popover: a
 * non-native replacement for `<select>` with the same single-pick shape.
 *
 * Give the options as a JSON child, `{ "options": [...], "value": "..." }`;
 * each option is `{ value, label }`. Picking one fires `dpk-select-change`
 * (bubbles, composed) with `{ value }`, and `value` reflects it back as a
 * property. Without a visible `label`, set `aria-label` on the element itself
 * for its accessible name.
 *
 * Form-associated: it submits `name`/`value` like a native `<select>` and
 * takes part in `required` validation, reset and bfcache/autofill restore.
 * `attachInternals()` is unavailable in some test DOMs, so every use of it is
 * feature-detected rather than assumed (see the architecture guideline on
 * browser capability assumptions); a real browser is where this is verified.
 *
 * A plain input control: it has no element actions and nothing here is
 * recorded into a template's draft.
 */
export class DpkSelect extends LitElement {
  static formAssociated = true;

  static override styles: CSSResultGroup = [
    tokens,
    controls,
    css`
      :host {
        display: inline-block;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .field-label {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--dpk-ink-soft);
      }

      :host([block]) .dpk-rich-select {
        width: 100%;
      }

      .error {
        color: var(--dpk-danger);
        font-size: 12px;
      }
    `,
  ];

  static override properties = {
    label: { type: String },
    placeholder: { type: String },
    name: { type: String, reflect: true },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    block: { type: Boolean, reflect: true },
  };

  declare label: string | null;
  declare placeholder: string | null;
  declare name: string | null;
  declare required: boolean;
  declare disabled: boolean;
  /** Stretches the trigger to the host's own width, like a block-level native `<select>`. */
  declare block: boolean;

  readonly #i18n = new LocaleController(this);
  readonly #select = new SelectController(this);
  readonly #internals: ElementInternals | null =
    typeof this.attachInternals === 'function' ? this.attachInternals() : null;

  #stopJsonChild: (() => void) | null = null;
  #jsonOptions: readonly SelectOption[] = [];
  /** Set through the reactive `.options` property; wins over the JSON child when not `null`. */
  #hostOptions: readonly SelectOption[] | null = null;
  #value = '';
  /** What `formResetCallback` restores: the value the JSON child first named, before any pick. */
  #defaultValue = '';
  #error: string | null = null;

  constructor() {
    super();
    this.label = null;
    this.placeholder = null;
    this.name = null;
    this.required = false;
    this.disabled = false;
    this.block = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#stopJsonChild = observeJsonChild(this, parseSelectData, (result) => {
      if (this.#hostOptions !== null) return; // a reactive `.options` property wins over the JSON child.
      if (result.ok) {
        this.#jsonOptions = result.value.options;
        this.#error = null;
        if (result.value.value !== null) {
          this.#value = result.value.value;
          this.#defaultValue = result.value.value;
        }
      } else {
        this.#jsonOptions = [];
        this.#error = result.error;
      }
      this.#syncFormValue();
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopJsonChild?.();
    this.#stopJsonChild = null;
  }

  protected override updated(): void {
    this.#syncValidity();
  }

  get value(): string {
    return this.#value;
  }

  set value(next: string | null | undefined) {
    const value = next ?? '';
    if (value === this.#value) return;
    this.#value = value;
    this.#syncFormValue();
    this.requestUpdate();
  }

  /** The current options: the JSON child, unless the reactive `.options` property is set. */
  get options(): readonly SelectOption[] {
    return this.#hostOptions ?? this.#jsonOptions;
  }

  /**
   * Drives the option list from a host's render function instead of a JSON
   * child — the JSON child's content can't be bound to `${...}` expressions
   * (Lit does not support bindings inside `<script>`), so a dynamic list
   * (e.g. a member picker that changes as members are added) is set here.
   * Setting it to `null`/`undefined` falls back to the JSON child again.
   */
  set options(next: readonly SelectOption[] | null | undefined) {
    this.#hostOptions = next ?? null;
    this.#error = null;
    this.requestUpdate();
  }

  /** The owning form, through `ElementInternals`; `null` outside one or where unsupported. */
  get form(): HTMLFormElement | null {
    return this.#internals?.form ?? null;
  }

  /** Resets to the value the JSON child named initially, as a native `<select>` would to its authored selection. */
  formResetCallback(): void {
    this.#value = this.#defaultValue;
    this.#syncFormValue();
    this.requestUpdate();
  }

  /** Bfcache/autofill restore: the browser hands back exactly what `setFormValue` last gave it. */
  formStateRestoreCallback(state: string | File | FormData | null, _mode: 'restore' | 'autocomplete'): void {
    if (typeof state !== 'string') return;
    this.#value = state;
    this.#syncFormValue();
    this.requestUpdate();
  }

  // jsdom's own `ElementInternals` is a stub (no `setFormValue`/`setValidity`), so each
  // method is feature-detected on its own, not just the internals object's presence.
  #syncFormValue(): void {
    this.#internals?.setFormValue?.(this.#value === '' ? null : this.#value);
  }

  #syncValidity(): void {
    if (this.required && this.#value === '') {
      const anchor = this.renderRoot.querySelector<HTMLElement>('.dpk-rich-select') ?? undefined;
      this.#internals?.setValidity?.({ valueMissing: true }, selectMessages(this.#i18n.locale).required, anchor);
    } else {
      this.#internals?.setValidity?.({});
    }
  }

  protected override render(): unknown {
    if (this.#error !== null) return html`<p class="error">${this.#error}</p>`;
    const ariaLabel = this.getAttribute('aria-label') ?? this.label ?? selectMessages(this.#i18n.locale).fallbackLabel;
    const control = this.#select.render({
      options: this.options,
      value: this.#value,
      onChange: (value) => this.#pick(value),
      ariaLabel,
      placeholder: this.placeholder ?? undefined,
      disabled: this.disabled,
    });
    if (this.label === null) return control;
    return html`
      <div class="field">
        <span class="field-label">${this.label}</span>
        ${control}
      </div>
    `;
  }

  #pick(value: string): void {
    if (value === this.#value) return;
    this.#value = value;
    this.#syncFormValue();
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('dpk-select-change', { detail: { value }, bubbles: true, composed: true }));
  }
}
