import type { TemplateResult } from 'lit';

import { ArrowDown, ArrowUp, BringToFront, Layers, Scan, SendToBack, Spline, type IconNode } from 'lucide';

import type { ArrangeDirection } from '../arrange';
import type { WbConnectorRoute } from '../model';

import { lucide } from '../../../core/icons';

/** The board's own toolbar icons. Decorative: the button carries the accessible name. */
const ARRANGE = {
  front: lucide(BringToFront),
  forward: lucide(ArrowUp),
  backward: lucide(ArrowDown),
  back: lucide(SendToBack),
} as const satisfies Record<ArrangeDirection, () => TemplateResult>;

/**
 * Lucide has a curve between two end points (`spline`) but no straight or elbow counterpart, so
 * those two are drawn the same way on its 24 × 24 grid: the dots, then the route between them.
 */
const ends: IconNode = [
  ['circle', { cx: '19', cy: '5', r: '2' }],
  ['circle', { cx: '5', cy: '19', r: '2' }],
];

const ROUTE = {
  straight: lucide([...ends, ['path', { d: 'M6.5 17.5 17.5 6.5' }]]),
  elbow: lucide([...ends, ['path', { d: 'M7 19h5V5h5' }]]),
  curve: lucide(Spline),
} as const satisfies Record<WbConnectorRoute, () => TemplateResult>;

export const iconArrange = (direction: ArrangeDirection): TemplateResult => ARRANGE[direction]();

export const iconRoute = (route: WbConnectorRoute): TemplateResult => ROUTE[route]();

/** Stacked sheets: the stacking order menu. */
export const iconLayers = lucide(Layers);

/** Four corners: fit the board to the window. */
export const iconFit = lucide(Scan);
