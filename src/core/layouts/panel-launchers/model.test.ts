import { describe, expect, it } from 'vitest';

import { fittingLaunchers } from './model';

describe('fittingLaunchers', () => {
  const widths = [40, 40, 100, 90];

  it('shows every button when all of them fit', () => {
    expect(fittingLaunchers({ widths, gap: 4, available: 282, menu: 30 })).toBe(4);
  });

  it('keeps the leading buttons that fit beside the menu button', () => {
    // 40 + 4 + 40 + 4 + 30 = 118 fits; one more button (104) does not.
    expect(fittingLaunchers({ widths, gap: 4, available: 200, menu: 30 })).toBe(2);
  });

  it('leaves only the menu button when no button fits beside it', () => {
    expect(fittingLaunchers({ widths, gap: 4, available: 50, menu: 30 })).toBe(0);
  });

  it('has nothing to fit without buttons', () => {
    expect(fittingLaunchers({ widths: [], gap: 4, available: 0, menu: 30 })).toBe(0);
  });
});
