import { describe, expect, it } from 'vitest';

import { boardNavigation, pageKeysOf, pagePatchFor } from './navigation';

const boards = new Set(['scope', 'domain']);

describe('page navigation', () => {
  it('reads one board out of the page hash', () => {
    const navigation = { board: 'domain', 'scope.activity': 'signup', 'domain.event': 'paid' };
    expect(boardNavigation(navigation, 'scope')).toEqual({ activity: 'signup' });
    expect(boardNavigation(navigation, 'domain')).toEqual({ event: 'paid' });
    expect(pageKeysOf('scope', { activity: 'signup' })).toEqual({ 'scope.activity': 'signup' });
  });

  it("patches a board's keys with the board's own hierarchy", () => {
    const navigation = { 'scope.activity': 'a', 'scope.story': 's', 'scope.step': 'x', 'domain.event': 'e' };
    expect(pagePatchFor(navigation, 'scope', { story: 't' }, boards, ['activity', 'story', 'step'])).toEqual({
      'scope.activity': 'a',
      'scope.story': 't',
      'scope.step': null,
    });
  });

  it('lets the board key and other boards’ keys through untouched', () => {
    expect(pagePatchFor({}, 'domain', { board: 'scope', 'scope.activity': 'signup' }, boards)).toEqual({
      board: 'scope',
      'scope.activity': 'signup',
    });
  });
});
