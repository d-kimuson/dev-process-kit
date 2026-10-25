import { describe, expect, it } from 'vitest';

import { pageKeysOf, pageNavigation, pagePatchFor } from './navigation';

const pages = new Set(['scope', 'domain']);

describe('page navigation', () => {
  it('reads one page out of the app hash', () => {
    const navigation = { page: 'domain', 'scope.activity': 'signup', 'domain.event': 'paid' };
    expect(pageNavigation(navigation, 'scope')).toEqual({ activity: 'signup' });
    expect(pageNavigation(navigation, 'domain')).toEqual({ event: 'paid' });
    expect(pageKeysOf('scope', { activity: 'signup' })).toEqual({ 'scope.activity': 'signup' });
  });

  it("patches a page's keys with the page's own hierarchy", () => {
    const navigation = { 'scope.activity': 'a', 'scope.story': 's', 'scope.step': 'x', 'domain.event': 'e' };
    expect(pagePatchFor(navigation, 'scope', { story: 't' }, pages, ['activity', 'story', 'step'])).toEqual({
      'scope.activity': 'a',
      'scope.story': 't',
      'scope.step': null,
    });
  });

  it('lets the page key and other pages’ keys through untouched', () => {
    expect(pagePatchFor({}, 'domain', { page: 'scope', 'scope.activity': 'signup' }, pages)).toEqual({
      page: 'scope',
      'scope.activity': 'signup',
    });
  });
});
