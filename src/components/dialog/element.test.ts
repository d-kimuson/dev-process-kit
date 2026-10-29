import { afterEach, describe, expect, it, vi } from 'vitest';

import { defineDialog, type DpkDialog } from './index';

defineDialog();

type Opened = { dialog: DpkDialog; close: ReturnType<typeof vi.fn> };

/** What the dialog last announced it closed with, as its `dpk-dialog-close` detail. */
const closedWith = (close: ReturnType<typeof vi.fn>, call = 0): unknown => {
  const event = close.mock.calls[call]?.[0];
  return event instanceof CustomEvent ? (event.detail as unknown) : null;
};

/** A button that had focus before the dialog opened: the opener focus returns to. */
const mount = async (
  attributes: Record<string, string> = { label: 'Filters' },
  inner = '<p>Body</p><button slot="footer" type="button">Apply</button>',
): Promise<DpkDialog> => {
  document.body.innerHTML = `<button id="opener" type="button">Open</button>`;
  const dialog = document.createElement('dpk-dialog') as DpkDialog;
  for (const [name, value] of Object.entries(attributes)) dialog.setAttribute(name, value);
  dialog.innerHTML = inner;
  document.body.append(dialog);
  await dialog.updateComplete;
  return dialog;
};

const nativeDialog = (dialog: DpkDialog): HTMLDialogElement => {
  const element = dialog.shadowRoot?.querySelector('dialog');
  if (!element) throw new Error('no <dialog> in the shadow root');
  return element;
};

const open = async (dialog: DpkDialog): Promise<Opened> => {
  const close = vi.fn();
  dialog.addEventListener('dpk-dialog-close', close);
  (document.getElementById('opener') as HTMLButtonElement).focus();
  dialog.show();
  await dialog.updateComplete;
  return { dialog, close };
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<dpk-dialog>', () => {
  it('draws a modal dialog named by its label, closed until opened', async () => {
    const dialog = await mount();
    const surface = nativeDialog(dialog);
    expect(surface.getAttribute('role')).toBe('dialog');
    expect(surface.getAttribute('aria-modal')).toBe('true');
    expect(surface.getAttribute('aria-label')).toBe('Filters');
    expect(surface.open).toBe(false);
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(surface.querySelector('.dpk-dialog-title')?.textContent?.trim()).toBe('Filters');
  });

  it('opens with the open attribute or show(), and closes with close()', async () => {
    const dialog = await mount();
    dialog.setAttribute('open', '');
    await dialog.updateComplete;
    expect(dialog.open).toBe(true);
    expect(nativeDialog(dialog).open).toBe(true);

    dialog.close();
    await dialog.updateComplete;
    expect(dialog.open).toBe(false);
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(nativeDialog(dialog).open).toBe(false);

    dialog.show();
    await dialog.updateComplete;
    expect(nativeDialog(dialog).open).toBe(true);
  });

  it('keeps the default, heading and footer slots, drawing the foot only when it has content', async () => {
    const dialog = await mount({ label: 'Filters' }, '<p class="own">Body</p>');
    await open(dialog);
    const surface = nativeDialog(dialog);
    expect(dialog.querySelector('.own')?.textContent).toBe('Body');
    expect(surface.querySelector('slot:not([name])')).not.toBeNull();
    expect(surface.querySelector('slot[name="heading"]')).not.toBeNull();
    expect(surface.querySelector('footer')?.hasAttribute('hidden')).toBe(true);

    dialog.append(Object.assign(document.createElement('button'), { textContent: 'Apply', slot: 'footer' }));
    await dialog.updateComplete;
    await dialog.updateComplete;
    await dialog.updateComplete;
    expect(surface.querySelector('footer')?.hasAttribute('hidden')).toBe(false);

    const heading = Object.assign(document.createElement('span'), { textContent: 'Narrow the list', slot: 'heading' });
    dialog.replaceChildren(heading);
    await dialog.updateComplete;
    expect(dialog.querySelector('[slot="heading"]')?.textContent).toBe('Narrow the list');
  });

  it('reads its width from size, defaulting to md', async () => {
    const dialog = await mount();
    expect(nativeDialog(dialog).getAttribute('data-size')).toBe('md');
    dialog.setAttribute('size', 'lg');
    await dialog.updateComplete;
    expect(nativeDialog(dialog).getAttribute('data-size')).toBe('lg');
  });

  it('moves focus into the dialog on open and back to the opener on close', async () => {
    const dialog = await mount({ label: 'Filters' }, '<p>Body</p><button id="apply" type="button">Apply</button>');
    const opener = document.getElementById('opener') as HTMLButtonElement;
    opener.focus();
    expect(document.activeElement).toBe(opener);

    dialog.show();
    await dialog.updateComplete;
    // The first thing a Tab would reach inside the panel, not the page behind it.
    expect(dialog.shadowRoot?.activeElement).toBe(nativeDialog(dialog).querySelector('.dpk-dialog-close'));

    dialog.close();
    await dialog.updateComplete;
    expect(document.activeElement).toBe(opener);
  });

  it('closes on Escape, as the engine cancels it', async () => {
    const dialog = await mount();
    const { close } = await open(dialog);
    const cancel = new Event('cancel', { cancelable: true });
    nativeDialog(dialog).dispatchEvent(cancel);
    await dialog.updateComplete;
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(false);
    expect(nativeDialog(dialog).open).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
    expect(closedWith(close)).toEqual({ reason: 'escape' });
  });

  it('closes on a press on the backdrop, and leaves presses inside it alone', async () => {
    const dialog = await mount();
    const { close } = await open(dialog);
    const surface = nativeDialog(dialog);

    // A press inside the panel bubbles through the dialog, but targets the control.
    surface.querySelector<HTMLElement>('.dpk-dialog-title')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dialog.open).toBe(true);

    // A press on the backdrop targets the dialog element itself.
    surface.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await dialog.updateComplete;
    expect(dialog.open).toBe(false);
    expect(closedWith(close)).toEqual({ reason: 'backdrop' });
  });

  it('closes from its close button, and says how', async () => {
    const dialog = await mount();
    const { close } = await open(dialog);
    nativeDialog(dialog).querySelector<HTMLButtonElement>('.dpk-dialog-close')?.click();
    await dialog.updateComplete;
    expect(dialog.open).toBe(false);
    expect(closedWith(close)).toEqual({ reason: 'close' });
  });

  it('names its close button in the page language', async () => {
    const dialog = await mount({ label: '絞り込み', lang: 'ja' });
    await open(dialog);
    expect(nativeDialog(dialog).querySelector('.dpk-dialog-close')?.getAttribute('aria-label')).toBe('閉じる');
  });

  it('bubbles and composes dpk-dialog-close, so a host around it hears it', async () => {
    const dialog = await mount();
    const host = document.createElement('div');
    document.body.append(host);
    host.append(dialog);
    const heard = vi.fn();
    document.body.addEventListener('dpk-dialog-close', heard);
    await open(dialog);
    nativeDialog(dialog).querySelector<HTMLButtonElement>('.dpk-dialog-close')?.click();
    await dialog.updateComplete;
    expect(heard).toHaveBeenCalledTimes(1);
  });
});
