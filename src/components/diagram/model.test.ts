import { describe, expect, it } from 'vitest';

import { diagramTargetValue, parseDiagram, type RawDiagram } from './model';

const raw = (overrides: Partial<RawDiagram> = {}): RawDiagram => ({
  attributes: { id: 'flow' },
  nodes: [
    { attributes: { id: 'a' }, label: 'A', group: null },
    { attributes: { id: 'b', shape: 'diamond', tone: 'green' }, label: 'B', group: 'g' },
  ],
  edges: [{ attributes: { id: 'ab', from: 'a', to: 'b' }, label: 'go' }],
  groups: [{ attributes: { id: 'g', label: 'Group' } }],
  nestedGroups: [],
  ...overrides,
});

describe('parseDiagram', () => {
  it('fills every default the author left out', () => {
    const result = parseDiagram(raw());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagram).toMatchObject({ layout: 'auto', direction: 'right', crossings: 'jump' });
    expect(result.diagram.nodes[0]).toMatchObject({ shape: 'rounded', tone: 'neutral', group: null });
    expect(result.diagram.nodes[1]).toMatchObject({ shape: 'diamond', tone: 'green', group: 'g' });
    expect(result.diagram.edges[0]).toMatchObject({
      line: 'solid',
      start: 'none',
      end: 'arrow',
      flow: false,
      label: 'go',
    });
  });

  it('reports every problem at once instead of drawing a wrong figure', () => {
    const result = parseDiagram(
      raw({
        attributes: { id: 'flow', layout: 'grid' },
        nodes: [
          { attributes: { id: 'a', col: '0', row: '0' }, label: 'A', group: null },
          { attributes: { id: 'a', col: '1', row: '0' }, label: 'A again', group: null },
          { attributes: { id: 'c', shape: 'hexagon' }, label: 'C', group: null },
        ],
        edges: [{ attributes: { id: 'ax', from: 'a', to: 'x' }, label: '' }],
        nestedGroups: ['inner'],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        { code: 'duplicate-id', id: 'a' },
        { code: 'bad-value', id: 'c', attribute: 'shape', value: 'hexagon' },
        { code: 'missing-cell', id: 'c' },
        { code: 'unknown-end', id: 'ax', end: 'x' },
        { code: 'nested-group', id: 'inner' },
      ]),
    );
  });

  it('reads a present flow attribute as on, and flow="false" as off', () => {
    const on = parseDiagram(raw({ edges: [{ attributes: { id: 'e', from: 'a', to: 'b', flow: '' }, label: '' }] }));
    const off = parseDiagram(
      raw({ edges: [{ attributes: { id: 'e', from: 'a', to: 'b', flow: 'false' }, label: '' }] }),
    );
    expect(on.ok && on.diagram.edges[0]?.flow).toBe(true);
    expect(off.ok && off.diagram.edges[0]?.flow).toBe(false);
  });
});

describe('diagramTargetValue', () => {
  it('encodes each part so an id may hold a slash', () => {
    expect(diagramTargetValue('flow', 'node', 'a/b')).toBe('element:flow/node/a%2Fb');
  });
});
