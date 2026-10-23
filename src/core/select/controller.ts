/**
 * A non-native select: a trigger button and a listbox popover, as a
 * `ReactiveController` any Lit host can own. It carries its own open state,
 * active option and type-ahead buffer, and wires the popover and dismiss
 * behavior itself — a host only calls `render()` with the current options,
 * value and change callback on every render of its own.
 *
 * Shared by the public `dpk-select` element (`src/components/select`) and the
 * shell's own pickers (the header's language and version selects), which sit
 * in `core` and so cannot depend on `components` — the reason this logic
 * lives here instead of inside the element.
 */
import { html, nothing, type LitElement, type ReactiveController, type ReactiveControllerHost } from 'lit';

import { DismissController } from '../../lib/dom/dismiss';
import { iconCheck, iconChevronDown } from '../icons';
import { PopoverController } from '../popover-controller';
import { clampActiveIndex, indexOfValue, moveActiveIndex, typeAheadMatch, type SelectOption } from './model';

export type SelectRenderOptions = {
  readonly options: readonly SelectOption[];
  /** The picked value; an empty string (or one matching no option) shows `placeholder`. */
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly ariaLabel: string;
  readonly placeholder?: string | undefined;
  /** Extra class names on the trigger button, e.g. for a site's own hook or test id. */
  readonly className?: string | undefined;
  readonly disabled?: boolean | undefined;
  /** Fired on focus and on pointer hover, e.g. to lazily fetch a listing before the reader opens it. */
  readonly onActivate?: (() => void) | undefined;
};

let instances = 0;

const TYPEAHEAD_RESET_MS = 500;

export class SelectController implements ReactiveController {
  readonly #host: ReactiveControllerHost & LitElement;
  readonly #id = `dpk-select-${++instances}`;
  readonly #popovers: PopoverController;
  #open = false;
  #activeIndex = -1;
  #query = '';
  #queryTimer: ReturnType<typeof setTimeout> | undefined;
  /** The options passed to the last `render()`; read by handlers bound at render time. */
  #current: SelectRenderOptions | null = null;

