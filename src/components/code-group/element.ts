/**
 * `<dpk-code-group>` — several code variants under one frame, with tabs.
 *
 * The data is one object (`data` property) or a `script[type="application/json"]`
 * child: `label` names the block, and `variants` are the tabs (`label`,
 * `language`, `code`). One copy button copies the active variant. The frame and
 * token colors are the same styles `dpk-code` uses.
 */
import {
  LitElement,
  css,
  html,
  nothing,
  type CSSResultGroup,
  type PropertyDeclarations,
  type TemplateResult,
} from 'lit';

import { iconCheck, iconCopy } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { tokens } from '../../core/theme';
import { observeJsonChild, readJsonChild } from '../../lib/dom/base-data';
import { copyText } from '../../lib/dom/clipboard';
import { trimBlock } from '../code/element';
import { highlight } from '../code/highlight';
import { codeMessages } from '../code/messages';
import { codeStyles } from '../code/styles';
import { codeGroupMessages } from './messages';
import { parseCodeGroupData, type CodeGroupData, type CodeGroupVariant } from './model';

type CopyState = 'idle' | 'copied' | 'failed';

const groupStyles = css`
  :host {
    min-width: 0;
  }

  .bar {
    padding-left: 10px;
  }

  .name {
    flex: 0 1 auto;
    max-width: 45%;
  }

  .tabs {
    display: flex;
    flex: 1;
    gap: 1px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tabs button {
    height: 26px;
    padding: 0 8px;
    border-radius: 6px 6px 0 0;
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }

  .tabs button:hover {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  .tabs button[aria-selected='true'] {
    background: var(--dpk-paper-raised);
    box-shadow: inset 0 -2px 0 var(--dpk-accent);
    color: var(--dpk-ink);
  }

  .tabs button:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  pre[hidden] {
    display: none;
  }

  .empty {
    margin: 0;
    padding: 12px 14px;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-font-mono);
    font-size: 12px;
  }

  @media (max-width: 520px) {
    .name {
      display: none;
    }
  }
`;

export class DpkCodeGroup extends LitElement {
  static override styles: CSSResultGroup = [tokens, codeStyles, groupStyles];

  static override properties: PropertyDeclarations = {
    data: { attribute: false },
  };

  declare data: CodeGroupData | null;

  readonly #i18n = new LocaleController(this);
  #group: CodeGroupData | null = null;
  #error: string | null = null;
  #active = 0;
  #copy: CopyState = 'idle';
  #reset: ReturnType<typeof setTimeout> | undefined;
  #stopJsonChild: (() => void) | null = null;

  constructor() {
    super();
    this.data = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#stopJsonChild = observeJsonChild(this, parseCodeGroupData, (result) => {
      this.#active = 0;
      if (result.ok) {
        this.data = result.value;
      } else {
        this.#group = null;
        this.#error = result.error;
        this.requestUpdate();
      }
    });
    // A parser-created element connects before its children exist; the observer catches a
    // later insert, and this catches the children the parser adds right after connecting.
    queueMicrotask(() => {
      if (this.#group !== null || this.#error !== null) return;
      const result = readJsonChild(this, parseCodeGroupData);
      if (result === null) return;
      this.#stopJsonChild?.();
      this.#stopJsonChild = null;
      this.#active = 0;
      if (result.ok) {
        this.data = result.value;
      } else {
        this.#group = null;
        this.#error = result.error;
        this.requestUpdate();
      }
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopJsonChild?.();
    this.#stopJsonChild = null;
    clearTimeout(this.#reset);
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (!changed.has('data')) return;
    if (this.data === null) {
      this.#group = null;
      return;
    }
    try {
      this.#group = parseCodeGroupData(this.data);
      this.#error = null;
      this.#active = 0;
    } catch (error) {
      this.#group = null;
      this.#error = error instanceof Error ? error.message : String(error);
    }
  }

  protected override render(): TemplateResult {
    const m = codeMessages(this.#i18n.locale);
    const gm = codeGroupMessages(this.#i18n.locale);
    const group = this.#group;
    if (this.#error !== null) return this.#frame(m.code, html`<p class="empty">${gm.invalid(this.#error)}</p>`);
    if (group === null || group.variants.length === 0) {
      return this.#frame(m.code, html`<p class="empty">${gm.empty}</p>`);
    }
    const active = Math.min(this.#active, group.variants.length - 1);
    const name = group.label === '' ? m.code : group.label;
    const label = this.#copy === 'copied' ? m.copied : this.#copy === 'failed' ? m.copyFailed : m.copy;
    return html`<div class="bar">
        ${group.label === '' ? nothing : html`<span class="name">${group.label}</span>`}
        <div class="tabs" role="tablist" aria-label=${name}>
          ${group.variants.map(
            (variant, index) => html`<button
              type="button"
              role="tab"
              id="code-group-tab-${index}"
              aria-controls="code-group-panel-${index}"
              aria-selected=${index === active}
              tabindex=${index === active ? 0 : -1}
              @click=${() => this.#select(index)}
              @keydown=${(event: KeyboardEvent) => this.#onKeydown(event, index)}
            >
              ${variant.label}
            </button>`,
          )}
        </div>
        <button
          type="button"
          data-state=${this.#copy}
          aria-label=${m.copyLabel(name)}
          @click=${() => this.#copyActive()}
        >
          ${this.#copy === 'copied' ? iconCheck() : iconCopy()}<span aria-live="polite">${label}</span>
        </button>
      </div>
      ${group.variants.map(
        (variant, index) => html`<pre
          role="tabpanel"
          id="code-group-panel-${index}"
          aria-labelledby="code-group-tab-${index}"
          ?hidden=${index !== active}
        ><code>${this.#highlighted(variant)}</code></pre>`,
      )}`;
  }

  #frame(name: string, content: TemplateResult): TemplateResult {
    return html`<div class="bar"><span class="name">${name}</span></div>
      ${content}`;
  }

  #select(index: number): void {
    if (this.#group === null) return;
    this.#active = Math.max(0, Math.min(index, this.#group.variants.length - 1));
    this.#copy = 'idle';
    this.requestUpdate();
  }

  #onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const count = this.#group?.variants.length ?? 0;
    if (count === 0) return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
    this.#select(next);
    const tabs = this.renderRoot.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs[next]?.focus();
  }

  #highlighted(variant: CodeGroupVariant): unknown[] {
    const language = variant.language === '' ? null : variant.language;
    return highlight(trimBlock(variant.code), language).map((token) =>
      token.kind === null ? token.text : html`<span class=${token.kind}>${token.text}</span>`,
    );
  }

  async #copyActive(): Promise<void> {
    const group = this.#group;
    if (group === null) return;
    const active = Math.min(this.#active, group.variants.length - 1);
    const variant = group.variants[active];
    if (variant === undefined) return;
    const ok = await copyText(trimBlock(variant.code));
    this.#copy = ok ? 'copied' : 'failed';
    this.requestUpdate();
    clearTimeout(this.#reset);
    this.#reset = setTimeout(() => {
      this.#copy = 'idle';
      this.requestUpdate();
    }, 1600);
  }
}
