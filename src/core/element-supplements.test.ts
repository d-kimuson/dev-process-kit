// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkViewPlain } from '../views/plain/element';

import { coreMessages } from './messages';
import { SUPPLEMENT_HEIGHT, supplementHeightMax } from './shell/supplement-height';
import '../index';

const messages = coreMessages('en');

const mount = (supplements = '', attributes = 'storage="memory"'): DpkViewPlain => {
  document.body.innerHTML = `
    <dpk-view-plain ${attributes}>
      <script type="application/json">${JSON.stringify({ title: 'Cancel orders' })}</script>
      <section slot="main"><p>Body</p></section>
      ${supplements}
    </dpk-view-plain>`;
  const element = document.querySelector('dpk-view-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkViewPlain;
};

const settle = async (element: DpkViewPlain): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

const root = (element: DpkViewPlain): ShadowRoot => {
  if (!element.shadowRoot) throw new Error('no shadow root');
  return element.shadowRoot;
};

const tabs = (element: DpkViewPlain): HTMLButtonElement[] => [
  ...root(element).querySelectorAll<HTMLButtonElement>('.dpk-supplement-tab'),
];

const body = (element: DpkViewPlain): HTMLElement | null =>
  root(element).querySelector<HTMLElement>('.dpk-supplements-body');

const drawer = (element: DpkViewPlain): HTMLElement | null =>
  root(element).querySelector<HTMLElement>('.dpk-supplements');

const edge = (element: DpkViewPlain): HTMLElement | null =>
  root(element).querySelector<HTMLElement>('.dpk-supplements-edge');

/** The height the drawer draws itself at, as the CSS custom property it publishes. */
const heightOf = (element: DpkViewPlain): string =>
  drawer(element)?.style.getPropertyValue('--dpk-supplement-height') ?? '';

const openTab = async (element: DpkViewPlain, index: number): Promise<void> => {
  tabs(element)[index]?.click();
  await settle(element);
};

const pointer = (target: HTMLElement, type: string, clientY: number): void => {
  target.dispatchEvent(new PointerEvent(type, { pointerId: 1, button: 0, clientY, bubbles: true, composed: true }));
};

const press = (target: HTMLElement, key: string, shiftKey = false): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, composed: true }));
};

const THREE = `
  <section slot="supplement" data-name="ERD">erd</section>
  <section slot="supplement" data-name="Checklist">checklist</section>
  <section slot="supplement" data-name="Sequence">sequence</section>`;

const tallest = (): number => supplementHeightMax(window.innerHeight);

beforeEach(() => {
  localStorage.clear();
  // jsdom has no pointer capture; every browser the kit targets does.
  if (!('setPointerCapture' in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: () => {} });
  }
});

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
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

