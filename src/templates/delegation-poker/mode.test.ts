import { describe, expect, it } from 'vitest';

import { parsePlayMode, playIntent } from './mode';
import { parseDelegationPokerBase, type DecisionArea } from './model';

const state = parseDelegationPokerBase({
  decisions: [
    { id: 'open', name: 'Open' },
    { id: 'played', name: 'Played' },
  ],
});
const decisionOf = (id: string): DecisionArea => {
  const decision = state.decisions.find((candidate) => candidate.id === id);
  if (decision === undefined) throw new Error(`no decision ${id}`);
  return decision;
};
const open = decisionOf('open');
const played: DecisionArea = { ...decisionOf('played'), yours: 3 };

describe('play mode', () => {
  it('reads the attribute, falling back to lax', () => {
    expect(parsePlayMode('strict')).toBe('strict');
    expect(parsePlayMode('lax')).toBe('lax');
    expect(parsePlayMode(null)).toBe('lax');
    expect(parsePlayMode('STRICT ')).toBe('lax');
  });

  it('lets a lax reader play and play again without asking', () => {
    expect(playIntent('lax', open, false)).toEqual({ kind: 'play' });
    expect(playIntent('lax', played, false)).toEqual({ kind: 'play' });
  });

  it('asks a strict reader once before the first card, unless they opted out', () => {
    expect(playIntent('strict', open, false)).toEqual({ kind: 'confirm' });
    expect(playIntent('strict', open, true)).toEqual({ kind: 'play' });
  });

  it('locks a strict reader’s card once played', () => {
    expect(playIntent('strict', played, false)).toEqual({ kind: 'locked' });
    expect(playIntent('strict', played, true)).toEqual({ kind: 'locked' });
  });
});
