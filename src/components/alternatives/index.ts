export { DpkAlternatives } from './element';
export { alternativesMessages } from './messages';
export type { AlternativesMessages } from './messages';
export { ALTERNATIVE_STATUSES, emptyAlternativesData, parseAlternativesData } from './model';
export type { AlternativeOption, AlternativeStatus, AlternativesData } from './model';
export { presentAlternative, presentAlternatives, presentStatus } from './present';
export type { AlternativeView } from './present';
export { alternativesStyles } from './styles';

import { DpkAlternatives } from './element';

export const defineAlternatives = (): void => {
  if (!customElements.get('dpk-alternatives')) customElements.define('dpk-alternatives', DpkAlternatives);
};
