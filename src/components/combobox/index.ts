export { DpkCombobox } from './element';
export { parseComboboxData } from './model';
export type { ComboboxOption } from './model';

import { DpkCombobox } from './element';

export const defineCombobox = (): void => {
  if (!customElements.get('dpk-combobox')) customElements.define('dpk-combobox', DpkCombobox);
};