describe('the supplement drawer height', () => {
  it('opens at one height for every tab, whatever the content', async () => {
    const element = mount(THREE);
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.default}px`);

    await openTab(element, 0);
    const erd = heightOf(element);
    await openTab(element, 1);
    const checklist = heightOf(element);
    await openTab(element, 2);
    const sequence = heightOf(element);
    expect([erd, checklist, sequence]).toEqual([
      `${SUPPLEMENT_HEIGHT.default}px`,
      `${SUPPLEMENT_HEIGHT.default}px`,
      `${SUPPLEMENT_HEIGHT.default}px`,
    ]);
    // The body takes that height as a fixed one, not as a cap on the content.
    expect(edge(element)?.getAttribute('aria-valuenow')).toBe(String(SUPPLEMENT_HEIGHT.default));
  });

  it('resizes by dragging its top edge, and stays there across tabs', async () => {
    const element = mount(THREE);
    await settle(element);
    await openTab(element, 0);
    const handle = edge(element) as HTMLElement;
    expect(handle.hasAttribute('data-dragging')).toBe(false);

    pointer(handle, 'pointerdown', 600);
    await settle(element);
    expect(handle.hasAttribute('data-dragging')).toBe(true);
    // The edge follows the pointer: up 60px is 60px taller.
    pointer(handle, 'pointermove', 540);
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.default + 60}px`);
    expect(handle.getAttribute('aria-valuenow')).toBe(String(SUPPLEMENT_HEIGHT.default + 60));

    pointer(handle, 'pointermove', 700);
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.default - 100}px`);

    pointer(handle, 'pointerup', 700);
    await settle(element);
    expect(handle.hasAttribute('data-dragging')).toBe(false);

    await openTab(element, 2);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.default - 100}px`);
  });

  it('clamps the drag to a readable minimum and to what the window leaves', async () => {
    const element = mount(THREE);
    await settle(element);
    await openTab(element, 0);
    const handle = edge(element) as HTMLElement;
    expect(handle.getAttribute('aria-valuemin')).toBe(String(SUPPLEMENT_HEIGHT.min));
    expect(handle.getAttribute('aria-valuemax')).toBe(String(tallest()));

    pointer(handle, 'pointerdown', 400);
    pointer(handle, 'pointermove', 5_000);
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.min}px`);

    pointer(handle, 'pointermove', -5_000);
    await settle(element);
    expect(heightOf(element)).toBe(`${tallest()}px`);
    pointer(handle, 'pointerup', -5_000);
    await settle(element);
  });

  it('stops dragging when the browser takes the pointer back', async () => {
    const element = mount(THREE);
    await settle(element);
    await openTab(element, 0);
    const handle = edge(element) as HTMLElement;
    pointer(handle, 'pointerdown', 600);
    pointer(handle, 'pointermove', 560);
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.default + 40}px`);

    // A capture the browser withdraws (window focus lost, gesture cancelled) ends the drag.
    pointer(handle, 'lostpointercapture', 560);
    await settle(element);
    expect(handle.hasAttribute('data-dragging')).toBe(false);
    // Nothing follows the pointer any more, and the height the drag reached is the one kept.
    pointer(handle, 'pointermove', 300);
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.default + 40}px`);
  });

  it('resizes from the keyboard on the focused edge', async () => {
    const element = mount(THREE);
    await settle(element);
    await openTab(element, 0);
    const handle = edge(element) as HTMLElement;
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    expect(handle.getAttribute('tabindex')).toBe('0');
    expect(handle.getAttribute('aria-label')).toBe(messages.resizeSupplements);
    expect(handle.getAttribute('title')).toBe(messages.resizeSupplementsHint);
    // Focusable and driven by keys without a pointer.
    handle.focus();
    expect(root(element).activeElement).toBe(handle);

    press(handle, 'ArrowUp');
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.default + 24}px`);

    press(handle, 'ArrowUp', true);
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.default + 120}px`);

    press(handle, 'ArrowDown');
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.default + 96}px`);

    press(handle, 'Home');
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.min}px`);

    press(handle, 'End');
    await settle(element);
    expect(heightOf(element)).toBe(`${tallest()}px`);
    expect(handle.getAttribute('aria-valuenow')).toBe(String(tallest()));

    // A key it does not use leaves the drawer, and the page, alone.
    const bubbled = vi.fn();
    document.addEventListener('keydown', bubbled);
    press(handle, 'PageDown');
    await settle(element);
    expect(heightOf(element)).toBe(`${tallest()}px`);
    expect(bubbled).toHaveBeenCalledOnce();
    document.removeEventListener('keydown', bubbled);
  });

  it('keeps the height through folding and unfolding, and offers no edge while folded', async () => {
    const element = mount(THREE);
    await settle(element);
    expect(edge(element)?.hasAttribute('hidden')).toBe(true);
    await openTab(element, 1);
    expect(edge(element)?.hasAttribute('hidden')).toBe(false);

    const handle = edge(element) as HTMLElement;
    press(handle, 'End');
    await settle(element);
    const chosen = heightOf(element);

    root(element).querySelector<HTMLButtonElement>('.dpk-supplements-toggle')?.click();
    await settle(element);
    expect(body(element)?.hasAttribute('hidden')).toBe(true);
    expect(edge(element)?.hasAttribute('hidden')).toBe(true);

    root(element).querySelector<HTMLButtonElement>('.dpk-supplements-toggle')?.click();
    await settle(element);
    // It comes back open on the supplement the reader had, at its height.
    expect(tabs(element).map((tab) => tab.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false']);
    expect(edge(element)?.hasAttribute('hidden')).toBe(false);
    expect(heightOf(element)).toBe(chosen);
  });

  it('goes back to the default on a double-click and remembers a chosen height', async () => {
    const element = mount(THREE, 'storage-key="supplements"');
    await settle(element);
    await openTab(element, 0);
    const handle = edge(element) as HTMLElement;

    press(handle, 'End');
    await settle(element);
    expect(localStorage.getItem('dev-process-kit:supplements-height:plain')).toBe(String(tallest()));

    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(element);
    expect(heightOf(element)).toBe(`${SUPPLEMENT_HEIGHT.default}px`);
    // Landing on the default keeps no record, so the next page gets the default too.
    expect(localStorage.getItem('dev-process-kit:supplements-height:plain')).toBeNull();
  });

  it('never writes the height to the draft', async () => {
    const element = mount(THREE, 'storage-key="supplements"');
    await settle(element);
    await openTab(element, 0);
    const handle = edge(element) as HTMLElement;
    pointer(handle, 'pointerdown', 600);
    pointer(handle, 'pointermove', 500);
    pointer(handle, 'pointerup', 500);
    await settle(element);
    press(handle, 'ArrowUp', true);
    await settle(element);
    await openTab(element, 2);

    const draftKeys = Object.keys(localStorage).filter((key) => key.startsWith('dev-process-kit:draft:'));
    expect(draftKeys).toEqual([]);
    expect(element.querySelector('script[type="application/json"]')?.textContent).not.toContain('supplement');
  });

  it('keeps the height to the page load with storage="memory"', async () => {
    const element = mount(THREE);
    await settle(element);
    await openTab(element, 0);
    press(edge(element) as HTMLElement, 'End');
    await settle(element);
    expect(heightOf(element)).toBe(`${tallest()}px`);
    expect(Object.keys(localStorage)).toEqual([]);
  });

  it('re-clamps a chosen height to a window that shrinks, and gives it back when it grows', async () => {
    const element = mount(THREE);
    await settle(element);
    await openTab(element, 0);
    const handle = edge(element) as HTMLElement;
    const viewport = vi.spyOn(window, 'innerHeight', 'get');

    viewport.mockReturnValue(1_000);
    window.dispatchEvent(new Event('resize'));
    await settle(element);
    press(handle, 'End');
    await settle(element);
    expect(heightOf(element)).toBe(`${supplementHeightMax(1_000)}px`);

    // A shorter window lowers the tallest the drawer may be, so the drawn height follows it.
    viewport.mockReturnValue(500);
    window.dispatchEvent(new Event('resize'));
    await settle(element);
    expect(heightOf(element)).toBe(`${supplementHeightMax(500)}px`);
    expect(handle.getAttribute('aria-valuemax')).toBe(String(supplementHeightMax(500)));

    // The reader's own height is kept, so a window that grows again gets it back.
    viewport.mockReturnValue(1_000);
    window.dispatchEvent(new Event('resize'));
    await settle(element);
    expect(heightOf(element)).toBe(`${supplementHeightMax(1_000)}px`);
  });

  it('remembers the height for the next page, and forgets it under storage="off"', async () => {
    const element = mount(THREE, '');
    await settle(element);
    await openTab(element, 0);
    press(edge(element) as HTMLElement, 'End');
    await settle(element);
    const chosen = heightOf(element);
    expect(chosen).toBe(`${tallest()}px`);

    // The next page of the same template opens where the reader left the drawer.
    const next = mount(THREE, '');
    await settle(next);
    expect(heightOf(next)).toBe(chosen);

    // With storage off, the height lives for that element only.
    const off = mount(THREE, 'storage="off"');
    await settle(off);
    expect(heightOf(off)).toBe(`${SUPPLEMENT_HEIGHT.default}px`);
    await openTab(off, 0);
    press(edge(off) as HTMLElement, 'Home');
    await settle(off);
    expect(heightOf(off)).toBe(`${SUPPLEMENT_HEIGHT.min}px`);
    expect(localStorage.getItem('dev-process-kit:supplements-height:plain')).toBe(String(tallest()));
  });
});
