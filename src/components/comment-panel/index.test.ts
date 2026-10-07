// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DraftController } from '../../core/controller';
import { tinyBase, tinyDefinition } from '../../core/testing/tiny-template';
import { DpkComponentCommentPanel, defineCommentPanel } from './index';

defineCommentPanel();
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
const mount = async () => {
  const panel = new DpkComponentCommentPanel();
  const controller = new DraftController({
    definition: tinyDefinition,
    base: tinyBase([{ id: 'a', name: 'Alpha' }]),
    storage: null,
  });
  panel.definition = tinyDefinition;
  panel.state = controller.derivation.state;
  panel.derivation = controller.derivation;
  document.body.append(panel);
  await panel.updateComplete;
  return panel;
};
const enter = async (panel: DpkComponentCommentPanel, text: string) => {
  const area = panel.shadowRoot?.querySelector('textarea');
  if (!area) throw new Error('missing composer');
  area.value = text;
  area.dispatchEvent(new Event('input', { bubbles: true }));
  await panel.updateComplete;
  return area;
};

describe('comment panel adapter', () => {
  it('keeps rejected input and clears accepted input', async () => {
    const panel = await mount();
    const callback = vi.fn(() => ({ ok: false, issues: [] }) as const);
    panel.onComment = callback;
    const area = await enter(panel, 'note');
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
    await panel.updateComplete;
    expect(callback).toHaveBeenCalledWith('page:tiny', 'note');
    expect(area.value).toBe('note');
    panel.onComment = () => ({ ok: true, id: 'comment' });
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
    await panel.updateComplete;
    expect(area.value).toBe('');
  });
  it('does not submit during IME composition and focuses an explicit target after rendering', async () => {
    const panel = await mount();
    panel.onComment = vi.fn(() => ({ ok: true, id: 'comment' }) as const);
    panel.pendingTarget = 'item:a';
    await panel.updateComplete;
    const area = await enter(panel, '変換中');
    expect(panel.shadowRoot?.activeElement).toBe(area);
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true }));
    expect(panel.onComment).not.toHaveBeenCalled();
  });
  it('copies the host brief with its one copy button', async () => {
    const panel = await mount();
    const controller = new DraftController({ definition: tinyDefinition, base: tinyBase([]), storage: null });
    controller.dispatch({ type: 'comment', target: 'page:tiny', payload: { body: 'note' } });
    panel.derivation = controller.derivation;
    await panel.updateComplete;
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    try {
      panel.exportBrief = () => 'canonical brief';
      const buttons = [...(panel.shadowRoot?.querySelectorAll('button') ?? [])];
      expect(buttons.filter((b) => b.textContent?.trim().startsWith('Copy'))).toHaveLength(1);
      const button = buttons.find((b) => b.textContent?.trim() === 'Copy changes & comments');
      if (!button) throw new Error('missing Copy button');
      button.click();
      await Promise.resolve();
      expect(writeText).toHaveBeenCalledWith('canonical brief');
    } finally {
      vi.unstubAllGlobals();
    }
  });
  describe('editing a posted comment', () => {
    const mountWithComment = async () => {
      const panel = await mount();
      const controller = new DraftController({ definition: tinyDefinition, base: tinyBase([]), storage: null });
      const posted = controller.dispatch({ type: 'comment', target: 'page:tiny', payload: { body: 'before' } });
      if (!posted.ok) throw new Error('comment rejected');
      const sync = () => {
        panel.derivation = controller.derivation;
      };
      panel.onEditComment = vi.fn((id: string, body: string) => {
        const outcome = controller.editComment(id, body);
        sync();
        return outcome;
      });
      sync();
      await panel.updateComplete;
      return { panel, controller, id: posted.id };
    };
    const root = (panel: DpkComponentCommentPanel): ShadowRoot => {
      if (!panel.shadowRoot) throw new Error('no shadow root');
      return panel.shadowRoot;
    };
    const editor = (panel: DpkComponentCommentPanel) =>
      root(panel).querySelector<HTMLTextAreaElement>('.item-editor textarea');
    const type = async (panel: DpkComponentCommentPanel, text: string) => {
      const area = editor(panel);
      if (!area) throw new Error('no editor');
      area.value = text;
      area.dispatchEvent(new Event('input', { bubbles: true }));
      await panel.updateComplete;
      return area;
    };
    const startEdit = async (panel: DpkComponentCommentPanel) => {
      root(panel).querySelector<HTMLButtonElement>('.item-edit')?.click();
      await panel.updateComplete;
    };

    it('opens an editor on the comment with its text, focused', async () => {
      const { panel } = await mountWithComment();
      const edit = root(panel).querySelector<HTMLButtonElement>('.item-edit');
      expect(edit?.getAttribute('aria-label')).toBe('Edit this comment');
      await startEdit(panel);
      expect(editor(panel)?.value).toBe('before');
      expect(root(panel).activeElement).toBe(editor(panel));
      expect(root(panel).querySelector('.item-body')).toBeNull();
    });

    it('saves with Ctrl/Cmd+Enter and shows the new text', async () => {
      const { panel, controller, id } = await mountWithComment();
      await startEdit(panel);
      const area = await type(panel, '  after  ');
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true }));
      await panel.updateComplete;
      expect(panel.onEditComment).toHaveBeenCalledWith(id, 'after');
      expect(controller.actions[0]?.payload).toEqual({ body: 'after' });
      expect(editor(panel)).toBeNull();
      expect(root(panel).querySelector('.item-body')?.textContent).toBe('after');
      expect(root(panel).activeElement).toBe(root(panel).querySelector('.item-edit'));
    });

    it('cancels with Escape, keeping the posted text', async () => {
      const { panel, controller } = await mountWithComment();
      await startEdit(panel);
      const area = await type(panel, 'discarded');
      const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true });
      area.dispatchEvent(escape);
      await panel.updateComplete;
      expect(escape.defaultPrevented).toBe(true);
      expect(panel.onEditComment).not.toHaveBeenCalled();
      expect(editor(panel)).toBeNull();
      expect(controller.actions[0]?.payload).toEqual({ body: 'before' });
    });

    it('does not save during IME composition, nor a blank comment', async () => {
      const { panel } = await mountWithComment();
      await startEdit(panel);
      const area = await type(panel, '変換中');
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true }));
      await type(panel, '   ');
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
      await panel.updateComplete;
      expect(panel.onEditComment).not.toHaveBeenCalled();
      const save = [...root(panel).querySelectorAll<HTMLButtonElement>('.item-editor button')].find(
        (button) => button.textContent?.trim() === 'Save',
      );
      expect(save?.disabled).toBe(true);
    });

    it('keeps the editor and its text when the host rejects the edit', async () => {
      const { panel } = await mountWithComment();
      panel.onEditComment = vi.fn(() => ({ ok: false, issues: [] }) as const);
      await startEdit(panel);
      const area = await type(panel, 'rejected');
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
      await panel.updateComplete;
      expect(editor(panel)?.value).toBe('rejected');
    });

    it('has no edit button without a host callback', async () => {
      const { panel } = await mountWithComment();
      panel.onEditComment = undefined;
      await panel.updateComplete;
      expect(root(panel).querySelector('.item-edit')).toBeNull();
    });
  });
});
