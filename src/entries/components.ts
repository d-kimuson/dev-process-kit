/**
 * `components.js` — the built-in components without a view or a board.
 *
 * Load this when the document uses the framework's components directly (the
 * review rail, inline editing) without one of the shipped views or boards, or
 * when it uses them next to its own element.
 *
 * The exports are the whole component contract plus the core API. A document
 * that uses one view should load that view's entry instead: it carries the
 * same core API for less.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as
 * `components.js`.
 */
import { defineAppElement } from '../app/index';
import { registerComponentElements } from '../components/index';
import { startEntry } from '../core/version-loader';
import { definePageElement } from '../page/index';

export * from '../core/index';
export * from '../components/index';

startEntry({
  entry: 'components.js',
  url: import.meta.url,
  views: [],
  register: () => {
    registerComponentElements();
    defineAppElement();
    definePageElement();
  },
});
