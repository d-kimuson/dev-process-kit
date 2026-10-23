export { DpkCode, trimBlock } from './element';
export { codeMessages } from './messages';
export type { CodeMessages } from './messages';

import { DpkCode } from './element';

export const defineCode = (): void => {
  if (!customElements.get('dpk-code')) customElements.define('dpk-code', DpkCode);
};
