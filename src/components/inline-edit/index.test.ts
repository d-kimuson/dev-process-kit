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

/** The editor's own rules, parsed by the same CSS parser the browser uses. */
const styleRules = (): CSSStyleRule[] => {
  const cssText = (DpkInlineEdit.styles as unknown as { cssText: string }[]).map((style) => style.cssText).join('\n');
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  return Array.from(sheet.cssRules).filter((rule): rule is CSSStyleRule => 'selectorText' in rule);
};

/** Every `white-space` a selector is given, in rule order. */
const whiteSpaceOn = (selector: string): string[] =>
  styleRules()
    .filter((rule) =>
      rule.selectorText
        .split(',')
        .map((part) => part.trim())
        .includes(selector),
    )
    .map((rule) => rule.style.whiteSpace)
    .filter((value) => value !== '');

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

  it('breaks the line on Enter when multiline and commits on the text-submit key (Ctrl/Command+Enter by default)', async () => {
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
    for (const shiftKey of [false, true]) {
      const enter = new KeyboardEvent('keydown', { key: 'Enter', shiftKey, cancelable: true });
      input.dispatchEvent(enter);
      expect(enter.defaultPrevented).toBe(false);
    }
    expect(commit).not.toHaveBeenCalled();
    // jsdom does not perform the native "insert a newline" that a real browser
    // would on the un-prevented keydown above; simulate its result directly.
    input.value = 'old\nmore';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true }));
    expect(commit).not.toHaveBeenCalled();
    const modEnter = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, cancelable: true });
    input.dispatchEvent(modEnter);
    expect(modEnter.defaultPrevented).toBe(true);
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

  it('wraps a long value at rest and while editing when told to, and only then', () => {
    // The mirror is what sizes the box from real text layout, and the field is
    // what the reader types in: both have to lay the value out the same way, or
    // one clips what the other wraps. Without `wrap`, one line is the contract
    // (a name in a table cell must not reflow the row).
    expect(whiteSpaceOn('.mirror')).toEqual(['pre']);
    for (const selector of [
      ':host([wrap]) .mirror',
      ':host([wrap]) .field',
      ':host([multiline]) .mirror',
      ':host([multiline]) .field',
    ])
      expect(whiteSpaceOn(selector)).toEqual(['pre-wrap']);
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

  describe('while editing, the caret stays where the browser put it', () => {
    /** An open multiline editor holding `value`, as a description field is. */
    const openEditor = async (value: string): Promise<{ editor: DpkInlineEdit; input: HTMLTextAreaElement }> => {
      const editor = new DpkInlineEdit();
      editor.multiline = true;
      editor.markdown = true;
      editor.value = value;
      document.body.append(editor);
      await editor.updateComplete;
      editor.startEditing();
      await editor.updateComplete;
      const input = field(editor);
      if (!input) throw new Error('missing field');
      return { editor, input };
    };

    /** What the browser itself does for one edit: change the text, place the caret, fire `input`. */
    const edit = async (
      editor: DpkInlineEdit,
      input: HTMLTextAreaElement,
      change: { value: string; caret: number; init?: InputEventInit },
    ): Promise<void> => {
      input.value = change.value;
      input.setSelectionRange(change.caret, change.caret);
      input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, ...change.init }));
      await editor.updateComplete;
    };

    it('keeps the caret after text typed at the start of a line (Ctrl+A, then a key)', async () => {
      const { editor, input } = await openEditor('first\nsecond');
      input.setSelectionRange(6, 6); // Ctrl+A on macOS: start of the second line.
      await edit(editor, input, { value: 'first\nxsecond', caret: 7, init: { inputType: 'insertText', data: 'x' } });
      expect([input.selectionStart, input.selectionEnd]).toEqual([7, 7]);
      expect(input.value).toBe('first\nxsecond');
    });

    it('keeps the caret after text typed in the middle', async () => {
      const { editor, input } = await openEditor('abcd');
      await edit(editor, input, { value: 'abXcd', caret: 3, init: { inputType: 'insertText', data: 'X' } });
      expect([input.selectionStart, input.selectionEnd]).toEqual([3, 3]);
    });

    it('keeps the caret through an IME composition at the start of a line, and after it', async () => {
      const { editor, input } = await openEditor('first\nsecond');
      input.setSelectionRange(6, 6);
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true, data: '' }));
      const composing = { inputType: 'insertCompositionText', isComposing: true };
      await edit(editor, input, { value: 'first\nあsecond', caret: 7, init: { ...composing, data: 'あ' } });
      expect([input.selectionStart, input.selectionEnd]).toEqual([7, 7]);
      await edit(editor, input, { value: 'first\nああsecond', caret: 8, init: { ...composing, data: 'ああ' } });
      expect([input.selectionStart, input.selectionEnd]).toEqual([8, 8]);
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true, data: 'ああ' }));
      await edit(editor, input, {
        value: 'first\nああsecond',
        caret: 8,
        init: { inputType: 'insertFromComposition', data: 'ああ' },
      });
      expect([input.selectionStart, input.selectionEnd]).toEqual([8, 8]);
      // Backspace removes the character before the caret: the second あ.
      await edit(editor, input, { value: 'first\nあsecond', caret: 7, init: { inputType: 'deleteContentBackward' } });
      expect([input.selectionStart, input.selectionEnd]).toEqual([7, 7]);
      // Delete removes the character after it: the s of "second".
      await edit(editor, input, { value: 'first\nあecond', caret: 7, init: { inputType: 'deleteContentForward' } });
      expect([input.selectionStart, input.selectionEnd]).toEqual([7, 7]);
      expect(input.value).toBe('first\nあecond');
    });

    it('keeps a selection made while editing when the next update renders', async () => {
      const { editor, input } = await openEditor('abcdef');
      input.setSelectionRange(1, 4);
      editor.placeholder = 'changed';
      await editor.updateComplete;
      expect([input.selectionStart, input.selectionEnd]).toEqual([1, 4]);
    });
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
