import { describe, expect, it } from 'vitest';

import { controlAtom } from './controls';

/**
 * `controlAtom` is pure CSS, so the only thing worth guarding at this layer is
 * that each class a control is built from is still declared in the
 * stylesheet — a cheap trip wire against a typo or an accidental deletion
 * while editing the sheet. Real rendering is verified in the browser via the
 * sample catalog (see `sample/index.html`).
 */
describe('controlAtom', () => {
  const css = controlAtom.cssText;

  it('declares the form control atoms (input, textarea, select) and their states', () => {
    expect(css).toContain('.dpk-input');
    expect(css).toContain('.dpk-textarea');
    expect(css).toContain('.dpk-select');
    expect(css).toContain('.dpk-input, .dpk-textarea)::placeholder');
  });
});
