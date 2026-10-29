// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DpkViewPlain } from '../views/plain/element';

import { dialogStyles } from './dialog/styles';
import { coreMessages } from './messages';
import '../index';

const messages = coreMessages('en');

const mount = (attributes = 'storage="memory"'): DpkViewPlain => {
  document.body.innerHTML = `
    <dpk-view-plain ${attributes}>
      <script type="application/json">${JSON.stringify({ title: 'Cancel orders' })}</script>
      <section slot="main"><p>Body</p></section>
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

const header = (element: DpkViewPlain): HTMLElement | null => root(element).querySelector<HTMLElement>('.dpk-header');
const menu = (element: DpkViewPlain): HTMLElement | null =>
  root(element).querySelector<HTMLElement>('.dpk-floating-menu');

const grip = (element: DpkViewPlain): HTMLButtonElement => {
  const button = menu(element)?.querySelector<HTMLButtonElement>('.dpk-menu-grip');
  if (!button) throw new Error('no menu grip');
  return button;
};

/** The menu's own buttons, in the order a reader meets them. */
const itemNames = (element: DpkViewPlain): (string | null)[] =>
  [...(menu(element)?.querySelectorAll('button') ?? [])].map((button) => button.getAttribute('aria-label'));

const press = (target: HTMLElement, key: string): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
};

const pointer = (target: HTMLElement, type: string, clientX: number, clientY: number): void => {
  target.dispatchEvent(
    new PointerEvent(type, { pointerId: 1, button: 0, clientX, clientY, bubbles: true, composed: true }),
  );
};

/** What the reader's dock is stored as, under the content's own key. */
const storedDock = (name: string): unknown => {
  const raw = localStorage.getItem(`dev-process-kit:menu:${name}`);
  return raw === null ? null : JSON.parse(raw);
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

describe('the page chrome', () => {
  it('draws one header and one floating menu, and no rail and no second bar', async () => {
    const element = mount();
    await settle(element);
    expect(root(element).querySelector('.dpk-rail')).toBeNull();

    // The header is the screen's one row: the brand, the title, the reader's own
    // controls and the settings gear, and the template's header content beside them.
    const row = header(element);
    expect(row?.tagName).toBe('HEADER');
    expect(root(element).querySelectorAll('.dpk-header')).toHaveLength(1);
    // It takes its height from the screen, out of the main column the content scrolls in.
    expect(row?.closest('.dpk-main')).toBeNull();
    expect(row?.querySelector('.dpk-brand')).not.toBeNull();
    expect(row?.querySelector('.dpk-title h1')?.textContent).toBe('Cancel orders');
    expect(row?.querySelector('.dpk-title h1')?.getAttribute('title')).toBe('Cancel orders');
    expect(row?.querySelector('.dpk-header-slot slot[name="header"]')).not.toBeNull();
    expect(row?.querySelector('.dpk-header-tools .dpk-lang-select')).not.toBeNull();
    expect(row?.querySelector('.dpk-header-tools .dpk-theme-toggle')).not.toBeNull();
    expect(row?.querySelector('.dpk-header .dpk-settings-trigger')).not.toBeNull();
    // A page with nothing to switch has no switcher; the app adds one.
    expect(row?.querySelector('.dpk-page-switcher-trigger')).toBeNull();
    // A view that owns the screen draws no second bar for its own controls.
    expect(root(element).querySelector('.dpk-board-bar')).toBeNull();

    // The row publishes its height, which is what keeps a maximized panel clear of it.
    expect(element.style.getPropertyValue('--dpk-header-height')).toBe('0px');

    // The menu carries the page's own controls, and a grip that names itself.
    expect(menu(element)?.getAttribute('aria-label')).toBe(messages.menu);
    expect(grip(element).getAttribute('aria-label')).toBe(messages.menuMove);
    expect(grip(element).getAttribute('data-tooltip')).toBe(messages.menuMove);
    expect(itemNames(element)).toEqual([
      messages.menuMove,
      messages.undo,
      messages.redo,
      `${messages.reviewComments} (0)`,
      `${messages.reviewChanges} (0)`,
      messages.checkModeOff,
    ]);
  });

  it("keeps the reader's language, theme and version out of the settings dialog", async () => {
    const element = mount();
    await settle(element);
    root(element).querySelector<HTMLButtonElement>('.dpk-settings-trigger')?.click();
    await settle(element);
    // The dialog holds the page's own settings only: one control each, in the header.
    expect(root(element).querySelectorAll('.dpk-lang-select')).toHaveLength(1);
    expect(root(element).querySelectorAll('.dpk-theme-toggle')).toHaveLength(1);
    expect(root(element).querySelector('.dpk-settings-row')).toBeNull();
    // The page runs the version its URL was opened with: no row offers another.
    expect(root(element).querySelector('.dpk-version')).toBeNull();
  });

  it('keeps one frame across the settings sections, so switching one never resizes or moves it', async () => {
    const element = mount();
    await settle(element);
    root(element).querySelector<HTMLButtonElement>('.dpk-settings-trigger')?.click();
    await settle(element);
    const dialog = root(element).querySelector('#dpk-settings');
    // jsdom lays nothing out: the panel opts into the shell's fixed height, and
    // that rule is the one the browser measures (see `dpk-dialog` styles).
    expect(dialog?.getAttribute('data-height')).toBe('fixed');
    expect(String(dialogStyles)).toContain(".dpk-dialog[data-height='fixed']");
  });

  // jsdom lays nothing out, so the menu is never measurable here: it is still
  // drawn at its dock, by insets, instead of hidden waiting for a measurement.
  it('is drawn at its dock before it has been measured, never hidden for a size', async () => {
    const element = mount();
    await settle(element);
    expect(menu(element)?.getAttribute('style')).toBe('right: 12px; top: 12px');

    press(grip(element), 'ArrowDown');
    await settle(element);
    // Along the bottom edge the box is placed from the far side, which needs no size either.
    expect(menu(element)?.getAttribute('style')).toBe('bottom: 12px; left: 12px');
  });

  it('lies along the edge it is docked to, never on a direction of its own', async () => {
    const element = mount();
    await settle(element);
    // It opens at the top of the right edge: one column.
    expect(menu(element)?.getAttribute('data-edge')).toBe('right');
    expect(menu(element)?.getAttribute('data-orientation')).toBe('vertical');

    press(grip(element), 'ArrowDown');
    await settle(element);
    expect(menu(element)?.getAttribute('data-edge')).toBe('bottom');
    expect(menu(element)?.getAttribute('data-orientation')).toBe('horizontal');

    // A key the grip does not use leaves the dock where it is, for the page to handle.
    press(grip(element), 'PageDown');
    await settle(element);
    expect(menu(element)?.getAttribute('data-edge')).toBe('bottom');
  });

  it('docks with the arrows, and remembers where the reader put it', async () => {
    const element = mount('storage="on"');
    await settle(element);
    press(grip(element), 'ArrowLeft');
    await settle(element);
    expect(menu(element)?.getAttribute('data-edge')).toBe('left');
    expect(storedDock('plain')).toMatchObject({ edge: 'left' });

    press(grip(element), 'Home');
    await settle(element);
    expect(storedDock('plain')).toMatchObject({ edge: 'left', offset: 12 });

    press(grip(element), 'PageDown');
    await settle(element);
    expect(storedDock('plain')).toMatchObject({ edge: 'left', offset: 12 });
  });

  it('keeps the dock to the page load with storage="memory"', async () => {
    const element = mount();
    await settle(element);
    press(grip(element), 'ArrowDown');
    await settle(element);
    expect(menu(element)?.getAttribute('data-edge')).toBe('bottom');
    expect(Object.keys(localStorage)).toEqual([]);
  });

  it('drags by the grip and drops the menu on the nearest edge', async () => {
    const element = mount('storage="on"');
    await settle(element);
    const gripButton = grip(element);
    // jsdom does not implement pointer capture; the drag itself is what is under test.
    gripButton.setPointerCapture = () => {};
    // Down and to the left: the menu follows the pointer and lands on the bottom edge.
    pointer(gripButton, 'pointerdown', 900, 100);
    pointer(gripButton, 'pointermove', 300, 650);
    pointer(gripButton, 'pointerup', 300, 650);
    await settle(element);
    expect(menu(element)?.getAttribute('data-edge')).toBe('bottom');
    expect(menu(element)?.getAttribute('data-orientation')).toBe('horizontal');
    expect(storedDock('plain')).toMatchObject({ edge: 'bottom' });
  });

  it('never writes the dock or the page into the draft', async () => {
    const element = mount('storage="on"');
    await settle(element);
    press(grip(element), 'ArrowDown');
    await settle(element);
    expect(Object.keys(localStorage).filter((key) => key.startsWith('dev-process-kit:draft:'))).toEqual([]);
    expect(element.querySelector('script[type="application/json"]')?.textContent).not.toContain('menu');
  });
});
