import { LitElement, css, html, type CSSResultGroup } from 'lit';

import { tokens } from '../../core/theme';

/**
 * `<dpk-diagram-edge>` — one line of the enclosing `dpk-diagram`, from the
 * node `from` to the node `to`. The diagram draws the line; this element is
 * the line's label chip, holding the child content and placed by the diagram
 * on the line.
 */
export class DpkDiagramEdge extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    css`
      :host {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 3;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        max-width: 200px;
        padding: 2px 9px;
        font-family: var(--dpk-body);
        font-size: 11.5px;
        font-weight: 500;
        line-height: 1.45;
        color: var(--_chip-ink);
        white-space: nowrap;
        cursor: pointer;
        background: var(--_chip-fill);
        border: 1px solid var(--_chip-rule);
        border-radius: 999px;
        box-shadow: var(--dpk-shadow-xs);
        transition:
          opacity var(--dpk-dur) var(--dpk-ease),
          border-color var(--dpk-dur) var(--dpk-ease),
          box-shadow var(--dpk-dur) var(--dpk-ease);
        --_tone: var(--dpk-ink-faint);
        --_chip-ink: var(--dpk-ink-soft);
        --_chip-fill: var(--dpk-paper-raised);
        --_chip-rule: var(--dpk-rule-strong);
      }
      :host(:is([tone='accent'], [tone='blue'], [tone='green'], [tone='amber'], [tone='violet'], [tone='danger'])) {
        --_chip-ink: color-mix(in srgb, var(--_tone) 82%, var(--dpk-ink));
        --_chip-fill: color-mix(in srgb, var(--_tone) 8%, var(--dpk-paper-raised));
        --_chip-rule: color-mix(in srgb, var(--_tone) 32%, transparent);
      }
      :host([tone='accent']) {
        --_tone: var(--dpk-accent);
      }
      :host([tone='blue']) {
        --_tone: var(--dpk-blue);
      }
      :host([tone='green']) {
        --_tone: var(--dpk-green);
      }
      :host([tone='amber']) {
        --_tone: var(--dpk-amber);
      }
      :host([tone='violet']) {
        --_tone: var(--dpk-violet);
      }
      :host([tone='danger']) {
        --_tone: var(--dpk-danger);
      }
      :host(:hover) {
        border-color: color-mix(in srgb, var(--dpk-blue) 50%, var(--_chip-rule));
      }
      :host(:focus-visible) {
        outline: 2px solid var(--dpk-blue);
        outline-offset: 2px;
      }
      :host([data-state~='selected']) {
        color: var(--dpk-ink);
        border-color: var(--dpk-ink-soft);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--dpk-blue) 24%, transparent);
      }
      :host([data-state~='dimmed']) {
        opacity: 0.32;
      }
      span {
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ];

  protected override render(): unknown {
    return html`<span><slot></slot></span>`;
  }
}

export const defineDiagramEdge = (): void => {
  if (!customElements.get('dpk-diagram-edge')) customElements.define('dpk-diagram-edge', DpkDiagramEdge);
};
