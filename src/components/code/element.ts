import { LitElement, html, nothing, type CSSResultGroup } from 'lit';

import { iconCheck, iconCopy } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { tokens } from '../../core/theme';
import { copyText } from '../../lib/dom/clipboard';
import { highlight } from './highlight';
import { codeMessages, type CodeMessages } from './messages';
import { codeStyles } from './styles';

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
  static override styles: CSSResultGroup = [tokens, codeStyles];

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
