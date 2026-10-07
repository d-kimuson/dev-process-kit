import { html, svg, type TemplateResult } from 'lit';

import type { ArrangeDirection } from '../arrange';
import type { WbConnectorRoute } from '../model';

/**
 * The board's own toolbar icons, drawn on the shared icon set's 16×16 grid
 * and stroke. Decorative: the button carries the accessible name.
 */
const icon = (body: TemplateResult): TemplateResult =>
  html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    ${body}
  </svg>`;

const ARRANGE = {
  // The picked card (filled) over or under the other one; a single arrow for "one step".
  front: svg`<rect x="2.5" y="2.5" width="7.5" height="7.5" rx="1.5"></rect><rect x="6" y="6" width="7.5" height="7.5" rx="1.5" fill="currentColor"></rect>`,
  forward: svg`<path d="M8 13.5V3M4 7l4-4 4 4"></path>`,
  backward: svg`<path d="M8 2.5V13M4 9l4 4 4-4"></path>`,
  back: svg`<rect x="2.5" y="2.5" width="7.5" height="7.5" rx="1.5" fill="currentColor"></rect><rect x="6" y="6" width="7.5" height="7.5" rx="1.5" style="fill: var(--dpk-paper-raised)"></rect>`,
} as const satisfies Record<ArrangeDirection, TemplateResult>;

const ROUTE = {
  straight: svg`<path d="M3 13L13 3"></path>`,
  elbow: svg`<path d="M2.5 12.5H8V3.5h5.5"></path>`,
  curve: svg`<path d="M2.5 12.5C9 12.5 7 3.5 13.5 3.5"></path>`,
} as const satisfies Record<WbConnectorRoute, TemplateResult>;

export const iconArrange = (direction: ArrangeDirection): TemplateResult => icon(ARRANGE[direction]);

export const iconRoute = (route: WbConnectorRoute): TemplateResult => icon(ROUTE[route]);

/** Stacked sheets: the stacking order menu. */
export const iconLayers = (): TemplateResult =>
  icon(
    svg`<path d="M8 2.5l5.5 3L8 8.5l-5.5-3z"></path><path d="M2.5 8.25L8 11.25l5.5-3"></path><path d="M2.5 11L8 14l5.5-3"></path>`,
  );

export const iconChevronDown = (): TemplateResult => icon(svg`<path d="M4.5 6.5L8 10l3.5-3.5"></path>`);
