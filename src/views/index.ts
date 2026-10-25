import { definePageElement } from '../page/index';
import { defineDelegationPokerElement } from './delegation-poker';
import { definePlainElement } from './plain';
import { definePrototypeElement } from './prototype';
import { defineSlidesElement } from './slides';
import { defineTaskBoardElement } from './task-board';
import { defineUsmElement } from './usm';

/**
 * Template registry.
 *
 * Registers every template element (the all-in-one `index.js` entry uses it).
 * Each template also ships as its own entry, `templates/<name>.js`; adding a
 * template means adding its element definition here and its entry to
 * `ENTRIES` in `vite.config.ts` (and `exports` in `package.json`).
 */
export const registerViewElements = (): void => {
  definePrototypeElement();
  defineUsmElement();
  definePlainElement();
  defineSlidesElement();
  defineTaskBoardElement();
  defineDelegationPokerElement();
  // A page of boards works with any of them.
  definePageElement();
};
