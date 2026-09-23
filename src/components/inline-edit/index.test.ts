// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DpkComponentInlineEdit, defineInlineEdit } from './index';

defineInlineEdit();
afterEach(() => document.body.replaceChildren());
describe('inline editing', () => {
  it('preserves an unfinished draft and selection when a keyed move blurs the field', async () => {
    const editor = new DpkComponentInlineEdit();
    editor.value = 'old';
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = editor.shadowRoot?.querySelector('input');
    if (!input) throw new Error('missing editor');
    input.value = 'unfinished';
    input.dispatchEvent(new Event('input'));
    input.setSelectionRange(2, 4);
    const commit = vi.fn();
    editor.addEventListener('dpk-commit', commit);
    input.dispatchEvent(new FocusEvent('blur'));
    editor.remove();
    document.body.append(editor);
    await Promise.resolve();
    await editor.updateComplete;
    expect(commit).not.toHaveBeenCalled();
    expect(editor.shadowRoot?.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 4]);
    input.dispatchEvent(new FocusEvent('blur'));
    await Promise.resolve();
    expect(commit).toHaveBeenCalledOnce();
  });
  it('does not interpret IME Enter or Escape as editor commands', async () => {
    const editor = new DpkComponentInlineEdit();
    editor.value = 'old';
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = editor.shadowRoot?.querySelector('input');
    if (!input) throw new Error('missing editor');
    input.value = '変換中';
    input.dispatchEvent(new Event('input'));
    const commit = vi.fn();
    editor.addEventListener('dpk-commit', commit);
    for (const key of ['Enter', 'Escape'])
      input.dispatchEvent(new KeyboardEvent('keydown', { key, isComposing: true }));
    await editor.updateComplete;
    expect(commit).not.toHaveBeenCalled();
    expect(editor.shadowRoot?.querySelector('input')).toBe(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(commit).toHaveBeenCalledOnce();
  });
});
