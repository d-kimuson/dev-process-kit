/**
 * At most one selection bar is shown at a time, across every board or
 * component on the page: claiming the portal hides whoever held it before
 * (not shown ≠ cleared — the pre-empted claimant's own selection stays
 * exactly as it was, only its bar hides). The most recently claimed bar wins.
 */
export type SelectionBarClaim = {
  readonly hide: () => void;
};

let current: SelectionBarClaim | null = null;

export const claimSelectionBar = (claim: SelectionBarClaim): void => {
  if (current !== null && current !== claim) current.hide();
  current = claim;
};

/** A no-op unless `claim` is still the current one (an already-superseded claim releasing late must not disturb it). */
export const releaseSelectionBar = (claim: SelectionBarClaim): void => {
  if (current === claim) current = null;
};
