import { describe, expect, it, vi } from 'vitest';

import { claimSelectionBar, releaseSelectionBar, type SelectionBarClaim } from './coordinator';

const claimOf = (hide: () => void): SelectionBarClaim => ({ hide });

describe('claimSelectionBar', () => {
  it('leaves the first claim alone until a second one arrives', () => {
    const hide = vi.fn();
    claimSelectionBar(claimOf(hide));
    expect(hide).not.toHaveBeenCalled();
  });

  it('hides the previous claim when a new one arrives (most recent wins)', () => {
    const hideFirst = vi.fn();
    const hideSecond = vi.fn();
    claimSelectionBar(claimOf(hideFirst));
    claimSelectionBar(claimOf(hideSecond));
    expect(hideFirst).toHaveBeenCalledOnce();
    expect(hideSecond).not.toHaveBeenCalled();
  });

  it('claiming the same claim again does not hide it', () => {
    const hide = vi.fn();
    const claim = claimOf(hide);
    claimSelectionBar(claim);
    claimSelectionBar(claim);
    expect(hide).not.toHaveBeenCalled();
  });
});

describe('releaseSelectionBar', () => {
  it('releasing the current claim lets a future claim leave it alone (it is already gone)', () => {
    const hide = vi.fn();
    const claim = claimOf(hide);
    claimSelectionBar(claim);
    releaseSelectionBar(claim);
    claimSelectionBar(claimOf(vi.fn()));
    expect(hide).not.toHaveBeenCalled();
  });

  it('releasing a claim that was already superseded does not disturb the current one', () => {
    const hideFirst = vi.fn();
    const hideSecond = vi.fn();
    const first = claimOf(hideFirst);
    const second = claimOf(hideSecond);
    claimSelectionBar(first);
    claimSelectionBar(second);
    // `first` was already superseded (and hidden); releasing it late must not clear `second`.
    releaseSelectionBar(first);
    claimSelectionBar(claimOf(vi.fn()));
    expect(hideSecond).toHaveBeenCalledOnce();
  });
});
