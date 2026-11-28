import { LitElement, css, html, nothing, svg, type CSSResultGroup } from 'lit';

import { tokens } from '../../core/theme';

/** The outline of a shape the box border cannot draw, in a 100 by 100 box stretched to the node. */
const OUTLINES: Readonly<Record<string, ReturnType<typeof svg>>> = {
  diamond: svg`<polygon class="outline" points="50,0 100,50 50,100 0,50"></polygon>`,
  cylinder: svg`
    <path class="outline" d="M0,11 A50,11 0 0 1 100,11 V89 A50,11 0 0 1 0,89 Z"></path>
    <path class="rim" d="M0,11 A50,11 0 0 0 100,11"></path>
  `,
};

/**
 * `<dpk-diagram-node>` — one node of the enclosing `dpk-diagram`. The child
 * content is the label and sets the node's size; `shape` and `tone` set how it
 * is drawn. The diagram places it.
 */
export class DpkDiagramNode extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    css`
      :host {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        width: max-content;
        min-width: 64px;
        max-width: var(--dpk-diagram-node-max, 180px);
        min-height: 42px;
        padding: 10px 16px;
        font-family: var(--dpk-body);
        font-size: 13px;
        font-weight: 550;
        line-height: 1.35;
        color: var(--dpk-ink);
        text-align: center;
        overflow-wrap: anywhere;
        cursor: pointer;
        background: var(--_fill);
        border: 1px solid var(--_stroke);
        border-radius: var(--dpk-radius);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
        transition:
          opacity var(--dpk-dur) var(--dpk-ease),
          border-color var(--dpk-dur) var(--dpk-ease),
          box-shadow var(--dpk-dur) var(--dpk-ease),
          translate var(--dpk-dur) var(--dpk-ease);
        --_tone: var(--dpk-ink-faint);
        --_fill: var(--dpk-diagram-node-fill, var(--dpk-paper-raised));
        --_stroke: var(--dpk-diagram-node-stroke, color-mix(in srgb, var(--dpk-ink-faint) 48%, transparent));
      }
      :host(:is([tone='accent'], [tone='blue'], [tone='green'], [tone='amber'], [tone='violet'], [tone='danger'])) {
        --_fill: var(--dpk-diagram-node-fill, color-mix(in srgb, var(--_tone) 9%, var(--dpk-paper-raised)));
        --_stroke: var(--dpk-diagram-node-stroke, color-mix(in srgb, var(--_tone) 46%, transparent));
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
        --_stroke: color-mix(in srgb, var(--dpk-blue) 62%, transparent);
        translate: 0 -1px;
      }
      :host(:focus-visible) {
        outline: 2px solid var(--dpk-blue);
        outline-offset: 3px;
      }
      :host([data-state~='selected']) {
        --_stroke: var(--dpk-blue);
        box-shadow:
          var(--dpk-bevel),
          0 0 0 3px color-mix(in srgb, var(--dpk-blue) 26%, transparent);
      }
      :host([data-state~='dimmed']) {
        opacity: 0.32;
      }
      :host([shape='box']) {
        border-radius: var(--dpk-radius-xs);
      }
      :host([shape='pill']) {
        padding-inline: 20px;
        border-radius: 999px;
      }
      :host([shape='circle']) {
        aspect-ratio: 1;
        min-width: 64px;
        padding: 12px;
        border-radius: 50%;
      }
      :host(:is([shape='diamond'], [shape='cylinder'])) {
        background: none;
        border-color: transparent;
        box-shadow: none;
      }
      :host([shape='diamond']) {
        min-width: 104px;
        min-height: 64px;
        padding: 20px 34px;
      }
      :host([shape='cylinder']) {
        min-height: 60px;
        padding: 20px 18px 12px;
      }
      :host(:is([shape='diamond'], [shape='cylinder'])[data-state~='selected']) {
        box-shadow: none;
      }
      svg {
        position: absolute;
        inset: 0;
        z-index: -1;
        width: 100%;
        height: 100%;
        overflow: visible;
        filter: drop-shadow(0 1px 1.5px var(--dpk-shade-1));
      }
      .outline,
      .rim {
        vector-effect: non-scaling-stroke;
        stroke: var(--_stroke);
        stroke-width: 1;
        stroke-linejoin: round;
        transition: stroke var(--dpk-dur) var(--dpk-ease);
      }
      .outline {
        fill: var(--_fill);
      }
      .rim {
        fill: none;
      }
      :host([data-state~='selected']) .outline,
      :host([data-state~='selected']) .rim {
        stroke-width: 2;
      }
      .label {
        position: relative;
        min-width: 0;
      }
    `,
  ];

  static override properties = { shape: { type: String } };
  declare shape: string | null;

  constructor() {
    super();
    this.shape = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
  }

  protected override render(): unknown {
    const outline = this.shape === null ? undefined : OUTLINES[this.shape];
    return html`${
        outline === undefined
          ? nothing
          : html`<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${outline}</svg>`
      }<span class="label"><slot></slot></span>`;
  }
}

export const defineDiagramNode = (): void => {
  if (!customElements.get('dpk-diagram-node')) customElements.define('dpk-diagram-node', DpkDiagramNode);
};
