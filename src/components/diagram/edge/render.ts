import { svg, nothing, type TemplateResult } from 'lit';

import type { LayoutPoint } from '../../../lib/layout/layered';
import type { EndFrame, EndSide } from '../../../lib/layout/path-steps';
import type { EndMarker, GlyphPaint, GlyphShape } from './glyphs';
import type { LineStyle } from './spec';

/**
 * The Lit half of the edge vocabulary: the shapes every diagram draws a line
 * with, named consistently so one stylesheet paints them all. A board writes
 * the outer `<g>` (keeping its own `data-*` attributes and state classes) and
 * hands `edgeBody` the path, the ends and the hit area.
 */

export type EdgeEndView = { readonly side: EndSide; readonly marker: EndMarker; readonly frame: EndFrame };

export type EdgeBodyView = {
  readonly d: string;
  readonly ends: readonly EdgeEndView[];
  /** Whether to draw the animated flow path. A board usually sets this from its lit/selected state via CSS instead. */
  readonly flow: boolean;
  readonly hit: {
    readonly label: string;
    readonly onSelect: () => void;
    /** Space-separated grill question refs, so an unlabeled line can carry them too. */
    readonly questions?: string;
  } | null;
};

/** The shared paths of an edge, for a highlight pass that moves their `d` without a re-render. */
export const EDGE_PATHS = ':scope > .d-edge-path, :scope > .d-edge-flow, :scope > .d-edge-hit';

const paintOf = (paint: GlyphPaint): string | typeof nothing =>
  paint === 'none' ? 'none' : paint === 'line' ? 'line' : paint === 'paper' ? 'paper' : nothing;

const shape = (glyph: GlyphShape): TemplateResult => {
  switch (glyph.kind) {
    case 'segment':
      return svg`<line x1=${glyph.a.x} y1=${glyph.a.y} x2=${glyph.b.x} y2=${glyph.b.y}></line>`;
    case 'circle':
      return svg`<circle cx=${glyph.center.x} cy=${glyph.center.y} r=${glyph.r} data-paint=${paintOf(glyph.paint)}></circle>`;
    case 'polygon':
      return svg`<polygon points=${glyph.points.map((point: LayoutPoint) => `${point.x},${point.y}`).join(' ')} data-paint=${paintOf(glyph.paint)}></polygon>`;
    case 'polyline':
      return svg`<polyline points=${glyph.points.map((point: LayoutPoint) => `${point.x},${point.y}`).join(' ')} data-paint=${paintOf(glyph.paint)}></polyline>`;
  }
};

const endGroup = (end: EdgeEndView): TemplateResult =>
  svg`<g class="d-edge-end" data-end=${end.side} data-glyph=${end.marker.name}>${end.marker.shapes(end.frame).map(shape)}</g>`;

/**
 * Just the end glyphs of an edge, for a board that keeps its own line and hit
 * paths (a hand-drawn shape, a `sequence-message` class) and only wants the
 * inline heads the shared vocabulary draws.
 */
export const edgeEnds = (ends: readonly EdgeEndView[]): TemplateResult => svg`${ends.map(endGroup)}`;

/**
 * The drawable body of one edge, in paint order: the line, its flow overlay,
 * the end glyphs, and last the transparent hit area (so a pointer lands on the
 * line, never on a glyph). The hit area takes focus and answers Enter/Space.
 */
export const edgeBody = (view: EdgeBodyView): TemplateResult => svg`
  <path class="d-edge-path" d=${view.d}></path>
  ${view.flow ? svg`<path class="d-edge-flow" d=${view.d}></path>` : nothing}
  ${edgeEnds(view.ends)}
  ${
    view.hit === null
      ? nothing
      : svg`<path
          class="d-edge-hit"
          d=${view.d}
          role="button"
          tabindex="0"
          aria-label=${view.hit.label}
          data-grill-questions=${view.hit.questions ?? nothing}
          @click=${() => view.hit?.onSelect()}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            view.hit?.onSelect();
          }}
        ></path>`
  }
`;

/** The class a line style adds to the edge group, so the stylesheet dashes it. */
export const lineStyleClass = (style: LineStyle): 'is-dashed' | 'is-dotted' | false =>
  style === 'dashed' ? 'is-dashed' : style === 'dotted' ? 'is-dotted' : false;

export type EdgeTextLabelView = {
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly text: string;
  readonly className?: string;
};

/** A text label drawn on the line, with a paper halo so it reads over its own stroke. */
export const edgeTextLabel = (label: EdgeTextLabelView): TemplateResult => svg`
  <text
    class=${['d-edge-label', label.className].filter(Boolean).join(' ')}
    x=${label.x}
    y=${label.y}
    text-anchor=${label.anchor}
    dominant-baseline="central"
  >${label.text}</text>
`;
