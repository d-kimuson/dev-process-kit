import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { ExampleMappingMessages } from '../messages';
import type { MappingCard, MappingCardKind } from '../model';

import { controls, tokens } from '../../../core/theme';
import { onCommit } from '../../../lib/dom/events';
import { cardPaletteStyle } from './mapping-card';

/** What the detail asks of its board: each returns whether a template recorded it. */
export type CardDetailActions = {
  rename(name: string): boolean;
  describe(description: string): boolean;
};

/** The card one level up: a rule's story, an example's or a question's rule. */
export type CardDetailParent = { readonly kind: MappingCardKind; readonly name: string };

const detailStyles = css`
  :host {
    display: grid;
    align-content: start;
    gap: 18px;
  }
  .em-detail-field {
    display: grid;
    gap: 7px;
    min-width: 0;
  }
  .em-detail-field > dpk-inline-edit {
    display: block;
    margin: 0 -4px;
  }
  .em-detail-name {
    font-size: 17px;
    font-weight: 700;
    line-height: 1.35;
  }
  .em-detail-kind {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
  }
  .em-detail-swatch {
    flex: none;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    background: var(--em-card-bg);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  }
  .em-detail-value {
    margin: 0;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .em-detail-error {
    margin: 0;
    padding: 4px 7px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
    font-size: 11.5px;
    line-height: 1.4;
  }
`;

/**
 * A story, rule, example or question card's detail, drawn in the side panel:
 * its kind, its name and description (edited in place through the board's
 * element actions), and the card it hangs off of.
 */
export class DpkInternalExampleMappingCardDetail extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, detailStyles];

  static override properties = {
    card: { attribute: false },
    parent: { attribute: false },
    messages: { attribute: false },
    actions: { attribute: false },
    failed: { state: true },
  };

  declare card: MappingCard | null;
  /** `null` for a story, which hangs off of nothing. */
  declare parent: CardDetailParent | null;
  declare messages: ExampleMappingMessages | null;
  declare actions: CardDetailActions | null;
  /** An edit from here that no template recorded. */
  declare failed: boolean;

  constructor() {
    super();
    this.card = null;
    this.parent = null;
    this.messages = null;
    this.actions = null;
    this.failed = false;
  }

  #record(accepted: boolean | undefined): void {
    this.failed = accepted !== true;
  }

  protected override render(): TemplateResult | typeof nothing {
    const card = this.card;
    const m = this.messages;
    if (card === null || m === null) return nothing;
    const kindLabel = m.kindLabel(card.kind);
    const parent = this.parent;
    return html`
      <section class="em-detail-field">
        <span class="dpk-label">${m.kindField}</span>
        <span class="em-detail-kind" style=${cardPaletteStyle(card.kind)}
          ><span class="em-detail-swatch" aria-hidden="true"></span>${kindLabel}</span
        >
      </section>
      <section class="em-detail-field">
        <span class="dpk-label">${m.nameField(kindLabel)}</span>
        <dpk-inline-edit
          class="em-detail-name"
          wrap
          .value=${card.name}
          .label=${m.nameField(kindLabel)}
          @dpk-commit=${onCommit((name) => this.#record(this.actions?.rename(name)))}
        ></dpk-inline-edit>
      </section>
      <section class="em-detail-field">
        <span class="dpk-label">${m.descriptionField}</span>
        <dpk-inline-edit
          multiline
          .value=${card.description ?? ''}
          .label=${m.descriptionField}
          .placeholder=${m.descriptionPlaceholder}
          @dpk-commit=${onCommit((description) => this.#record(this.actions?.describe(description)))}
        ></dpk-inline-edit>
      </section>
      ${
        parent === null
          ? nothing
          : html`<section class="em-detail-field">
              <span class="dpk-label">${m.parentField(m.kindLabel(parent.kind))}</span>
              <p class="em-detail-value">${parent.name}</p>
            </section>`
      }
      ${this.failed ? html`<p class="em-detail-error" role="alert">${m.notRecorded}</p>` : nothing}
    `;
  }
}

export const defineMappingCardDetail = (): void => {
  if (!customElements.get('dpk-internal-example-mapping-card-detail'))
    customElements.define('dpk-internal-example-mapping-card-detail', DpkInternalExampleMappingCardDetail);
};
