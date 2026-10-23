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
 * Also registers `<dpk-page>`, exactly as every template entry does (`register`,
 * below): `dpk-event-storming`, `dpk-example-mapping` and `dpk-whiteboard` can be a
 * page's board on their own (`docs/components/diagrams.md`, Board hosting), with no
 * template entry loaded at all, so this entry carries the page host too.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `components.js`.
 */
import { registerComponentElements } from '../components/index';
import { startEntry } from '../core/version-loader';
import { definePageElement } from '../page/index';

export * from '../core/index';
export * from '../components/index';

startEntry({
  entry: 'components.js',
  url: import.meta.url,
  templates: [],
  register: () => {
    registerComponentElements();
    definePageElement();
  },
});
