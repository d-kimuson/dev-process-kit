// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { composedAncestors, queryAllDeep } from './deep';

const host = (inner: string, shadow: string): HTMLElement => {
  const element = document.createElement('div');
  element.innerHTML = inner;
  element.attachShadow({ mode: 'open' }).innerHTML = shadow;
  return element;
};

describe('queryAllDeep', () => {
  it('finds matches in light DOM and in every open shadow root below it, in tree order', () => {
    const outer = host('<p data-x="light"></p>', '<section data-x="shadow"><div class="inner"></div></section>');
    const inner = outer.shadowRoot?.querySelector('.inner');
    if (inner) inner.attachShadow({ mode: 'open' }).innerHTML = '<i data-x="nested"></i>';
    expect(queryAllDeep(outer, '[data-x]').map((element) => element.getAttribute('data-x'))).toEqual([
      'light',
      'shadow',
      'nested',
    ]);
  });
});

describe('composedAncestors', () => {
  it('climbs out of shadow roots up to, but not including, the stop element', () => {
    const outer = host('', '<section><b></b></section>');
    document.body.append(outer);
    const leaf = outer.shadowRoot?.querySelector('b');
    if (!leaf) throw new Error('missing leaf');
    expect(composedAncestors(leaf, outer).map((element) => element.tagName)).toEqual(['SECTION']);
    outer.remove();
  });
});
