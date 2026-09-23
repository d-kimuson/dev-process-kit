import { defineEventStormingElement } from './event-storming';
import { defineExampleMappingElement } from './example-mapping';
import { defineGrillElement } from './grill';
import { definePlainElement } from './plain';
import { definePrototypeElement } from './prototype';
import { defineUsmElement } from './usm';

/**
 * Template registry.
 *
 * Templates are conceptual packages, not separate bundles (design §6): the
 * shipped URL is one pinned, build-free ESM file. Adding a template means
 * adding its element definition here.
 */
export const registerTemplateElements = (): void => {
  definePrototypeElement();
  defineUsmElement();
  defineEventStormingElement();
  defineExampleMappingElement();
  defineGrillElement();
  definePlainElement();
};
