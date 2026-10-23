export { DpkTagFilter } from './element';
export { parseTagFilterData } from './model';
export type { TagFilterOption } from './model';

import { DpkTagFilter } from './element';

export const defineTagFilter = (): void => {
  if (!customElements.get('dpk-tag-filter')) customElements.define('dpk-tag-filter', DpkTagFilter);
};
