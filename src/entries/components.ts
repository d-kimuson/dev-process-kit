/**
 * `components.js` — the built-in elements without a template.
 *
 * Load this when the page uses the framework's components directly (the review rail,
 * inline editing, the diagram elements) without one of the shipped templates, or when
 * it uses them next to its own element.
 *
 * The exports are the whole component contract plus the core API, so the file is the
 * union of what the per-template entries ship. A page that uses one template should
 * load that template's entry instead: it carries the same core API for less.
 *
 * `RELEASE_ENTRIES` in `scripts/release.ts` is what publishes this file as
 * `components.js`.
 */
import { registerCoreElements } from '../components/index';
import { FRAMEWORK_VERSION } from '../core/index';
import { announce } from '../lib/announce';

export * from '../core/index';
export * from '../components/index';

registerCoreElements();
announce(FRAMEWORK_VERSION, []);
