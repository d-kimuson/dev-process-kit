export { DpkComponentFormalSpec } from './element';
export { formalSpecMessages } from './messages';
export type { FormalSpecMessages } from './messages';
export { emptyFormalSpecData, parseFormalSpecData } from './model';
export type { Assurance, Claim, Clause, FormalSpecData, Inline, RichText, Term } from './model';

import { DpkComponentFormalSpec } from './element';

export const defineFormalSpec = (): void => {
  if (!customElements.get('dpk-component-formal-spec'))
    customElements.define('dpk-component-formal-spec', DpkComponentFormalSpec);
};
