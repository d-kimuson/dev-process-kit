import { describe, expect, it } from 'vitest';

import { formatHash, parseHash, patchNavigation } from './navigation';

describe('hash navigation', () => {
  it('parses and serializes the navigation', () => {
    expect(parseHash('#activity=signup&story=register&step=google-auth')).toEqual({
      activity: 'signup',
      story: 'register',
      step: 'google-auth',
    });
    expect(parseHash('')).toEqual({});
    expect(parseHash('#')).toEqual({});
    expect(formatHash({ step: 'b', activity: 'a' })).toBe('#activity=a&step=b');
    expect(formatHash({})).toBe('');
  });

  it('ignores empty values so the URL never carries junk', () => {
    expect(parseHash('#a=&b=1')).toEqual({ b: '1' });
    expect(formatHash({ a: '', b: '1' })).toBe('#b=1');
  });

  it('patches navigation and removes keys with null', () => {
    expect(patchNavigation({ a: '1', b: '2' }, { b: null, c: '3' })).toEqual({
      a: '1',
      c: '3',
    });
  });

  it('round-trips', () => {
    const navigation = { activity: 'a b', step: 'x/y' };
    expect(parseHash(formatHash(navigation))).toEqual(navigation);
  });
});
