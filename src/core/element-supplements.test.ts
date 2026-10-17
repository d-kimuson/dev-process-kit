// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DpkTemplatePlain } from '../templates/plain/element';

import { coreMessages } from './messages';
import '../index';

const messages = coreMessages('en');

const mount = (supplements = ''): DpkTemplatePlain => {
  document.body.innerHTML = `
    <dpk-template-plain storage="memory">
      <script type="application/json">${JSON.stringify({ title: 'Cancel orders' })}</script>
      <section slot="main"><p>Body</p></section>
      ${supplements}
    </dpk-template-plain>`;
  const element = document.querySelector('dpk-template-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkTemplatePlain;
};

const settle = async (element: DpkTemplatePlain): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

const root = (element: DpkTemplatePlain): ShadowRoot => {
  if (!element.shadowRoot) throw new Error('no shadow root');
  return element.shadowRoot;
};

const tabs = (element: DpkTemplatePlain): HTMLButtonElement[] => [
  ...root(element).querySelectorAll<HTMLButtonElement>('.dpk-supplement-tab'),
];

const body = (element: DpkTemplatePlain): HTMLElement | null =>
  root(element).querySelector<HTMLElement>('.dpk-supplements-body');

const THREE = `
  <section slot="supplement" data-name="ERD">erd</section>
  <section slot="supplement" data-name="Checklist">checklist</section>
  <section slot="supplement" data-name="Sequence">sequence</section>`;

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('supplements at the bottom of the main column', () => {
  it('renders no bar when the author slots no supplement', async () => {
    const element = mount();
    await settle(element);
    expect(root(element).querySelector('.dpk-supplements')?.hasAttribute('hidden')).toBe(true);
  });

  it('lines the supplements up by name, in the order written, all folded', async () => {
    const element = mount(THREE);
    await settle(element);
    expect(root(element).querySelector('.dpk-supplements')?.hasAttribute('hidden')).toBe(false);
    expect(tabs(element).map((tab) => tab.textContent?.trim())).toEqual(['ERD', 'Checklist', 'Sequence']);
    expect(tabs(element).map((tab) => tab.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false']);
    expect(body(element)?.hasAttribute('hidden')).toBe(true);
    expect(root(element).querySelector('.dpk-supplements-bar')?.getAttribute('aria-label')).toBe(messages.supplements);
  });

  it('names a supplement without a name after the memo it used to be', async () => {
    const element = mount('<div slot="supplement">premise</div>');
    await settle(element);
    expect(tabs(element).map((tab) => tab.textContent?.trim())).toEqual([messages.memo]);
  });

  it('opens the pressed supplement alone, switches to another, and folds when pressed again', async () => {
    const element = mount(THREE);
    await settle(element);
    tabs(element)[1]?.click();
    await settle(element);
    expect(tabs(element).map((tab) => tab.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false']);
    expect(body(element)?.hasAttribute('hidden')).toBe(false);
    // Only the open one shows; the light DOM is the author's and is left as written.
    const checklist = element.querySelector('[data-name="Checklist"]');
    const position = [...element.children].indexOf(checklist as Element) + 1;
    expect(body(element)?.querySelector('style')?.textContent).toContain(`:nth-child(${position})`);
    expect(checklist?.getAttribute('slot')).toBe('supplement');

    tabs(element)[2]?.click();
    await settle(element);
    expect(tabs(element).map((tab) => tab.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'true']);

    tabs(element)[2]?.click();
    await settle(element);
    expect(tabs(element).map((tab) => tab.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false']);
    expect(body(element)?.hasAttribute('hidden')).toBe(true);
  });

  it('folds and reopens from the chevron, coming back to the supplement last opened', async () => {
    const element = mount(THREE);
    await settle(element);
    const chevron = (): HTMLButtonElement | null =>
      root(element).querySelector<HTMLButtonElement>('.dpk-supplements-toggle');
    expect(chevron()?.getAttribute('aria-expanded')).toBe('false');
    expect(chevron()?.getAttribute('aria-label')).toBe(messages.openSupplements);

    // Closed with nothing opened yet, it opens the first.
    chevron()?.click();
    await settle(element);
    expect(tabs(element).map((tab) => tab.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false']);

    tabs(element)[2]?.click();
    await settle(element);
    expect(chevron()?.getAttribute('aria-expanded')).toBe('true');
    expect(chevron()?.getAttribute('aria-label')).toBe(messages.closeSupplements);
    chevron()?.click();
    await settle(element);
    expect(body(element)?.hasAttribute('hidden')).toBe(true);
    expect(tabs(element).map((tab) => tab.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false']);

    chevron()?.click();
    await settle(element);
    expect(tabs(element).map((tab) => tab.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'true']);
  });

  it('follows supplements the author adds later', async () => {
    const element = mount(THREE);
    await settle(element);
    const added = document.createElement('section');
    added.slot = 'supplement';
    added.dataset['name'] = 'Glossary';
    element.append(added);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(element);
    expect(tabs(element).map((tab) => tab.textContent?.trim())).toEqual(['ERD', 'Checklist', 'Sequence', 'Glossary']);
  });

  it('warns about the memo slot it replaced', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const element = mount('<div slot="memo">premise</div>');
    await settle(element);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('slot="supplement"'));
    expect(root(element).querySelector('.dpk-supplements')?.hasAttribute('hidden')).toBe(true);
  });
});
