import { LitElement, css, html, nothing, type CSSResultGroup, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import { iconCheck, iconChevronDown, iconClose } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { PopoverController } from '../../core/popover-controller';
import { tokens } from '../../core/theme';
import { observeJsonChild } from '../../lib/dom/base-data';
import { DismissController } from '../../lib/dom/dismiss';
import { comboboxMessages, type ComboboxMessages } from './messages';
import {
  avatarTone,
  clampActiveIndex,
  filterOptions,
  groupOptions,
  initialsFor,
  isSelected,
  moveActiveIndex,
  normalizeValue,
  parseComboboxData,
  removeValue,
  sameValues,
  selectedLabel,
  selectedOptions,
  toggleSelection,
  type ComboboxOption,
} from './model';

let instances = 0;

const DISMISS_SELECTOR = '.combo-control, .combo-listbox';

/**
 * `<dpk-combobox>` — a labelled field that opens a grouped,
 * filterable list of options (reviewers, assignees, anything picked by name).
 *
 * Give the options as a JSON child, `{ "options": [...], "value": [...] }`
 * (`value` may also be a single string); each option is
 * `{ value, label, description?, group?, avatar? }`. `multiple` switches
 * between a single pick (shown as the input's text) and a multi-pick (shown
 * as removable chips); either way, picking fires `dpk-combobox-change` with
 * `{ value }` — a string in single-select, a string list in multi-select.
 * Typing filters by label and description; arrow keys move the active option,
 * Enter toggles it, Escape or an outside press closes the list.
 *
 * A plain input control: it has no element actions and nothing here is
 * recorded into a template's draft.
 */
export class DpkCombobox extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    css`
      :host {
        display: block;
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

      .combo-control {
        box-sizing: border-box;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px;
        min-height: var(--dpk-control-h);
        padding: 4px 6px 4px 10px;
        border: 1px solid var(--dpk-rule-strong);
        border-radius: var(--dpk-radius-sm);
        background: var(--dpk-paper-raised);
        box-shadow: inset 0 1px 2px var(--dpk-shade-1);
        cursor: text;
        transition:
          border-color 160ms var(--dpk-ease),
          box-shadow 160ms var(--dpk-ease);
      }

      .combo-control:focus-within {
        border-color: var(--dpk-blue);
        box-shadow: var(--dpk-focus);
      }

      .input {
        flex: 1 1 80px;
        min-width: 60px;
        margin: 2px 0;
        border: 0;
        background: transparent;
        color: var(--dpk-ink);
        font: inherit;
        font-size: 12.5px;
        outline: none;
      }

      .input::placeholder {
        color: var(--dpk-ink-faint);
      }

      .chevron {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border: 0;
        border-radius: var(--dpk-radius-xs);
        background: transparent;
        color: var(--dpk-ink-faint);
        cursor: pointer;
        transition: transform 160ms var(--dpk-ease);
      }

      .chevron:hover {
        color: var(--dpk-ink);
      }

      .chevron[data-open='true'] {
        transform: rotate(180deg);
      }

      .chevron svg {
        display: block;
        width: 14px;
        height: 14px;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 6px 2px 2px;
        border-radius: 999px;
        background: var(--dpk-paper-inset);
        color: var(--dpk-ink);
        font-size: 11.5px;
        line-height: 1.4;
      }

      .chip .avatar {
        width: 16px;
        height: 16px;
        font-size: 8px;
      }

      .chip-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--dpk-ink-faint);
        cursor: pointer;
      }

      .chip-remove:hover {
        color: var(--dpk-danger);
      }

      .chip-remove svg {
        display: block;
        width: 10px;
        height: 10px;
      }

      .avatar {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        font-family: var(--dpk-mono);
        font-size: 9.5px;
        font-weight: 650;
      }

      .avatar[data-tone='blue'] {
        background: var(--dpk-blue-soft);
        color: var(--dpk-blue);
      }

      .avatar[data-tone='green'] {
        background: var(--dpk-green-soft);
        color: var(--dpk-green);
      }

      .avatar[data-tone='amber'] {
        background: var(--dpk-amber-soft);
        color: var(--dpk-amber);
      }

      .avatar[data-tone='violet'] {
        background: var(--dpk-violet-soft);
        color: var(--dpk-violet);
      }

      .avatar[data-tone='accent'] {
        background: var(--dpk-accent-soft);
        color: var(--dpk-accent);
      }

      .avatar[data-tone='danger'] {
        background: var(--dpk-danger-soft);
        color: var(--dpk-danger);
      }

      .combo-listbox {
        box-sizing: border-box;
        position: fixed;
        inset: auto;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--dpk-rule-strong);
        border-radius: var(--dpk-radius-lg);
        background: var(--dpk-paper-raised);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
        color: var(--dpk-ink);
        font-size: 12.5px;
        animation: dpk-combobox-pop-in 140ms var(--dpk-ease);
      }

      @keyframes dpk-combobox-pop-in {
        from {
          opacity: 0;
          transform: translateY(4px) scale(0.98);
        }
      }

      .options {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 6px 0;
      }

      .group-heading {
        padding: 9px 12px 4px;
        font-family: var(--dpk-mono);
        font-size: 10px;
        font-weight: 650;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--dpk-ink-faint);
      }

      .option {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        cursor: pointer;
      }

      .option:hover,
      .option[data-active='true'] {
        background: var(--dpk-paper-sunken);
      }

      .option-text {
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
        flex: 1 1 auto;
      }

      .option-name {
        flex: none;
        max-width: 60%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--dpk-ink);
      }

      .option-desc {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--dpk-ink-soft);
        font-size: 11.5px;
      }

      .option-check {
        flex: none;
        display: flex;
        color: var(--dpk-blue);
      }

      .option-check svg {
        display: block;
        width: 14px;
        height: 14px;
      }

      .empty {
        padding: 18px 12px;
        color: var(--dpk-ink-soft);
        font-size: 12px;
        text-align: center;
      }

      .footer {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 7px 12px;
        border-top: 1px solid var(--dpk-rule);
      }

      .count {
        color: var(--dpk-ink-soft);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }

      .hints {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--dpk-ink-faint);
        font-size: 10.5px;
      }

      .hint {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.5em;
        height: 1.5em;
        padding: 0 4px;
        border: 1px solid var(--dpk-rule-strong);
        border-bottom-width: 2px;
        border-radius: var(--dpk-radius-xs);
        background: var(--dpk-paper-raised);
        color: var(--dpk-ink-soft);
        font-family: var(--dpk-mono);
        font-size: 10px;
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
    multiple: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
  };

  declare label: string | null;
  declare placeholder: string | null;
  declare multiple: boolean;
  declare name: string | null;

  readonly #prefix = `dpk-combobox-${++instances}`;
  readonly #i18n = new LocaleController(this);
  readonly #popovers = new PopoverController(this);

  #stopJsonChild: (() => void) | null = null;
  #options: readonly ComboboxOption[] = [];
  #selected: readonly string[] = [];
  #error: string | null = null;
  #open = false;
  /** `null` outside of typing: the field then shows the selection or the placeholder instead. */
  #query: string | null = null;
  #activeIndex = -1;

  constructor() {
    super();
    this.label = null;
    this.placeholder = null;
    this.multiple = false;
    this.name = null;
    new DismissController(this, {
      open: () => this.#open,
      closesOn: (path) => !path.some((target) => target instanceof Element && target.matches(DISMISS_SELECTOR)),
      ownsEscape: () => this.#open,
      dismiss: () => this.#close(),
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#stopJsonChild = observeJsonChild(this, parseComboboxData, (result) => {
      if (result.ok) {
        this.#options = result.value.options;
        this.#error = null;
        if (result.value.value !== null) this.#selected = result.value.value;
      } else {
        this.#options = [];
        this.#error = result.error;
      }
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopJsonChild?.();
    this.#stopJsonChild = null;
  }

  /** A string in single-select, a string list in multi-select; either way accepted back when set. */
  get value(): string | readonly string[] {
    return this.multiple ? this.#selected : (this.#selected[0] ?? '');
  }

  set value(next: string | readonly string[] | null | undefined) {
    this.#selected = normalizeValue(next);
    this.requestUpdate();
  }

  protected override render(): unknown {
    const m = this.#m;
    if (this.#error !== null) return html`<p class="error">${this.#error}</p>`;
    const query = this.#query ?? '';
    const filtered = filterOptions(this.#options, query);
    const active = clampActiveIndex(this.#activeIndex, filtered.length);
    const chips = this.multiple ? selectedOptions(this.#options, this.#selected) : [];
    const singleLabel = this.multiple ? null : selectedLabel(this.#options, this.#selected);
    const showPlaceholder = this.multiple ? this.#selected.length === 0 : singleLabel === null;
    const inputValue = this.#query ?? (this.multiple ? '' : (singleLabel ?? ''));
    return html`
      <div class="field">
        ${this.label ? html`<label class="field-label" id=${this.#labelId}>${this.label}</label>` : nothing}
        <div class="combo-control">
          ${
            this.multiple
              ? repeat(
                  chips,
                  (option) => option.value,
                  (option) => this.#renderChip(option, m),
                )
              : nothing
          }
          <input
            class="input"
            type="text"
            role="combobox"
            autocomplete="off"
            spellcheck="false"
            aria-expanded=${this.#open ? 'true' : 'false'}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls=${this.#listboxId}
            aria-labelledby=${this.label ? this.#labelId : nothing}
            aria-activedescendant=${active >= 0 ? this.#optionId(filtered[active]?.value ?? '') : nothing}
            placeholder=${showPlaceholder ? (this.placeholder ?? '') : ''}
            .value=${inputValue}
            @focus=${this.#onFocus}
            @click=${this.#onFocus}
            @input=${this.#onInput}
            @keydown=${this.#onKeydown}
          />
          <button
            type="button"
            class="chevron"
            tabindex="-1"
            aria-hidden="true"
            data-open=${this.#open ? 'true' : 'false'}
            @mousedown=${(event: Event) => event.preventDefault()}
            @click=${this.#toggleOpen}
          >
            ${iconChevronDown()}
          </button>
        </div>
      </div>
      ${this.#open ? this.#renderListbox(filtered, active, m) : nothing}
    `;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncPopover();
  }

  get #m(): ComboboxMessages {
    return comboboxMessages(this.#i18n.locale);
  }

  get #labelId(): string {
    return `${this.#prefix}-label`;
  }

  get #listboxId(): string {
    return `${this.#prefix}-listbox`;
  }

  #optionId(value: string): string {
    return `${this.#prefix}-option-${encodeURIComponent(value)}`;
  }

  #renderListbox(filtered: readonly ComboboxOption[], active: number, m: ComboboxMessages): unknown {
    const groups = groupOptions(filtered);
    return html`
      <div
        class="combo-listbox"
        popover="manual"
        role="listbox"
        id=${this.#listboxId}
        aria-label=${this.label ?? m.listLabel}
        aria-multiselectable=${this.multiple ? 'true' : 'false'}
      >
        <div class="options">
          ${
            filtered.length === 0
              ? html`<p class="empty">${m.empty}</p>`
              : groups.map(
                  (group) => html`
                    ${group.group !== null ? html`<div class="group-heading">${group.group}</div>` : nothing}
                    ${repeat(
                      group.options,
                      (option) => option.value,
                      (option) => this.#renderOption(option, filtered.indexOf(option) === active),
                    )}
                  `,
                )
          }
        </div>
        <div class="footer">
          <span class="count">${m.selectedCount(this.#selected.length)}</span>
          <span class="hints">
            <span class="hint"><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> ${m.moveLabel}</span>
            <span class="hint"><kbd class="kbd">↵</kbd> ${m.toggleLabel}</span>
          </span>
        </div>
      </div>
    `;
  }

  #renderOption(option: ComboboxOption, isActive: boolean): unknown {
    const selected = isSelected(this.#selected, option.value);
    return html`
      <div
        class="option"
        id=${this.#optionId(option.value)}
        role="option"
        aria-selected=${selected ? 'true' : 'false'}
        data-active=${isActive ? 'true' : 'false'}
        @mousedown=${(event: Event) => event.preventDefault()}
        @click=${() => this.#pick(option.value)}
      >
        <span class="avatar" data-tone=${avatarTone(option.value)}>${option.avatar ?? initialsFor(option.label)}</span>
        <span class="option-text">
          <span class="option-name">${option.label}</span>
          ${option.description !== null ? html`<span class="option-desc">${option.description}</span>` : nothing}
        </span>
        ${selected ? html`<span class="option-check" aria-hidden="true">${iconCheck()}</span>` : nothing}
      </div>
    `;
  }

  #renderChip(option: ComboboxOption, m: ComboboxMessages): unknown {
    return html`
      <span class="chip">
        <span class="avatar" data-tone=${avatarTone(option.value)}>${option.avatar ?? initialsFor(option.label)}</span>
        <span class="chip-label">${option.label}</span>
        <button
          type="button"
          class="chip-remove"
          tabindex="-1"
          aria-label=${m.removeChip(option.label)}
          @mousedown=${(event: Event) => event.preventDefault()}
          @click=${(event: Event) => {
            event.stopPropagation();
            this.#setSelected(removeValue(this.#selected, option.value));
          }}
        >
          ${iconClose()}
        </button>
      </span>
    `;
  }

  #onFocus = (): void => {
    this.#open = true;
    this.#activeIndex = -1;
    this.requestUpdate();
  };

  #onInput = (event: Event): void => {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    this.#query = event.currentTarget.value;
    this.#open = true;
    this.#activeIndex = -1;
    this.requestUpdate();
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const filtered = filterOptions(this.#options, this.#query ?? '');
      const wasOpen = this.#open;
      this.#open = true;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      this.#activeIndex = wasOpen ? moveActiveIndex(this.#activeIndex, delta, filtered.length) : -1;
      if (!wasOpen) this.#activeIndex = clampActiveIndex(delta > 0 ? 0 : filtered.length - 1, filtered.length);
      this.requestUpdate();
      return;
    }
    if (event.key === 'Enter') {
      if (!this.#open) return;
      event.preventDefault();
      const filtered = filterOptions(this.#options, this.#query ?? '');
      const option = filtered[clampActiveIndex(this.#activeIndex, filtered.length)];
      if (option) this.#pick(option.value);
      return;
    }
    if (event.key === 'Backspace') {
      if ((this.#query ?? '') !== '' || !this.multiple || this.#selected.length === 0) return;
      event.preventDefault();
      this.#setSelected(this.#selected.slice(0, -1));
    }
  };

  #toggleOpen = (): void => {
    if (this.#open) this.#close();
    else {
      this.#open = true;
      this.#activeIndex = -1;
      this.requestUpdate();
    }
    this.renderRoot.querySelector('input')?.focus();
  };

  #pick(value: string): void {
    this.#setSelected(toggleSelection(this.#selected, value, this.multiple));
    if (this.multiple) {
      this.#query = '';
      this.#activeIndex = -1;
      this.requestUpdate();
    } else {
      this.#close();
    }
  }

  #setSelected(next: readonly string[]): void {
    if (sameValues(this.#selected, next)) return;
    this.#selected = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent('dpk-combobox-change', {
        detail: { value: this.multiple ? next : (next[0] ?? '') },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #close(): void {
    this.#open = false;
    this.#query = null;
    this.#activeIndex = -1;
    this.requestUpdate();
  }

  #syncPopover(): void {
    const surface = this.renderRoot.querySelector<HTMLElement>('.combo-listbox');
    const anchor = this.renderRoot.querySelector<HTMLElement>('.combo-control');
    if (!surface || !anchor) return;
    this.#popovers.open(surface, anchor, { width: anchor.offsetWidth, height: 320 }, { placement: 'bottom-start' });
  }
}
