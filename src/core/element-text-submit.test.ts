// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkCommentPanel } from '../components/comment-panel/index';
import type { DpkInlineEdit } from '../components/inline-edit/index';
import type { DpkViewPlain } from '../views/plain/element';

import { DraftController } from './controller';
import { tinyBase, tinyDefinition } from './testing/tiny-template';
import { setPageTextSubmitKey } from './text-submit-controller';
import '../index';

const STORAGE_KEY = 'dev-process-kit:text-submit-key';

const mount = (storage: string): DpkViewPlain => {
  document.body.innerHTML = `
    <dpk-view-plain storage="${storage}">
      <script type="application/json">${JSON.stringify({ title: 'Cancel orders' })}</script>
      <section slot="main"><p>Body</p></section>
    </dpk-view-plain>`;
  const element = document.querySelector('dpk-view-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkViewPlain;
};

const settle = async (element: HTMLElement & { updateComplete: Promise<unknown> }): Promise<void> => {
  for (let i = 0; i < 4; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

const shadow = (element: Element): ShadowRoot => {
  if (!element.shadowRoot) throw new Error('no shadow root');
  return element.shadowRoot;
};

const pickInSettings = async (element: DpkViewPlain, key: string): Promise<void> => {
  shadow(element).querySelector<HTMLButtonElement>('.dpk-settings-trigger')?.click();
  await settle(element);
  const choice = shadow(element).querySelector<HTMLButtonElement>(`[data-text-submit-choice="${key}"]`);
  if (!choice) throw new Error(`no ${key} choice`);
  choice.click();
  await settle(element);
};

const press = (field: HTMLTextAreaElement, init: KeyboardEventInit): boolean => {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    composed: true,
    cancelable: true,
    ...init,
  });
  field.dispatchEvent(event);
  return event.defaultPrevented;
};

beforeEach(() => localStorage.clear());
afterEach(() => {
  setPageTextSubmitKey('mod-enter');
  document.body.replaceChildren();
  localStorage.clear();
});

describe('the page-wide text-submit key', () => {
  it('offers the three keys in the settings dialog, Ctrl/Command+Enter picked by default', async () => {
    const element = mount('on');
    await element.api.ready;
    await pickInSettings(element, 'mod-enter');
    const choices = [...shadow(element).querySelectorAll('[data-text-submit-choice]')];
    expect(choices.map((choice) => choice.textContent?.trim())).toEqual(['Enter', 'Ctrl + Enter', 'Shift + Enter']);
    expect(choices.map((choice) => choice.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps the pick across a reload and makes every multi-line form follow it', async () => {
    const element = mount('on');
    await element.api.ready;
    await pickInSettings(element, 'enter');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toBe('enter');
    expect(document.documentElement.dataset['dpkTextSubmit']).toBe('enter');

    // A reload: the attribute is gone until the page reads the stored pick back.
    setPageTextSubmitKey('mod-enter');
    const reloaded = mount('on');
    await reloaded.api.ready;
    await settle(reloaded);
    expect(document.documentElement.dataset['dpkTextSubmit']).toBe('enter');

    const editor = document.createElement('dpk-inline-edit') as DpkInlineEdit;
    editor.value = 'old';
    editor.multiline = true;
    const panel = document.createElement('dpk-comment-panel') as DpkCommentPanel;
    const controller = new DraftController({ definition: tinyDefinition, base: tinyBase([]), storage: null });
    panel.definition = tinyDefinition;
    panel.state = controller.derivation.state;
    panel.derivation = controller.derivation;
    document.body.append(editor);
    reloaded.after(panel);
    await settle(editor);
    editor.startEditing();
    await settle(editor);
    const commit = vi.fn();
    editor.addEventListener('dpk-commit', commit);
    const editField = shadow(editor).querySelector('textarea');
    if (!editField) throw new Error('no editor field');
    editField.value = 'old\nmore';
    editField.dispatchEvent(new Event('input'));
    expect(press(editField, { shiftKey: true })).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    expect(press(editField, {})).toBe(true);
    expect(commit).toHaveBeenCalledOnce();

    const comment = vi.fn(() => ({ ok: true, id: 'c' }) as const);
    panel.onComment = comment;
    await settle(panel);
    const composer = shadow(panel).querySelector('textarea');
    if (!composer) throw new Error('no composer');
    composer.value = 'note';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(panel);
    expect(press(composer, { ctrlKey: true })).toBe(true);
    expect(composer.value).toBe('note\n');
    expect(comment).not.toHaveBeenCalled();
    expect(press(composer, {})).toBe(true);
    expect(comment).toHaveBeenCalledOnce();
  });

  it('stores nothing with storage="memory", yet applies the pick to the page', async () => {
    const element = mount('memory');
    await element.api.ready;
    await pickInSettings(element, 'shift-enter');
    expect(document.documentElement.dataset['dpkTextSubmit']).toBe('shift-enter');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
