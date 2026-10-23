export { DpkSelect } from './element';
export { parseSelectData } from './model';
export type { SelectOption } from './model';

import { DpkSelect } from './element';

export const defineSelect = (): void => {
  if (!customElements.get('dpk-select')) customElements.define('dpk-select', DpkSelect);
};
