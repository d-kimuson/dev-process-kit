// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { findLocated, locateElement, pickableElement } from './locator';

const container = (markup: string): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = markup;
  return root;
};

describe('locateElement', () => {
  it('names an element by the shortest selector that matches it alone, with its text', () => {
    const root = container(`
      <nav class="side"><a href="#a">Orders</a><a href="#b">Refunds <span>3</span></a></nav>
      <main><button class="btn primary big">Save</button></main>`);
    const refunds = root.querySelectorAll('a')[1]!;
    const location = locateElement(refunds, root);
    expect(location).toEqual({ selector: 'a:nth-of-type(2)', tag: 'a', text: 'Refunds 3' });
    expect(findLocated(root, location.selector)).toBe(refunds);

    const save = root.querySelector('button')!;
    expect(locateElement(save, root)).toEqual({ selector: 'button.btn.primary', tag: 'button', text: 'Save' });
  });

  it('climbs until the chain is unique, and stops at an id', () => {
    const root = container(`
      <section><ul><li>One</li><li>Two</li></ul></section>
      <section id="other"><ul><li>One</li><li>Two</li></ul></section>`);
    const second = root.querySelectorAll('li')[1]!;
    const location = locateElement(second, root);
    expect(location.selector).toBe('section:nth-of-type(1) > ul > li:nth-of-type(2)');
    expect(findLocated(root, location.selector)).toBe(second);
    const inOther = root.querySelectorAll('li')[3]!;
    expect(locateElement(inOther, root).selector).toBe('#other > ul > li:nth-of-type(2)');
  });

  it('reads what a field or an image says, and shortens long text', () => {
    const root = container(`
      <input placeholder="Order number"><img alt="Logo" src="x.png">
      <p>${'long '.repeat(20)}</p>`);
    expect(locateElement(root.querySelector('input')!, root).text).toBe('Order number');
    expect(locateElement(root.querySelector('img')!, root).text).toBe('Logo');
    const text = locateElement(root.querySelector('p')!, root).text!;
    expect(Array.from(text)).toHaveLength(41);
    expect(text.endsWith('…')).toBe(true);
  });

  it('returns no element for a selector the markup no longer has, or an invalid one', () => {
    const root = container('<p>Hi</p>');
    expect(findLocated(root, 'button.gone')).toBeNull();
    expect(findLocated(root, 'p[[')).toBeNull();
  });
});

describe('pickableElement', () => {
  it('takes a click on the inside of a control as a click on the control', () => {
    const root = container('<button><svg><path></path></svg> Send</button><p><b>Note</b></p>');
    expect(pickableElement(root.querySelector('path')!, root)).toBe(root.querySelector('button'));
    expect(pickableElement(root.querySelector('b')!, root)).toBe(root.querySelector('b'));
  });
});
