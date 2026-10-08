import type { Navigation } from '../../core/types';

/**
 * How the reader goes through the prototype:
 *
 * - `scenario` follows one user story step by step (Activity › UserStory › Step);
 * - `app` uses the UI as one app, whatever the scenario: the sidebar lists the
 *   app's screens, and the reader moves around through the mock's own links.
 *
 * It is navigation, not a draft action: `view=app` in the hash, absent for the
 * default, so a link to the app view can be shared like any other place.
 */
export const PROTOTYPE_VIEWS = ['scenario', 'app'] as const;
export type PrototypeView = (typeof PROTOTYPE_VIEWS)[number];

export const VIEW_KEY = 'view';

export const prototypeViewOf = (nav: Navigation): PrototypeView => (nav[VIEW_KEY] === 'app' ? 'app' : 'scenario');

/** The navigation patch that switches to `view`; the default leaves the hash. */
export const viewPatch = (view: PrototypeView): Readonly<Record<string, string | null>> => ({
  [VIEW_KEY]: view === 'app' ? 'app' : null,
});
