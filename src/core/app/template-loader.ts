/**
 * Resolves another entry from the one that is already running: the
 * per-template distribution ([ADR](../../../dev-docs/adr/20260920_per-template-entries.md))
 * publishes every entry of one version under the same `dist/` directory — the
 * views under `views/`, `boards.js`, `components.js` and `index.js` at its
 * root — so a page that loaded `views/usm.js` can still reach `views/plain.js`
 * or `boards.js` by URL, in dev across origins and pinned to an exact version
 * on jsDelivr alike, without guessing the layout or loading `index.js` up
 * front.
 */

/** The `dist/` root the announced entry sits in, whatever entry it is. */
const distRoot = (entryUrl: string): URL | null => {
  try {
    const url = new URL(entryUrl);
    const segments = url.pathname.split('/');
    segments.pop();
    // The view entries are one level down; `boards.js` and the rest are at the root.
    if (segments.at(-1) === 'views') segments.pop();
    // Resolved against the entry's own URL, not its origin: a `file:` URL has no origin.
    return new URL(`${segments.join('/')}/`, url);
  } catch {
    return null;
  }
};

/** One entry's URL, from any other entry of the same version; `null` without one to resolve against. */
const entryUrlFor = (path: string, entryUrl: string | null): string | null => {
  if (entryUrl === null) return null;
  const root = distRoot(entryUrl);
  if (root === null) return null;
  try {
    return new URL(path, root).href;
  } catch {
    return null;
  }
};

/** A view's own entry (`views/<name>.js`), from the entry that is running. */
export const siblingEntryUrl = (view: string, entryUrl: string | null): string | null =>
  entryUrlFor(`views/${view}.js`, entryUrl);

/** The one entry that carries every board (`boards.js`), from the entry that is running. */
export const boardEntryUrl = (entryUrl: string | null): string | null => entryUrlFor('boards.js', entryUrl);
