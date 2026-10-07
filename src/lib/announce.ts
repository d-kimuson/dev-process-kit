/**
 * Publishes the identity of the module that was loaded on `window`.
 *
 * Each entry registers a different set of elements, so "which template is available?" and
 * "which version is this?" are questions a page can only answer after the fact; this is the
 * answer. `versionParam` names the query parameter that switches the page to another version;
 * its presence also tells an older or newer version's loader that this one renders its own
 * version select. The values are passed in rather than imported: `lib` depends on nothing,
 * the callers read them from `core`.
 */
export const announce = (version: string, templates: readonly string[], versionParam: string): void => {
  if (typeof window === 'undefined') return;
  Object.assign(window, { devProcessKit: { version, templates, versionParam } });
};
