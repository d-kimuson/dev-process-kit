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
  it('copies the host brief instead of generating a second format', async () => {
    const panel = await mount();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    try {
      panel.exportBrief = () => 'canonical brief';
      const button = [...(panel.shadowRoot?.querySelectorAll('button') ?? [])].find(
        (b) => b.textContent?.trim() === 'Copy brief',
      );
      if (!button) throw new Error('missing Copy brief button');
      button.click();
      await Promise.resolve();
      expect(writeText).toHaveBeenCalledWith('canonical brief');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
