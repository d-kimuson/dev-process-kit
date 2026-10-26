// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { alternativesMessages } from './messages';
import { parseAlternativesData, type AlternativeOption } from './model';
import { presentAlternative, presentAlternatives, presentStatus } from './present';

const m = alternativesMessages('en');

const option = (input: Record<string, unknown>): AlternativeOption => {
  const parsed = parseAlternativesData({ options: [input] }).options[0];
  if (parsed === undefined) throw new Error('the fixture option did not parse');
  return parsed;
};

describe('presentStatus', () => {
  it('names each status, in the page language', () => {
    expect(presentStatus(m, 'adopted')).toBe('Adopted');
    expect(presentStatus(m, 'rejected')).toBe('Rejected');
    expect(presentStatus(m, 'considered')).toBe('Considered');
    const ja = alternativesMessages('ja');
    expect([presentStatus(ja, 'adopted'), presentStatus(ja, 'rejected'), presentStatus(ja, 'considered')]).toEqual([
      '採用',
      '却下',
      '検討',
    ]);
  });
});

describe('presentAlternative', () => {
  it('takes the status as the card tone', () => {
    expect(presentAlternative(m, option({ id: 'a', status: 'considered' })).status).toBe('considered');
  });

  it('keeps the id as a key only when the title reads as something else', () => {
    expect(presentAlternative(m, option({ id: 'a', status: 'adopted' })).key).toBeNull();
    expect(presentAlternative(m, option({ id: 'a', label: 'A', status: 'adopted' }))).toMatchObject({
      key: 'a',
      title: 'A',
    });
  });

  it('labels the reason and the tradeoffs only where the author wrote them', () => {
    const bare = presentAlternative(m, option({ id: 'a', status: 'rejected' }));
    expect(bare.reason).toBeNull();
    expect(bare.tradeoffs).toBeNull();
    expect(bare.summary).toBeNull();

    const full = presentAlternative(
      m,
      option({ id: 'a', status: 'rejected', reason: 'Costs a queue', tradeoffs: ['Lag', 'Ops'] }),
    );
    expect(full.reason).toEqual({ label: 'Reason', text: 'Costs a queue' });
    expect(full.tradeoffs).toEqual({ label: 'Tradeoffs', items: ['Lag', 'Ops'] });
  });
});

describe('presentAlternatives', () => {
  it('keeps the authored order', () => {
    const data = parseAlternativesData({
      options: [
        { id: 'b', status: 'rejected' },
        { id: 'c', status: 'adopted' },
      ],
    });
    expect(presentAlternatives(m, data).map((view) => view.title)).toEqual(['b', 'c']);
  });
});
