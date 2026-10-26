import { LitElement, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import { LocaleController } from '../../core/locale-controller';
import { observeJsonChild } from '../../lib/dom/base-data';
import { alternativesMessages, type AlternativesMessages } from './messages';
import { emptyAlternativesData, parseAlternativesData, type AlternativesData } from './model';
import { presentAlternatives, type AlternativeView } from './present';
import { alternativesStyles } from './styles';

/**
 * `<dpk-alternatives>` — the options a decision weighed, side by side, and which
 * one it took.
 *
 * Each option is the kit's own card, and its status is a chip in the card's
 * head: `Adopted` (green), `Rejected` (amber) or `Considered` (blue). The taken
 * option wears its tone on all four sides and a soft green face, so it is the
 * one card the eye finds first; the others stay neutral, each with the reason it
 * was dropped. It replaces the hand-rolled "left-border note" a design doc
 * reaches for: a rationale belongs on a card surface, and a status belongs in a
 * chip, not in a stripe down one edge (`dev-docs/guidelines/coding.md`).
 *
 * Give the data as the `data` property or as a JSON child. There are no element
 * actions and no comment targets: the decision is the author's, and the reader
 * reads it.
 */
export class DpkAlternatives extends LitElement {
  static override styles: CSSResultGroup = alternativesStyles;
  static override properties = {
    data: { attribute: false },
    heading: { type: String },
  };

  /** The whole comparison as a typed property. The JSON child is the HTML-side path. */
  declare data: AlternativesData | null;
  /** The section label above the cards; `''` hides it. Defaults to the dictionary's. */
  declare heading: string | null;

  readonly #i18n = new LocaleController(this);
  #stopJsonChild: (() => void) | null = null;
  #alternatives: AlternativesData | null = null;
  #dataError: string | null = null;

  constructor() {
    super();
    this.data = null;
    this.heading = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#stopJsonChild = observeJsonChild(this, parseAlternativesData, (result) => {
      // A reactive `.data` property wins over the JSON child, the same way it does in every
      // other component that takes both.
      if (this.data !== null) return;
      if (result.ok) this.#apply(result.value);
      else this.#fail(result.error);
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopJsonChild?.();
    this.#stopJsonChild = null;
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('data') && this.data !== null) this.#apply(this.data);
  }

  /** Validation error from the JSON child (read-only). */
  get dataError(): string | null {
    return this.#dataError;
  }

  get #m(): AlternativesMessages {
    return alternativesMessages(this.#i18n.locale);
  }

  #apply(alternatives: AlternativesData): void {
    this.#alternatives = alternatives;
    this.#dataError = null;
    this.requestUpdate();
  }

  #fail(error: string): void {
    this.#alternatives = null;
    this.#dataError = error;
    console.error('[dev-process-kit] invalid alternatives data:', error);
    this.requestUpdate();
  }

  protected override render(): TemplateResult {
    const m = this.#m;
    const label = this.heading ?? m.heading;
    const views = presentAlternatives(m, this.#alternatives ?? emptyAlternativesData());
    return html`<section class="alternatives">
      ${label === '' ? nothing : html`<p class="alternatives-label dpk-label">${label}</p>`}
      ${
        this.#dataError === null
          ? nothing
          : html`<p class="alternatives-notice" role="alert">${m.dataError}<br />${this.#dataError}</p>`
      }
      ${this.#dataError === null && views.length === 0 ? html`<p class="alternatives-empty">${m.empty}</p>` : nothing}
      ${
        views.length === 0
          ? nothing
          : html`<ul class="options">
              ${repeat(
                views,
                (view) => view.id,
                (view) => this.#renderOption(view),
              )}
            </ul>`
      }
    </section>`;
  }

  #renderOption(view: AlternativeView): TemplateResult {
    const facts =
      view.reason === null && view.tradeoffs === null
        ? nothing
        : html`<dl class="option-facts">
            ${
              view.reason === null
                ? nothing
                : html`<div class="option-fact">
                    <dt class="dpk-label">${view.reason.label}</dt>
                    <dd>${view.reason.text}</dd>
                  </div>`
            }
            ${
              view.tradeoffs === null
                ? nothing
                : html`<div class="option-fact">
                    <dt class="dpk-label">${view.tradeoffs.label}</dt>
                    <dd>
                      <ul class="option-tradeoffs">
                        ${view.tradeoffs.items.map((item) => html`<li>${item}</li>`)}
                      </ul>
                    </dd>
                  </div>`
            }
          </dl>`;
    return html`<li class="option" data-status=${view.status} data-option=${view.id}>
      <article class="dpk-card">
        <div class="dpk-card-head">
          ${view.key === null ? nothing : html`<span class="dpk-card-key">${view.key}</span>`}
          <span class="dpk-card-title">${view.title}</span>
          <span class="dpk-card-meta">
            <span class="dpk-card-chip status" data-tone=${view.status}>${view.statusLabel}</span>
          </span>
        </div>
        ${view.summary === null ? nothing : html`<p class="option-summary">${view.summary}</p>`} ${facts}
      </article>
    </li>`;
  }
}
