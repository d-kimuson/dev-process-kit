import { defineEventStormingElement } from './event-storming';
import { defineExampleMappingElement } from './example-mapping';
import { defineGrillElement } from './grill';
import { definePlainElement } from './plain';
import { definePrototypeElement } from './prototype';
import { defineSlidesElement } from './slides';
import { defineUsmElement } from './usm';

/**
 * Template registry.
 *
 * Registers every template element (the all-in-one `index.js` entry uses it).
 * Each template also ships as its own entry, `templates/<name>.js`; adding a
 * template means adding its element definition here and its entry to
 * `ENTRIES` in `vite.config.ts` (and `exports` in `package.json`).
 */
export const registerTemplateElements = (): void => {
  definePrototypeElement();
  defineUsmElement();
  defineEventStormingElement();
  defineExampleMappingElement();
  defineGrillElement();
  definePlainElement();
  defineSlidesElement();
};
