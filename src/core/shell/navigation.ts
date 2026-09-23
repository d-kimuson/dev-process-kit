/**
 * URL-hash plumbing for the template shell.
 *
 * Navigation is the URL hash and is deliberately separate from draft actions:
 * selecting a step is not a change to the page. The element owns the
 * in-memory `Navigation`; these helpers only read and write the browser state.
 */
import type { Navigation } from '../types';

import { formatHash, parseHash } from '../navigation';

/** Reads the current hash, tolerating non-browser environments. */
export const readNavigationFromHash = (): Navigation => {
  return parseHash(typeof location === 'undefined' ? '' : location.hash);
};

/** Writes the canonical hash back, without pushing a history entry when unchanged. */
export const writeNavigationToUrl = (navigation: Navigation, replace: boolean): void => {
  if (typeof history === 'undefined') return;
  const url = `${location.pathname}${location.search}${formatHash(navigation)}`;
  if (`${location.pathname}${location.search}${location.hash}` === url) return;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
};
