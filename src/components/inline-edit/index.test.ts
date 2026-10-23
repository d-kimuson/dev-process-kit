// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DpkInlineEdit, defineInlineEdit } from './index';

defineInlineEdit();
afterEach(() => document.body.replaceChildren());

/** The one box a reader sees, at rest or while editing. */
const field = (editor: DpkInlineEdit): HTMLTextAreaElement | null =>
  editor.shadowRoot?.querySelector<HTMLTextAreaElement>('.box > .field') ?? null;

/** The invisible twin that sizes the box from real text layout. */
const mirror = (editor: DpkInlineEdit): HTMLElement | null =>
  editor.shadowRoot?.querySelector<HTMLElement>('.box > .mirror') ?? null;

describe('inline editing', () => {
  it('is the very same element at rest and while editing: nothing swaps, only readonly toggles', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'a name long enough to wrap onto two lines';
    document.body.append(editor);
    await editor.updateComplete;
    const resting = field(editor);
    if (!resting) throw new Error('missing field');
    expect(resting.readOnly).toBe(true);
    editor.startEditing();
    await editor.updateComplete;
    expect(field(editor)).toBe(resting);
    expect(resting.readOnly).toBe(false);
    expect(resting.value).toBe('a name long enough to wrap onto two lines');
  });

  it('preserves an unfinished draft and selection when a keyed move blurs the field', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'old';
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = field(editor);
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
    const editor = new DpkInlineEdit();
    editor.value = 'old';
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = field(editor);
    if (!input) throw new Error('missing editor');
    input.value = '変換中';
    input.dispatchEvent(new Event('input'));
    const commit = vi.fn();
    editor.addEventListener('dpk-commit', commit);
    for (const key of ['Enter', 'Escape'])
      input.dispatchEvent(new KeyboardEvent('keydown', { key, isComposing: true }));
    await editor.updateComplete;
    expect(commit).not.toHaveBeenCalled();
    expect(field(editor)).toBe(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(commit).toHaveBeenCalledOnce();
  });

  it('mirrors the shown text exactly, so the box only ever grows with the draft, never jumps', async () => {
    for (const mode of ['line', 'wrap', 'multiline'] as const) {
      const editor = new DpkInlineEdit();
      editor.value = 'a name long enough to wrap onto two lines';
      editor.wrap = mode === 'wrap';
      editor.multiline = mode === 'multiline';
      document.body.append(editor);
      await editor.updateComplete;
      expect(mirror(editor)?.textContent).toBe('a name long enough to wrap onto two lines');
      editor.startEditing();
      await editor.updateComplete;
      const input = field(editor);
      if (!input) throw new Error(`missing field (${mode})`);
      input.value = 'short';
      input.dispatchEvent(new Event('input'));
      await editor.updateComplete;
      expect(mirror(editor)?.textContent).toBe('short');
      editor.remove();
    }
  });

  it('keeps an empty draft as wide as its placeholder, and a last empty line as tall as a line', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'Notes';
    editor.placeholder = 'Add a note';
    editor.multiline = true;
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = field(editor);
    if (!input) throw new Error('missing field');
    expect(input.placeholder).toBe('Add a note');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    await editor.updateComplete;
    expect(mirror(editor)?.textContent).toBe('Add a note');
    input.value = 'one\n';
    input.dispatchEvent(new Event('input'));
    await editor.updateComplete;
    expect(mirror(editor)?.textContent).toBe('one\n​');
  });

  it('shows the text again, read-only, once the edit commits', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'old';
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = field(editor);
    if (!input) throw new Error('missing field');
    input.value = 'new';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await editor.updateComplete;
    expect(field(editor)?.readOnly).toBe(true);
  });

  it('commits the typed value on Enter, the same as it does on blur', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'old';
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = field(editor);
    if (!input) throw new Error('missing field');
    input.value = 'new';
    input.dispatchEvent(new Event('input'));
    const commit = vi.fn();
    editor.addEventListener('dpk-commit', commit);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(commit).toHaveBeenCalledOnce();
    const event = commit.mock.calls[0]?.[0];
    expect(event instanceof CustomEvent ? event.detail : null).toEqual({ value: 'new' });
  });

  it('inserts a line break on Shift+Enter when multiline, instead of committing', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'old';
    editor.multiline = true;
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = field(editor);
    if (!input) throw new Error('missing field');
    const commit = vi.fn();
    editor.addEventListener('dpk-commit', commit);
    const shiftEnter = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true });
    input.dispatchEvent(shiftEnter);
    expect(shiftEnter.defaultPrevented).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    // jsdom does not perform the native "insert a newline" that a real browser
    // would on the un-prevented keydown above; simulate its result directly.
    input.value = 'old\nmore';
    input.dispatchEvent(new Event('input'));
    const plainEnter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    input.dispatchEvent(plainEnter);
    expect(plainEnter.defaultPrevented).toBe(true);
    expect(commit).toHaveBeenCalledOnce();
  });

  it('does not insert a line break on Shift+Enter without multiline', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'old';
    editor.wrap = true;
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = field(editor);
    if (!input) throw new Error('missing field');
    const commit = vi.fn();
    editor.addEventListener('dpk-commit', commit);
    const shiftEnter = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true });
    input.dispatchEvent(shiftEnter);
    expect(shiftEnter.defaultPrevented).toBe(true);
    expect(commit).not.toHaveBeenCalled();
  });

  it('restores the original value on Escape without committing', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'old';
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = field(editor);
    if (!input) throw new Error('missing field');
    input.value = 'changed';
    input.dispatchEvent(new Event('input'));
    const commit = vi.fn();
    editor.addEventListener('dpk-commit', commit);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    await editor.updateComplete;
    expect(commit).not.toHaveBeenCalled();
    expect(field(editor)?.readOnly).toBe(true);
    expect(field(editor)?.value).toBe('old');
  });

  it('never shows a focus-ring outline, only a subtle inset border while editing', () => {
    const cssText = (DpkInlineEdit.styles as unknown as { cssText: string }[]).map((style) => style.cssText).join('\n');
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    const fieldRule = Array.from(sheet.cssRules).find((rule) => (rule as CSSStyleRule).selectorText === '.field') as
      | CSSStyleRule
      | undefined;
    expect(fieldRule?.style.outline).toBe('none');
  });

  it('puts the caret at the end of the text on keyboard-initiated editing (Enter), so typing appends', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'Googleでログイン';
    document.body.append(editor);
    await editor.updateComplete;
    const resting = field(editor);
    if (!resting) throw new Error('missing field');
    resting.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await editor.updateComplete;
    const input = field(editor);
    if (!input) throw new Error('missing field');
    expect(input.readOnly).toBe(false);
    expect(input.selectionStart).toBe(input.value.length);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('keeps the caret where a click already placed it, instead of forcing it to the end', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'Googleでログイン';
    document.body.append(editor);
    await editor.updateComplete;
    const resting = field(editor);
    if (!resting) throw new Error('missing field');
    // A real mousedown on a readonly field still places the native caret at the
    // pointer position before any click fires; jsdom has no layout to compute
    // that from coordinates, so this stands in for whatever position the
    // browser's own default mousedown action would have set.
    resting.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true }));
    resting.setSelectionRange(3, 3);
    resting.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await editor.updateComplete;
    const input = field(editor);
    if (!input) throw new Error('missing field');
    expect(input.readOnly).toBe(false);
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(3);
  });

  it('does not suppress the native mousedown on a resting field, so it can place the caret', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'Googleでログイン';
    document.body.append(editor);
    await editor.updateComplete;
    const resting = field(editor);
    if (!resting) throw new Error('missing field');
    const mousedown = new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true });
    resting.dispatchEvent(mousedown);
    expect(mousedown.defaultPrevented).toBe(false);
  });

  it('removes the hover ring/tint shown at rest; the editing-state ring stays', () => {
    const cssText = (DpkInlineEdit.styles as unknown as { cssText: string }[]).map((style) => style.cssText).join('\n');
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    const selectors = Array.from(sheet.cssRules).map((rule) => (rule as CSSStyleRule).selectorText);
    expect(selectors).not.toContain('.field[readonly]:hover');
    expect(selectors).not.toContain('.field[readonly]:placeholder-shown:hover');
    expect(selectors).not.toContain('.view:hover');
    expect(selectors).not.toContain(':host([seamless]) .field[readonly]:hover');
    const editingRule = Array.from(sheet.cssRules).find(
      (rule) => (rule as CSSStyleRule).selectorText === '.field:not([readonly])',
    ) as CSSStyleRule | undefined;
    expect(editingRule?.style.boxShadow).toContain('var(--dpk-blue)');
  });

  describe('markdown', () => {
    const mountMarkdown = async (value: string): Promise<DpkInlineEdit> => {
      const editor = new DpkInlineEdit();
      editor.value = value;
      editor.multiline = true;
      editor.markdown = true;
      document.body.append(editor);
      await editor.updateComplete;
      return editor;
    };

    it('shows the value as formatted text, and the source while editing', async () => {
      const editor = await mountMarkdown('**Note**\n- one\n- two');
      const view = editor.shadowRoot?.querySelector('.view');
      expect(view?.querySelector('strong')?.textContent).toBe('Note');
      expect(view?.querySelectorAll('li')).toHaveLength(2);

      editor.startEditing();
      await editor.updateComplete;
      expect(field(editor)?.value).toBe('**Note**\n- one\n- two');
      expect(mirror(editor)?.textContent).toBe('**Note**\n- one\n- two');
    });

    it('never runs markup in the value', async () => {
      const editor = await mountMarkdown('<img src=x onerror="alert(1)">');
      expect(editor.shadowRoot?.querySelector('.view img')).toBeNull();
      expect(editor.shadowRoot?.querySelector('.view')?.textContent).toContain('<img');
    });

    it('follows a link in the text instead of starting an edit', async () => {
      const editor = await mountMarkdown('[next](#step=confirm)');
      const link = editor.shadowRoot?.querySelector<HTMLAnchorElement>('.view a');
      expect(link?.getAttribute('href')).toBe('#step=confirm');
      link?.addEventListener('click', (event) => event.preventDefault());
      link?.click();
      await editor.updateComplete;
      expect(field(editor)).toBeNull();

      editor.shadowRoot?.querySelector<HTMLElement>('.view')?.click();
      await editor.updateComplete;
      expect(field(editor)).not.toBeNull();
    });

    it('shows the placeholder while there is nothing to format', async () => {
      const editor = await mountMarkdown('');
      editor.placeholder = 'Add a note';
      await editor.updateComplete;
      expect(editor.shadowRoot?.querySelector('.view')).toBeNull();
      expect(field(editor)?.placeholder).toBe('Add a note');
    });
  });

  it('clamps a truncated multi-line field at rest, via a CSS rule keyed on [truncate][wrap]/[multiline]', async () => {
    const editor = new DpkInlineEdit();
    editor.value = 'a name long enough to wrap onto two lines';
    editor.truncate = true;
    editor.wrap = true;
    document.body.append(editor);
    await editor.updateComplete;
    expect(editor.hasAttribute('truncate')).toBe(true);
    const cssText = (DpkInlineEdit.styles as unknown as { cssText: string }[]).map((style) => style.cssText).join('\n');
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    const clampRule = Array.from(sheet.cssRules).some((rule) => {
      const style = rule as CSSStyleRule;
      return style.selectorText?.includes('[truncate][wrap]') && style.style.maxHeight !== '';
    });
    const liftRule = Array.from(sheet.cssRules).some((rule) => {
      const style = rule as CSSStyleRule;
      return style.selectorText?.includes(':has(.field:not([readonly]))') && style.style.maxHeight === 'none';
    });
    // The clamp (rest) and its lift (editing) are plain CSS, exercised for real
    // in browser QA — jsdom does not evaluate :has() or compute max-height here.
    expect(clampRule).toBe(true);
    expect(liftRule).toBe(true);
  });

  it('keeps a single-line truncated field permanently clipped with an ellipsis, not clamped by height', () => {
    const cssText = (DpkInlineEdit.styles as unknown as { cssText: string }[]).map((style) => style.cssText).join('\n');
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    const ellipsisRule = Array.from(sheet.cssRules).some((rule) => {
      const style = rule as CSSStyleRule;
      return (
        style.selectorText?.includes('[truncate]:not([wrap]):not([multiline])') &&
        style.style.textOverflow === 'ellipsis'
      );
    });
    expect(ellipsisRule).toBe(true);
  });
});
