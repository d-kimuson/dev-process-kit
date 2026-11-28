import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import { controls, tokens } from '../../core/theme';

/** One fact about the selected element; a `null` or empty value is left out. */
export type DetailField = { readonly label: string; readonly value: string | null };

/** What a diagram's side panel shows of the selected element: read only, the facts its tooltip carries and more. */
export type CanvasDetail = {
  /** What kind of element it is (`State`), shown in the panel's heading. */
  readonly kind: string;
  /** The element's name as the diagram draws it. */
  readonly name: string;
  readonly fields: readonly DetailField[];
};

/** The fields worth a row: the ones with something to say. */
export const shownFields = (fields: readonly DetailField[]): readonly { label: string; value: string }[] =>
  fields.flatMap((field) =>
    field.value === null || field.value.trim() === '' ? [] : [{ label: field.label, value: field.value }],
  );

const detailStyles = css`
  :host {
    display: grid;
    align-content: start;
    gap: 16px;
  }
  .detail-name {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }
  dl {
    display: grid;
    gap: 14px;
    margin: 0;
  }
  .detail-field {
    display: grid;
    gap: 5px;
    min-width: 0;
  }
  dd {
    margin: 0;
    color: var(--dpk-ink);
    font-size: var(--dpk-text-sm, 13px);
    line-height: 1.55;
    white-space: pre-line;
    overflow-wrap: anywhere;
  }
`;

/** The read-only detail a diagram hands its side panel. */
export class DpkInternalBaseDetailFields extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, detailStyles];

  static override properties = {
    detail: { attribute: false },
  };

  declare detail: CanvasDetail | null;

  constructor() {
    super();
    this.detail = null;
  }

  protected override render(): TemplateResult | typeof nothing {
    const detail = this.detail;
    if (detail === null) return nothing;
    const fields = shownFields(detail.fields);
    return html`
      <h3 class="detail-name">${detail.name}</h3>
      ${
        fields.length === 0
          ? nothing
          : html`<dl>
              ${fields.map(
                (field) =>
                  html`<div class="detail-field">
                    <dt class="dpk-label">${field.label}</dt>
                    <dd>${field.value}</dd>
                  </div>`,
              )}
            </dl>`
      }
    `;
  }
}

export const defineDetailFields = (): void => {
  if (!customElements.get('dpk-internal-base-detail-fields'))
    customElements.define('dpk-internal-base-detail-fields', DpkInternalBaseDetailFields);
};
