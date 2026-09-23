/**
 * Publishes the identity of the module that was loaded on `window`.
 *
 * Each entry registers a different set of elements, so "which template is available?" and
 * "which version is this?" are questions a page can only answer after the fact; this is the
 * answer. The version is passed in rather than imported: `lib` depends on nothing, the
 * callers (`src/index.ts` and `src/entries/*`) read it from `core`.
 */
export const announce = (version: string, templates: readonly string[]): void => {
  if (typeof window === 'undefined') return;
  Object.assign(window, { artifactFramework: { version, templates } });
};
