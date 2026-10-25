import { describe, expect, it } from 'vitest';

import { DraftController } from '../../core/controller';
import { delegationPokerAction } from './actions';
import { delegationPokerDefinitionFor } from './definition';
import { parseDelegationPokerBase } from './model';

const definition = delegationPokerDefinitionFor('en');

const base = parseDelegationPokerBase({
  players: [{ id: 'claude', name: 'Claude' }],
  decisions: [{ id: 'deps', name: 'Adding a dependency', cards: [{ player: 'claude', level: 5 }] }],
});

const controller = () => new DraftController({ definition, base, storage: null });

describe('delegation poker draft', () => {
  it('keeps only the last card the reader played on a decision area', () => {
    const c = controller();
    c.dispatch(delegationPokerAction.playCard('deps', 3));
    c.dispatch(delegationPokerAction.playCard('deps', 6));
    expect(c.actions.map((action) => action.payload)).toEqual([{ level: 6 }]);
  });

  it('cancels a decision area added, played and then deleted', () => {
    const c = controller();
    c.dispatch(delegationPokerAction.addDecision('hiring', 'Hiring'));
    c.dispatch(delegationPokerAction.playCard('hiring', 2));
    c.dispatch(delegationPokerAction.deleteDecision('hiring'));
    expect(c.actions).toEqual([]);
  });
});
