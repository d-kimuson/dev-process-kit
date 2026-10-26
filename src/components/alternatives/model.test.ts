// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { emptyAlternativesData, parseAlternativesData } from './model';

describe('parseAlternativesData', () => {
  it('reads the options in authored order, filling the optional fields', () => {
    const data = parseAlternativesData({
      options: [
        { id: 'a', status: 'rejected', label: 'A', summary: 'Do nothing', reason: 'Does not scale' },
        { id: 'c', status: 'adopted', tradeoffs: ['One more hop'] },
      ],
    });

    expect(data).toEqual({
      options: [
        {
          id: 'a',
          status: 'rejected',
          label: 'A',
          summary: 'Do nothing',
          reason: 'Does not scale',
          tradeoffs: [],
        },
        {
          id: 'c',
          status: 'adopted',
          label: 'c',
          summary: null,
          reason: null,
          tradeoffs: ['One more hop'],
        },
      ],
    });
  });

  it('accepts every status the component renders', () => {
    const statuses = parseAlternativesData({
      options: [
        { id: 'adopted', status: 'adopted' },
        { id: 'rejected', status: 'rejected' },
        { id: 'considered', status: 'considered' },
      ],
    }).options.map((option) => option.status);

    expect(statuses).toEqual(['adopted', 'rejected', 'considered']);
  });

  it('accepts an empty comparison', () => {
    expect(parseAlternativesData({ options: [] })).toEqual(emptyAlternativesData());
  });

  it('rejects a duplicate option id', () => {
    expect(() =>
      parseAlternativesData({
        options: [
          { id: 'a', status: 'adopted' },
          { id: 'a', status: 'rejected' },
        ],
      }),
    ).toThrow(/duplicate option id: a/);
  });

  it('rejects a status the component does not render', () => {
    expect(() => parseAlternativesData({ options: [{ id: 'a', status: 'maybe' }] })).toThrow(/adopted/);
  });

  it('rejects an option with no status, a blank text or an id it cannot key on', () => {
    expect(() => parseAlternativesData({ options: [{ id: 'a' }] })).toThrow();
    expect(() => parseAlternativesData({ options: [{ id: 'a', status: 'adopted', label: '' }] })).toThrow();
    expect(() => parseAlternativesData({ options: [{ id: 'a', status: 'adopted', summary: '' }] })).toThrow();
    expect(() => parseAlternativesData({ options: [{ id: 'a', status: 'adopted', reason: '' }] })).toThrow();
    expect(() => parseAlternativesData({ options: [{ id: 'a', status: 'adopted', tradeoffs: [''] }] })).toThrow();
    expect(() => parseAlternativesData({ options: [{ id: 'a b', status: 'adopted' }] })).toThrow();
  });

  it('rejects unknown keys, a missing list and something that is not data at all', () => {
    expect(() => parseAlternativesData({ options: [{ id: 'a', status: 'adopted', colour: 'red' }] })).toThrow();
    expect(() => parseAlternativesData({ options: [{ id: 'a', status: 'adopted' }], title: 'x' })).toThrow();
    expect(() => parseAlternativesData({})).toThrow(/options/);
    expect(() => parseAlternativesData([])).toThrow();
    expect(() => parseAlternativesData('a')).toThrow();
    expect(() => parseAlternativesData(null)).toThrow();
  });
});

/**
 * A reader copies the example at the top of the docs page straight into their
 * page, so it has to keep parsing with the parser the element itself runs.
 */
describe('docs/components/alternatives.md example', () => {
  it('parses with the same parser the element runs', () => {
    const markdown = readFileSync(resolve('docs/components/alternatives.md'), 'utf8');
    const json = /<script type="application\/json">([\s\S]*?)<\/script>/.exec(markdown)?.[1];
    expect(json).toBeDefined();

    const data = parseAlternativesData(JSON.parse(json ?? 'null'));
    expect(data.options.map((option) => option.status)).toEqual(['rejected', 'rejected', 'adopted', 'considered']);
  });
});
