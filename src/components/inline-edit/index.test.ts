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
  /** What the box is sized by while editing: the hidden copy of the text under the field. */
  const sizer = (editor: DpkComponentInlineEdit): HTMLElement | null | undefined =>
    editor.shadowRoot?.querySelector<HTMLElement>('.box > .view[aria-hidden="true"]');

  it('edits over a hidden copy of the text, so the box keeps its size and grows only with the draft', async () => {
    for (const mode of ['line', 'wrap', 'multiline'] as const) {
      const editor = new DpkComponentInlineEdit();
      editor.value = 'a name long enough to wrap onto two lines';
      editor.wrap = mode === 'wrap';
      editor.multiline = mode === 'multiline';
      document.body.append(editor);
      await editor.updateComplete;
      const view = editor.shadowRoot?.querySelector('.box > .view');
      editor.startEditing();
      await editor.updateComplete;
      // The very element that showed the text stays in place and keeps the box.
      expect(sizer(editor)).toBe(view);
      expect(sizer(editor)?.textContent).toBe('a name long enough to wrap onto two lines');
      const field = editor.shadowRoot?.querySelector<HTMLInputElement | HTMLTextAreaElement>('.box > .field');
      if (!field) throw new Error(`missing field (${mode})`);
      field.value = 'short';
      field.dispatchEvent(new Event('input'));
      await editor.updateComplete;
      expect(sizer(editor)?.textContent).toBe('short');
      editor.remove();
    }
  });

  it('keeps an empty draft as wide as its placeholder, and a last empty line as tall as a line', async () => {
    const editor = new DpkComponentInlineEdit();
    editor.value = 'Notes';
    editor.placeholder = 'Add a note';
    editor.multiline = true;
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const field = editor.shadowRoot?.querySelector('textarea');
    if (!field) throw new Error('missing field');
    expect(field.placeholder).toBe('Add a note');
    field.value = '';
    field.dispatchEvent(new Event('input'));
    await editor.updateComplete;
    expect(sizer(editor)?.textContent).toBe('Add a note');
    field.value = 'one\n';
    field.dispatchEvent(new Event('input'));
    await editor.updateComplete;
    expect(sizer(editor)?.textContent).toBe('one\n\u200b');
  });

  it('shows the text again, with the edit committed, once the field leaves', async () => {
    const editor = new DpkComponentInlineEdit();
    editor.value = 'old';
    document.body.append(editor);
    await editor.updateComplete;
    editor.startEditing();
    await editor.updateComplete;
    const input = editor.shadowRoot?.querySelector('input');
    if (!input) throw new Error('missing field');
    input.value = 'new';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector('.field')).toBeNull();
    expect(editor.shadowRoot?.querySelector('.view')?.getAttribute('aria-hidden')).toBeNull();
  });
  describe('markdown', () => {
    const mountMarkdown = async (value: string): Promise<DpkComponentInlineEdit> => {
      const editor = new DpkComponentInlineEdit();
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
      expect(editor.shadowRoot?.querySelector('textarea')?.value).toBe('**Note**\n- one\n- two');
      expect(sizer(editor)?.textContent).toBe('**Note**\n- one\n- two');
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
      expect(editor.shadowRoot?.querySelector('textarea')).toBeNull();

      editor.shadowRoot?.querySelector<HTMLElement>('.view')?.click();
      await editor.updateComplete;
      expect(editor.shadowRoot?.querySelector('textarea')).not.toBeNull();
    });

    it('shows the placeholder while there is nothing to format', async () => {
      const editor = await mountMarkdown('');
      editor.placeholder = 'Add a note';
      await editor.updateComplete;
      const view = editor.shadowRoot?.querySelector('.view');
      expect(view?.textContent?.trim()).toBe('Add a note');
      expect(view?.getAttribute('data-empty')).toBe('true');
    });
  });
  it('names the whole value on a truncated view, where the line may end in an ellipsis', async () => {
    const editor = new DpkComponentInlineEdit();
    editor.value = 'a label far too long for its chip';
    editor.truncate = true;
    document.body.append(editor);
    await editor.updateComplete;
    expect(editor.hasAttribute('truncate')).toBe(true);
    expect(editor.shadowRoot?.querySelector('.view')?.getAttribute('title')).toBe('a label far too long for its chip');
  });
});
