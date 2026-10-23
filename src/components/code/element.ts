import { LitElement, css, html, nothing, type CSSResultGroup } from 'lit';

import { iconCheck, iconCopy } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { tokens } from '../../core/theme';
import { copyText } from '../../lib/dom/clipboard';
import { highlight } from './highlight';
import { codeMessages, type CodeMessages } from './messages';

const SOURCE_SELECTOR = 'script[type="text/plain"]';

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * `<dpk-code>` — a code block with a file name and a copy button.
 *
 * The code is the text of a `<script type="text/plain">` child (so markup in
 * it stays literal), else the element's own text, else the `code` property.
 * `language` (`ts`, `html`, `css`, `json`, `sh`, and their aliases) colours
 * the code with a small scanner (see `./highlight`); any other language shows
 * it plain. The colours follow the theme and can be set per token with
 * `--dpk-code-<kind>` (comment / string / number / keyword / function / tag /
 * attr / property / punct).
 */
export class DpkCode extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    css`
      :host {
        display: block;
        overflow: hidden;
        border: 1px solid var(--dpk-rule-strong);
        border-radius: var(--dpk-radius);
        background: var(--dpk-paper-sunken);
      }

      .bar {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        padding: 0 6px 0 12px;
        border-bottom: 1px solid var(--dpk-rule);
        color: var(--dpk-ink-soft);
        font-family: var(--dpk-font-mono);
        font-size: 12px;
      }

      .name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .language {
        color: var(--dpk-ink-faint);
      }

      button {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 24px;
        padding: 0 8px;
        border: 0;
        border-radius: var(--dpk-radius-sm);
        background: transparent;
        color: inherit;
        font: inherit;
        cursor: pointer;
      }

      button:hover {
        background: var(--dpk-paper-inset);
        color: var(--dpk-ink);
      }

      button:focus-visible {
        outline: none;
        box-shadow: var(--dpk-focus);
      }

      button[data-state='copied'] {
        color: var(--dpk-green);
      }

      button[data-state='failed'] {
        color: var(--dpk-danger);
      }

      button svg {
        width: 13px;
        height: 13px;
      }

      pre {
        margin: 0;
        padding: 12px 14px;
        overflow: auto;
        max-height: var(--dpk-code-max-height, 480px);
        color: var(--dpk-ink);
        font-family: var(--dpk-font-mono);
        font-size: 12.5px;
        line-height: 1.6;
        tab-size: 2;
      }

      .comment {
        color: var(--dpk-code-comment, var(--dpk-ink-faint));
        font-style: italic;
      }

      .string {
        color: var(--dpk-code-string, var(--dpk-green));
      }

      .number {
        color: var(--dpk-code-number, var(--dpk-amber));
      }

      .keyword {
        color: var(--dpk-code-keyword, var(--dpk-violet));
      }

      .function {
        color: var(--dpk-code-function, var(--dpk-blue));
      }

      .tag {
        color: var(--dpk-code-tag, var(--dpk-accent-strong));
      }

      .attr {
        color: var(--dpk-code-attr, var(--dpk-blue));
      }

      .property {
        color: var(--dpk-code-property, var(--dpk-blue));
      }

      .punct {
        color: var(--dpk-code-punct, var(--dpk-ink-soft));
      }
    `,
  ];

  static override properties = {
    filename: { type: String },
    language: { type: String },
    code: { type: String },
  };

  declare filename: string | null;
  declare language: string | null;
  /** Used when the element has no text of its own. */
  declare code: string;

  readonly #i18n = new LocaleController(this);
  readonly #observer = new MutationObserver(() => {
    this.requestUpdate();
  });
  #copy: CopyState = 'idle';
  #reset: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.filename = null;
    this.language = null;
    this.code = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer.disconnect();
    clearTimeout(this.#reset);
  }

  /** The code as shown and copied. */
  get text(): string {
    const source = this.querySelector(SOURCE_SELECTOR)?.textContent ?? this.textContent ?? '';
    return trimBlock(source.trim() === '' ? this.code : source);
  }

  protected override render(): unknown {
    const m = this.#m;
    const name = this.filename ?? m.code;
    const label = this.#copy === 'copied' ? m.copied : this.#copy === 'failed' ? m.copyFailed : m.copy;
    return html`<div class="bar">
        <span class="name">${name}</span>
        ${this.language ? html`<span class="language">${this.language}</span>` : nothing}
        <button type="button" data-state=${this.#copy} aria-label=${m.copyLabel(name)} @click=${this.#onCopy}>
          ${this.#copy === 'copied' ? iconCheck() : iconCopy()}<span aria-live="polite">${label}</span>
        </button>
      </div>
      <pre><code>${this.#highlighted()}</code></pre>`;
  }

  #highlighted(): unknown[] {
    return highlight(this.text, this.language).map((token) =>
      token.kind === null ? token.text : html`<span class=${token.kind}>${token.text}</span>`,
    );
  }

  get #m(): CodeMessages {
    return codeMessages(this.#i18n.locale);
  }

  #onCopy = async (): Promise<void> => {
    const ok = await copyText(this.text);
    this.#copy = ok ? 'copied' : 'failed';
    this.requestUpdate();
    clearTimeout(this.#reset);
    this.#reset = setTimeout(() => {
      this.#copy = 'idle';
      this.requestUpdate();
    }, 1600);
  };
}

/** Drops the blank first/last lines and the indentation shared by every line (HTML source indents). */
export const trimBlock = (text: string): string => {
  const lines = text
    .replace(/^\s*\n/, '')
    .replace(/\n\s*$/, '')
    .split('\n');
  const indents = lines.filter((line) => line.trim() !== '').map((line) => /^[ \t]*/.exec(line)?.[0].length ?? 0);
  const shared = indents.length === 0 ? 0 : Math.min(...indents);
  return lines.map((line) => line.slice(shared)).join('\n');
};
