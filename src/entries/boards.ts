/**
 * `boards.js` — every board element in one entry.
 *
 * Boards are the visual surfaces that can be embedded in a view or stand
 * alone as a page's content: ER, state, sequence, dependency, architecture,
 * mind map, kanban, event storming, example mapping and whiteboard.
 *
 * `ENTRIES` in `vite.config.ts` is what publishes this file as `boards.js`.
 */
import { defineAppElement } from '../app/index';
import { registerBoardElements } from '../boards/index';
import { registerComponentElements } from '../components/index';
import { startEntry } from '../core/version-loader';
import { definePageElement } from '../page/index';

export * from '../core/index';
export * from '../boards/index';

startEntry({
  entry: 'boards.js',
  url: import.meta.url,
  views: [],
  register: () => {
    registerComponentElements();
    registerBoardElements();
    defineAppElement();
    definePageElement();
  },
});
