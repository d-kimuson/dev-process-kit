/**
 * Publishes the identity of the module that was loaded on `window`.
 *
 * Each entry registers a different set of elements, so "which template is available?" and
 * "which version is this?" are questions a page can only answer after the fact; this is the
 * answer. `versionParam` names the query parameter that switches the page to another version;
 * its presence also tells an older or newer version's loader that this one renders its own
 * version select. `entryUrl` is the entry's own resolved URL (`import.meta.url`, captured where
 * the entry is evaluated): a sibling entry of the same version sits next to it, so a page that
 * loaded one template's entry can still reach another's by URL, not by guessing a layout. The
 * values are passed in rather than imported: `lib` depends on nothing, the callers read them
 * from `core`.
 *
 * A page can load several entries (`templates/prototype.js` next to `components.js`, to use
 * the shared components directly): each entry announces itself in turn, so later calls merge
 * into the earlier ones rather than replace them. `templates` accumulates (an entry naming none,
 * like `components.js`, adds nothing); `entryUrl` keeps naming an entry that has templates once
 * one has announced, since that is the one a sibling template entry resolves against — an entry
 * with none is never "the one running the page" for that purpose.
 */
export type Announcement = {
  readonly version: string;
  readonly templates: readonly string[];
  readonly versionParam: string;
  readonly entryUrl: string;
};

export const announce = (
  version: string,
  templates: readonly string[],
  versionParam: string,
  entryUrl: string,
): void => {
  if (typeof window === 'undefined') return;
  const previous: unknown = Reflect.get(window, 'devProcessKit');
  const merged: Announcement =
    isAnnouncement(previous) && previous.templates.length > 0 && templates.length === 0
      ? { version, templates: previous.templates, versionParam, entryUrl: previous.entryUrl }
      : {
          version,
          templates: isAnnouncement(previous) ? [...new Set([...previous.templates, ...templates])] : templates,
          versionParam,
          entryUrl,
        };
  Object.assign(window, { devProcessKit: merged });
};

const isAnnouncement = (value: unknown): value is Announcement =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'entryUrl') === 'string' &&
  Array.isArray(Reflect.get(value, 'templates'));

/** The URL of the entry that is running the page, for importing one of its siblings; `null` before `announce` ran. */
export const announcedEntryUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const value: unknown = Reflect.get(window, 'devProcessKit');
  return isAnnouncement(value) ? value.entryUrl : null;
};
