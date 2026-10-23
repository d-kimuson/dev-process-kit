/**
 * Resolves another template's entry from the one that is already running: the
 * per-template distribution ([ADR](../../../dev-docs/adr/20260920_per-template-entries.md))
 * publishes every entry of one version as a sibling under the same `dist/`
 * directory, so a page that loaded `templates/event-storming.js` can still
 * reach `templates/usm.js` by URL — in dev, across origins, and pinned to an
 * exact version on jsDelivr alike — without guessing the layout or loading
 * `index.js` up front.
 */

/** The sibling entry's URL, resolved against the running entry's own; `null` without one to resolve against. */
export const siblingEntryUrl = (template: string, entryUrl: string | null): string | null => {
  if (entryUrl === null) return null;
  try {
    return new URL(`./${template}.js`, entryUrl).href;
  } catch {
    return null;
  }
};
