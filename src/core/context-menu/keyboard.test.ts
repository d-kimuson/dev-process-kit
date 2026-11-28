import { afterEach, describe, expect, it } from 'vitest';

import { isTextEditingSurface, openContextMenuFromKeyboard } from './keyboard';

const field = (html: string): Element => {
  document.body.innerHTML = html;
  const element = document.body.firstElementChild;
  if (element === null) throw new Error('no element');
  return element;
};

describe('isTextEditingSurface', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('keeps the browser’s menu for text being edited, not for a read-only field', () => {
    expect(isTextEditingSurface(field('<textarea></textarea>'))).toBe(true);
    expect(isTextEditingSurface(field('<input />'))).toBe(true);
    expect(isTextEditingSurface(field('<div contenteditable="true"></div>'))).toBe(true);
    expect(isTextEditingSurface(field('<textarea readonly></textarea>'))).toBe(false);
    expect(isTextEditingSurface(field('<input readonly />'))).toBe(false);
    expect(isTextEditingSurface(field('<p>text</p>'))).toBe(false);
  });
});

describe('openContextMenuFromKeyboard', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  /** Presses a key on the field inside a fresh card, which opens its menu from the keyboard. */
  const press = (card: string, init: KeyboardEventInit): { key: KeyboardEvent; menus: number } => {
    const root = field(card);
    const name = root.firstElementChild;
    if (name === null) throw new Error('no field');
    let menus = 0;
    root.addEventListener('contextmenu', () => (menus += 1));
    root.addEventListener('keydown', (event) => {
      if (event instanceof KeyboardEvent) openContextMenuFromKeyboard(event, root);
    });
    const key = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
    name.dispatchEvent(key);
    return { key, menus };
  };

  it('asks for the menu on Shift+F10 and the ContextMenu key only', () => {
    const card = '<div><textarea readonly></textarea></div>';
    expect(press(card, { key: 'F10', shiftKey: true }).menus).toBe(1);
    expect(press(card, { key: 'ContextMenu' }).menus).toBe(1);
    expect(press(card, { key: 'F10' }).menus).toBe(0);
  });

  it('leaves the key to the browser while the reader is typing', () => {
    const { key, menus } = press('<div><textarea></textarea></div>', { key: 'ContextMenu' });
    expect(menus).toBe(0);
    expect(key.defaultPrevented).toBe(false);
  });
});
