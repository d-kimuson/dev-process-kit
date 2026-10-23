import { documentTokens } from '../../core/theme';
import { ensurePaperFont } from './mock';
import { atomStyles } from './styles';

export { atomStyles } from './styles';
export { cardAtom } from './card';
export { controlAtom } from './controls';
export { ensurePaperFont, mockAtom } from './mock';

const ADOPTED = Symbol.for('dev-process-kit:atom-styles');

/**
 * Applies the CSS atoms (and the tokens they read) to the document, once.
 *
 * Atoms style author-owned light DOM, so they belong to the document, not to a
 * shadow root. Inside a template the template's own tokens take over, so the
 * atoms follow its color scheme.
 */
export const defineAtomStyles = (): void => {
  if (typeof document === 'undefined' || Reflect.get(document, ADOPTED) === true) return;
  Reflect.set(document, ADOPTED, true);
  ensurePaperFont();
  const sheets = [documentTokens, atomStyles].flatMap((style) => (style.styleSheet ? [style.styleSheet] : []));
  if (sheets.length === 2) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, ...sheets];
    return;
  }
  const element = document.createElement('style');
  element.dataset['dpkAtoms'] = '';
  element.textContent = `${documentTokens.cssText}\n${atomStyles.cssText}`;
  document.head.append(element);
};
