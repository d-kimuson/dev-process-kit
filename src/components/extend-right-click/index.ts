export { DpkExtendRightClick } from './element';
export type { ExtendRightClickRunDetail } from './element';
export { DEFAULT_RUN_EVENT, parseExtendRightClickData } from './model';
export type {
  ExtendRightClickConfig,
  ExtendRightClickEntry,
  ExtendRightClickGroup,
  ExtendRightClickItem,
  ExtendRightClickSubmenu,
  ExtendRightClickTarget,
} from './model';

import { DpkExtendRightClick } from './element';

export const defineExtendRightClick = (): void => {
  if (!customElements.get('dpk-extend-right-click'))
    customElements.define('dpk-extend-right-click', DpkExtendRightClick);
};
