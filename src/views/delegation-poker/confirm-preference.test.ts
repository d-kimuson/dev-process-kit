import { afterEach, describe, expect, it } from 'vitest';

import { skipConfirmPreference } from './confirm-preference';

afterEach(() => localStorage.clear());

describe('skip-confirm preference', () => {
  it('remembers the opt-out across pages when persistent', () => {
    expect(skipConfirmPreference(true).read()).toBe(false);
    expect(skipConfirmPreference(true).remember()).toBe(true);
    expect(skipConfirmPreference(true).read()).toBe(true);
  });

  it('keeps the opt-out to one page load when not persistent', () => {
    const preference = skipConfirmPreference(false);
    preference.remember();
    expect(preference.read()).toBe(true);
    expect(skipConfirmPreference(true).read()).toBe(false);
  });
});
