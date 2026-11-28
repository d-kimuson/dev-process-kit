// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEXT_SUBMIT_CHANGE_EVENT } from './text-submit';
import { handleTextSubmitKey, pageTextSubmitKey, setPageTextSubmitKey } from './text-submit-controller';

const area = (value = 'ab'): HTMLTextAreaElement => {
  const field = document.createElement('textarea');
  field.value = value;
  document.body.append(field);
  field.setSelectionRange(1, 1);
  return field;
};

/** Dispatches a keydown on the field through the handler, as a field's own listener would. */
const keydown = (field: HTMLTextAreaElement, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, ...init });
  let intent: ReturnType<typeof handleTextSubmitKey> | undefined;
  field.addEventListener('keydown', (e) => (intent = handleTextSubmitKey(e)), { once: true });
  field.dispatchEvent(event);
  return { intent, prevented: event.defaultPrevented };
};

afterEach(() => {
  setPageTextSubmitKey('mod-enter');
  document.body.replaceChildren();
});

describe('handleTextSubmitKey', () => {
  it('saves on Ctrl/Command+Enter by default and leaves plain and Shift+Enter to the browser', () => {
    const field = area();
    expect(keydown(field, { ctrlKey: true })).toEqual({ intent: 'submit', prevented: true });
    expect(keydown(field, { metaKey: true })).toEqual({ intent: 'submit', prevented: true });
    expect(keydown(field, {})).toEqual({ intent: 'newline', prevented: false });
    expect(keydown(field, { shiftKey: true })).toEqual({ intent: 'newline', prevented: false });
  });

  it('follows the page’s choice the moment it changes', () => {
    const field = area();
    const changed = vi.fn();
    document.addEventListener(TEXT_SUBMIT_CHANGE_EVENT, changed);
    setPageTextSubmitKey('enter');
    expect(document.documentElement.dataset['dpkTextSubmit']).toBe('enter');
    expect(changed).toHaveBeenCalledOnce();
    expect(keydown(field, {})).toEqual({ intent: 'submit', prevented: true });
    expect(keydown(field, { shiftKey: true })).toEqual({ intent: 'newline', prevented: false });
    setPageTextSubmitKey('shift-enter');
    expect(keydown(field, { shiftKey: true })).toEqual({ intent: 'submit', prevented: true });
    expect(keydown(field, {})).toEqual({ intent: 'newline', prevented: false });
    setPageTextSubmitKey('mod-enter');
    expect(pageTextSubmitKey()).toBe('mod-enter');
    expect(document.documentElement.hasAttribute('data-dpk-text-submit')).toBe(false);
    document.removeEventListener(TEXT_SUBMIT_CHANGE_EVENT, changed);
  });

  it('inserts the line break itself for a modifier Enter that is not the save key', () => {
    setPageTextSubmitKey('enter');
    const field = area('ab');
    const input = vi.fn();
    field.addEventListener('input', input);
    expect(keydown(field, { ctrlKey: true })).toEqual({ intent: 'newline', prevented: true });
    expect(field.value).toBe('a\nb');
    expect(field.selectionStart).toBe(2);
    expect(input).toHaveBeenCalledOnce();
  });

  it('never saves while an input method is composing, under any choice', async () => {
    const field = area();
    for (const key of ['enter', 'mod-enter', 'shift-enter'] as const) {
      setPageTextSubmitKey(key);
      const init = key === 'enter' ? {} : key === 'shift-enter' ? { shiftKey: true } : { ctrlKey: true };
      expect(keydown(field, { ...init, isComposing: true }).intent).toBe('none');
      expect(keydown(field, { ...init, keyCode: 229 }).intent).toBe('none');
      // Safari on macOS: the Enter that confirms the conversion comes after compositionend.
      field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true }));
      expect(keydown(field, init)).toEqual({ intent: 'none', prevented: false });
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(keydown(field, { shiftKey: true }).intent).toBe('submit');
  });
});
