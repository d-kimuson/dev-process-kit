// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { clickElements, fillFields } from './fill';

const form = (): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = `
    <input name="email" />
    <textarea name="body"></textarea>
    <select name="topic"><option value="a">A</option><option value="b">B</option></select>
    <input type="checkbox" name="agree" />
    <input type="radio" name="plan" value="free" checked />
    <input type="radio" name="plan" value="pro" />
    <output class="total">0</output>
    <button type="button" class="go">Go</button>`;
  return root;
};

const heard = (root: HTMLElement): string[] => {
  const events: string[] = [];
  for (const type of ['input', 'change']) {
    root.addEventListener(type, (event) => events.push(`${type}:${(event.target as Element).getAttribute('name')}`));
  }
  return events;
};

describe('fillFields', () => {
  it('sets each field as typing would, and tells the page it changed', () => {
    const root = form();
    const events = heard(root);
    const missed = fillFields(root, {
      '[name="email"]': 'hanako@example.com',
      '[name="body"]': 'Hello',
      '[name="topic"]': 'b',
      '[name="agree"]': true,
    });
    expect(missed).toEqual([]);
    expect(root.querySelector<HTMLInputElement>('[name="email"]')!.value).toBe('hanako@example.com');
    expect(root.querySelector<HTMLTextAreaElement>('[name="body"]')!.value).toBe('Hello');
    expect(root.querySelector<HTMLSelectElement>('[name="topic"]')!.value).toBe('b');
    expect(root.querySelector<HTMLInputElement>('[name="agree"]')!.checked).toBe(true);
    expect(events).toEqual([
      'input:email',
      'change:email',
      'input:body',
      'change:body',
      'input:topic',
      'change:topic',
      'input:agree',
      'change:agree',
    ]);
  });

  it('picks the radio whose value is given, and unchecks a box given false', () => {
    const root = form();
    root.querySelector<HTMLInputElement>('[name="agree"]')!.checked = true;
    fillFields(root, { '[name="plan"]': 'pro', '[name="agree"]': false });
    expect(root.querySelector<HTMLInputElement>('[value="pro"]')!.checked).toBe(true);
    expect(root.querySelector<HTMLInputElement>('[value="free"]')!.checked).toBe(false);
    expect(root.querySelector<HTMLInputElement>('[name="agree"]')!.checked).toBe(false);
  });

  it('writes the text of an element that is not a field', () => {
    const root = form();
    fillFields(root, { '.total': '¥3,980' });
    expect(root.querySelector('.total')!.textContent).toBe('¥3,980');
  });

  it('reports the selectors that matched nothing, an invalid one included', () => {
    const root = form();
    expect(fillFields(root, { '[name="nope"]': 'x', '[[': 'x', '[name="email"]': 'ok' })).toEqual([
      '[name="nope"]',
      '[[',
    ]);
    expect(root.querySelector<HTMLInputElement>('[name="email"]')!.value).toBe('ok');
  });
});

describe('clickElements', () => {
  it('clicks each element in order and reports the ones it could not find', () => {
    const root = form();
    const clicks: string[] = [];
    root.addEventListener('click', (event) => clicks.push((event.target as Element).className));
    expect(clickElements(root, ['.go', '.missing', '.go'])).toEqual(['.missing']);
    expect(clicks).toEqual(['go', 'go']);
  });
});
