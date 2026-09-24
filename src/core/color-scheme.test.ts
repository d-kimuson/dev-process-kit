import { describe, expect, it } from 'vitest';

import { parseColorScheme, resolveColorScheme, toggledPreference } from './color-scheme';

describe('parseColorScheme', () => {
  it('accepts only light and dark', () => {
    expect(parseColorScheme('light')).toBe('light');
    expect(parseColorScheme('dark')).toBe('dark');
    expect(parseColorScheme('auto')).toBeNull();
    expect(parseColorScheme(null)).toBeNull();
    expect(parseColorScheme(1)).toBeNull();
  });
});

describe('resolveColorScheme', () => {
  it('follows the environment when nothing is chosen', () => {
    expect(resolveColorScheme({ preference: null, authored: null, environment: 'dark' })).toBe('dark');
  });

  it('lets the author fix the default', () => {
    expect(resolveColorScheme({ preference: null, authored: 'light', environment: 'dark' })).toBe('light');
  });

  it("puts the reader's own choice above everything", () => {
    expect(resolveColorScheme({ preference: 'dark', authored: 'light', environment: 'light' })).toBe('dark');
  });
});

describe('toggledPreference', () => {
  it('stores the opposite of what is shown', () => {
    expect(toggledPreference({ preference: null, authored: null, environment: 'light' })).toBe('dark');
  });

  it('forgets the choice when toggling back to the default, so the page follows the environment again', () => {
    expect(toggledPreference({ preference: 'dark', authored: null, environment: 'light' })).toBeNull();
  });

  it('treats the authored scheme as the default to fall back to', () => {
    expect(toggledPreference({ preference: 'light', authored: 'dark', environment: 'light' })).toBeNull();
    expect(toggledPreference({ preference: null, authored: 'dark', environment: 'dark' })).toBe('light');
  });
});