  constructor(host: ReactiveControllerHost & LitElement) {
    this.#host = host;
    this.#popovers = new PopoverController(host);
    new DismissController(host, {
      open: () => this.#open,
      closesOn: (path) =>
        !path.some((target) => target instanceof Element && target.getAttribute('data-dpk-select') === this.#id),
      ownsEscape: () => this.#open,
      dismiss: () => this.#close(),
    });
    host.addController(this);
  }

  hostConnected(): void {}

  hostUpdated(): void {
    this.#syncPopover();
  }

  hostDisconnected(): void {
    clearTimeout(this.#queryTimer);
  }

  render(options: SelectRenderOptions): unknown {
    this.#current = options;
    const activeIndex = clampActiveIndex(this.#activeIndex, options.options.length);
    const selected = options.options.find((option) => option.value === options.value);
    const triggerLabel = selected?.label ?? options.placeholder ?? '';
    const activeOption = this.#open ? options.options[activeIndex] : undefined;
    return html`
      <button
        type="button"
        class="dpk-rich-select ${options.className ?? ''}"
        data-dpk-select=${this.#id}
        ?disabled=${options.disabled ?? false}
        aria-haspopup="listbox"
        aria-expanded=${this.#open ? 'true' : 'false'}
        aria-controls=${this.#listboxId}
        aria-label=${options.ariaLabel}
        aria-activedescendant=${activeOption ? this.#optionId(activeOption.value) : nothing}
        @click=${this.#toggle}
        @keydown=${(event: KeyboardEvent) => this.#onTriggerKeydown(event, options)}
        @focus=${() => options.onActivate?.()}
        @pointerenter=${() => options.onActivate?.()}
      >
        <span class="dpk-rich-select-label">${triggerLabel}</span>
        <span class="dpk-rich-select-chevron" aria-hidden="true" data-open=${this.#open ? 'true' : 'false'}>
          ${iconChevronDown()}
        </span>
      </button>
      ${this.#open ? this.#renderListbox(options, activeIndex) : nothing}
    `;
  }

  get #listboxId(): string {
    return `${this.#id}-listbox`;
  }

  #optionId(value: string): string {
    return `${this.#id}-option-${encodeURIComponent(value)}`;
  }

  #renderListbox(options: SelectRenderOptions, activeIndex: number): unknown {
    return html`
      <div
        class="dpk-rich-select-listbox"
        popover="manual"
        role="listbox"
        id=${this.#listboxId}
        data-dpk-select=${this.#id}
        aria-label=${options.ariaLabel}
      >
        ${options.options.map(
          (option, index) => html`
            <div
              class="dpk-rich-select-option"
              role="option"
              id=${this.#optionId(option.value)}
              data-value=${option.value}
              aria-selected=${option.value === options.value ? 'true' : 'false'}
              data-active=${index === activeIndex ? 'true' : 'false'}
              @mousedown=${(event: Event) => event.preventDefault()}
              @click=${() => this.#pick(option.value, options)}
            >
              <span class="dpk-rich-select-option-label">${option.label}</span>
              ${
                option.value === options.value
                  ? html`<span class="dpk-rich-select-check" aria-hidden="true">${iconCheck()}</span>`
                  : nothing
              }
            </div>
          `,
        )}
      </div>
    `;
  }

  #onTriggerKeydown(event: KeyboardEvent, options: SelectRenderOptions): void {
    if (options.disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      if (!this.#open) {
        this.#open = true;
        const current = indexOfValue(options.options, options.value);
        this.#activeIndex =
          current >= 0 ? current : clampActiveIndex(delta > 0 ? 0 : options.options.length - 1, options.options.length);
      } else {
        this.#activeIndex = moveActiveIndex(this.#activeIndex, delta, options.options.length);
      }
      this.#host.requestUpdate();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.#open) {
        this.#open = true;
        this.#activeIndex = indexOfValue(options.options, options.value);
        this.#host.requestUpdate();
        return;
      }
      const option = options.options[clampActiveIndex(this.#activeIndex, options.options.length)];
      if (option) this.#pick(option.value, options);
      return;
    }
    if (event.key === 'Tab' || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    event.preventDefault();
    this.#query += event.key;
    clearTimeout(this.#queryTimer);
    this.#queryTimer = setTimeout(() => {
      this.#query = '';
    }, TYPEAHEAD_RESET_MS);
    const from = this.#open ? this.#activeIndex : indexOfValue(options.options, options.value);
    const match = typeAheadMatch(options.options, this.#query, from);
    if (match === null) return;
    this.#activeIndex = match;
    if (!this.#open) {
      const value = options.options[match]?.value;
      if (value !== undefined) this.#pick(value, options);
      return;
    }
    this.#host.requestUpdate();
  }

  #toggle = (): void => {
    if (this.#current?.disabled) return;
    if (this.#open) {
      this.#close();
      return;
    }
    const current = this.#current;
    this.#open = true;
    this.#activeIndex = current ? indexOfValue(current.options, current.value) : -1;
    this.#host.requestUpdate();
  };

  #pick(value: string, options: SelectRenderOptions): void {
    this.#close();
    if (value !== options.value) options.onChange(value);
  }

  #close(): void {
    if (!this.#open) return;
    this.#open = false;
    this.#activeIndex = -1;
    this.#host.requestUpdate();
  }

  #syncPopover(): void {
    const selector = `[data-dpk-select="${this.#id}"]`;
    const anchor = this.#host.renderRoot.querySelector<HTMLElement>(`button.dpk-rich-select${selector}`);
    const surface = this.#host.renderRoot.querySelector<HTMLElement>(`.dpk-rich-select-listbox${selector}`);
    if (!anchor || !surface) return;
    this.#popovers.open(
      surface,
      anchor,
      { width: Math.max(anchor.offsetWidth, 160), height: 280 },
      { placement: 'bottom-start' },
    );
  }
}

/**
 * A host's own selects, one `SelectController` per key, created lazily and
 * kept for the host's lifetime — for a render function that owns more than
 * one select (a toolbar's few fields) or repeats one per row (a list's own
 * per-item picker), where each needs its stable open/active state across
 * renders but none of them is a field the host class can name ahead of time.
 */
export class SelectControllerRegistry {
  readonly #host: ReactiveControllerHost & LitElement;
  readonly #controllers = new Map<string, SelectController>();

  constructor(host: ReactiveControllerHost & LitElement) {
    this.#host = host;
  }

  get(key: string): SelectController {
    const existing = this.#controllers.get(key);
    if (existing) return existing;
    const created = new SelectController(this.#host);
    this.#controllers.set(key, created);
    return created;
  }
}
