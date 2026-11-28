import { LitElement, css, html, type CSSResultGroup } from 'lit';

/**
 * `<dpk-diagram-group>` — gathers the `dpk-diagram-node`s inside it into one
 * framed group of the enclosing `dpk-diagram`. It takes no box of its own: the
 * diagram lays the members out together and draws the frame around them.
 */
export class DpkDiagramGroup extends LitElement {
  static override styles: CSSResultGroup = css`
    :host {
      display: contents;
    }
  `;

  protected override render(): unknown {
    return html`<slot></slot>`;
  }
}

export const defineDiagramGroup = (): void => {
  if (!customElements.get('dpk-diagram-group')) customElements.define('dpk-diagram-group', DpkDiagramGroup);
};
