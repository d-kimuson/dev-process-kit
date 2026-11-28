import { describe, expect, it } from 'vitest';

import { endFrame } from '../../../lib/layout/path-steps';
import { END_MARKERS } from './glyphs';
import { EDGE_PATHS, edgeBody, edgeTextLabel, lineStyleClass } from './render';

const frame = endFrame(
  [
    { x: 100, y: 50 },
    { x: 0, y: 50 },
  ],
  'end',
);

describe('lineStyleClass', () => {
  it('maps each line style to the class that dashes it', () => {
    expect(lineStyleClass('dashed')).toBe('is-dashed');
    expect(lineStyleClass('dotted')).toBe('is-dotted');
    expect(lineStyleClass('solid')).toBe(false);
  });
});

describe('EDGE_PATHS', () => {
  it('selects the three shared paths of one edge, scoped to direct children', () => {
    expect(EDGE_PATHS).toBe(':scope > .d-edge-path, :scope > .d-edge-flow, :scope > .d-edge-hit');
  });
});

describe('edgeTextLabel', () => {
  it('draws a text label positioned by its anchor with a halo class', () => {
    const template = edgeTextLabel({ x: 10, y: 20, anchor: 'middle', text: 'has', className: 'er-cardinality' });
    const markup = JSON.stringify(template);
    expect(markup).toContain('d-edge-label er-cardinality');
    expect(markup).toContain('has');
  });
});

describe('edgeBody', () => {
  const body = edgeBody({
    d: 'M100 50 L0 50',
    ends: [{ side: 'end', marker: END_MARKERS.arrow, frame }],
    flow: true,
    hit: { label: 'customers to orders', onSelect: () => undefined },
  });
  const markup = JSON.stringify(body);

  it('draws the path, the flow overlay and the end group', () => {
    expect(markup).toContain('d-edge-path');
    expect(markup).toContain('d-edge-flow');
    expect(markup).toContain('d-edge-end');
    expect(markup).toContain('data-end');
    expect(markup).toContain('data-glyph');
  });

  it('draws the hit area last, with its accessible label and a button role', () => {
    expect(markup).toContain('d-edge-hit');
    expect(markup).toContain('customers to orders');
    expect(markup).toContain('button');
  });

  it('omits the flow overlay and hit area when not asked for them', () => {
    const plain = JSON.stringify(edgeBody({ d: 'M0 0 L1 1', ends: [], flow: false, hit: null }));
    expect(plain).not.toContain('d-edge-flow');
    expect(plain).not.toContain('d-edge-hit');
  });
});
