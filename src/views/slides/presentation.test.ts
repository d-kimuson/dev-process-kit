/**
 * Speaker notes and presentation mode: what the reader writes into a deck and how
 * they view it. It runs in happy-dom (the default environment) on purpose — the
 * presentation surface is a fixed overlay the view owns, not the browser's full
 * screen, so nothing here needs a browser-only API.
 */
import { afterEach, describe, expect, it } from 'vitest';

import type { DpkViewSlides } from './element';

import '../../index';
import { parseSlidesBase } from './model';

const DECK = {
  title: '楽観的ロックを 5 分で',
  slides: [
    { id: 'cover', layout: 'title', title: '楽観的ロック', notes: 'まず結論から話す。' },
    { id: 'problem', title: '何が起きるか', points: ['後勝ちで上書きされる'], notes: 'ここで実際の画面を見せる。' },
    { id: 'how', layout: 'section', title: '仕組み' },
  ],
};

type MountOptions = {
  readonly hash?: string;
  readonly base?: unknown;
  readonly attrs?: string;
  readonly markup?: string;
};

const mount = (options: MountOptions = {}): DpkViewSlides => {
  window.location.hash = options.hash ?? '';
  document.body.innerHTML = `
    <dpk-view-slides${options.attrs ?? ' storage="memory"'}>
      <script type="application/json">${JSON.stringify(options.base ?? DECK)}</script>
      ${options.markup ?? ''}
    </dpk-view-slides>`;
  const element = document.querySelector('dpk-view-slides');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkViewSlides;
};

const settle = async (element: DpkViewSlides): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

const root = (element: DpkViewSlides): ShadowRoot => {
  if (element.shadowRoot === null) throw new Error('no shadow root');
  return element.shadowRoot;
};

const notesField = (element: DpkViewSlides): HTMLTextAreaElement => {
  const field = root(element).querySelector<HTMLTextAreaElement>('.slide-notes-input');
  if (field === null) throw new Error('no notes field');
  return field;
};

const commentField = (element: DpkViewSlides): HTMLTextAreaElement => {
  const field = root(element).querySelector<HTMLTextAreaElement>('.slide-comment-input');
  if (field === null) throw new Error('no comment field');
  return field;
};

const type = (field: HTMLTextAreaElement, text: string): void => {
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};

/** Focus as a click would, so the kit's unsent-text recovery files the field. */
const focus = (field: HTMLTextAreaElement): void => {
  field.focus();
  field.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
};

const press = (key: string, target: EventTarget = document.body): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

const typeIntoNotes = async (element: DpkViewSlides, text: string): Promise<void> => {
  const field = notesField(element);
  focus(field);
  await settle(element);
  type(field, text);
  await settle(element);
};

const presentation = (element: DpkViewSlides): Element | null => root(element).querySelector('.presentation');

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
  sessionStorage.clear();
  localStorage.clear();
});

describe('speaker notes', () => {
  it('keeps notes in a pane of their own, never on the slide', async () => {
    const element = mount({ hash: '#slide=problem' });
    await settle(element);
    expect(notesField(element).value).toBe('ここで実際の画面を見せる。');
    // The pane sits under the stage; the slide itself only ever shows what is projected.
    expect(root(element).querySelector('.slide .slide-notes-input')).toBeNull();
    expect(root(element).querySelector('.slide')?.textContent).not.toContain('ここで実際の画面を見せる。');
    expect(root(element).querySelector('.deck-bar')?.nextElementSibling?.classList.contains('slide-notes')).toBe(true);
  });

  it('writes the notes on an explicit submit, not on typing', async () => {
    const element = mount({ hash: '#slide=how' });
    await settle(element);
    const save = (): HTMLButtonElement | null => root(element).querySelector<HTMLButtonElement>('.slide-notes-save');
    expect(save()?.disabled).toBe(true);
    type(notesField(element), 'ここで図を指す');
    await settle(element);
    expect(element.api.actions).toHaveLength(0);
    expect(save()?.disabled).toBe(false);
    save()?.click();
    await settle(element);
    expect(element.api.actions.map((action) => [action.type, action.target, action.payload])).toEqual([
      ['SET_SLIDE_NOTES', { type: 'slide', id: 'how' }, { notes: 'ここで図を指す' }],
    ]);
    expect(element.api.state.slides.find((slide) => slide.id === 'how')?.notes).toBe('ここで図を指す');
    // Saved: the field now starts from what it holds, so nothing is left to save.
    expect(save()?.disabled).toBe(true);
  });

  it('saves with Cmd/Ctrl+Enter and leaves an IME composition alone', async () => {
    const element = mount({ hash: '#slide=how' });
    await settle(element);
    type(notesField(element), '変換中');
    await settle(element);
    notesField(element).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true, bubbles: true, composed: true }),
    );
    await settle(element);
    expect(element.api.actions).toHaveLength(0);
    notesField(element).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true, composed: true, cancelable: true }),
    );
    await settle(element);
    expect(element.api.actions.map((action) => action.payload)).toEqual([{ notes: '変換中' }]);
  });

  it('collapses adjacent notes edits into one change', async () => {
    const element = mount({ hash: '#slide=how' });
    await settle(element);
    for (const text of ['一つ目', '二つ目']) {
      type(notesField(element), text);
      await settle(element);
      root(element).querySelector<HTMLButtonElement>('.slide-notes-save')?.click();
      await settle(element);
    }
    expect(element.api.actions).toHaveLength(1);
    expect(element.api.state.slides.find((slide) => slide.id === 'how')?.notes).toBe('二つ目');
  });

  it('shows a notes edit under Changes, not as a comment', async () => {
    const element = mount({ hash: '#slide=how', attrs: ' storage="memory" notes="changes"' });
    await settle(element);
    await typeIntoNotes(element, 'ここで図を指す');
    root(element).querySelector<HTMLButtonElement>('.slide-notes-save')?.click();
    await settle(element);
    // The rail counts it as a change and never as a comment.
    expect(
      root(element).querySelector('.dpk-review-toggle[data-section="changes"] .dpk-review-badge')?.textContent,
    ).toBe('1');
    expect(root(element).querySelector('.dpk-review-toggle[data-section="comments"] .dpk-review-badge')).toBeNull();
    const panel = root(element).querySelector('dpk-comment-panel');
    // The rail is on its changes section, so it lists one group: the edit itself.
    expect(panel?.shadowRoot?.querySelector('header h2')?.textContent?.trim()).toBe('Changes');
    const item = panel?.shadowRoot?.querySelector('.groups .item');
    expect(item?.querySelector('.item-title')?.textContent?.trim()).toBe('Speaker notes');
    expect(item?.querySelector('.item-target')?.textContent).toContain('3. 仕組み');
    expect(item?.querySelector('.item-code')?.textContent).toContain('SET_SLIDE_NOTES slide:how');
  });

  it('keeps unsent notes with their slide while the reader moves through the deck', async () => {
    const element = mount({ hash: '#slide=problem' });
    await settle(element);
    await typeIntoNotes(element, '書きかけのノート');
    root(element).querySelector<HTMLButtonElement>('.deck-next')?.click();
    await settle(element);
    expect(element.navigation['slide']).toBe('how');
    expect(notesField(element).value).toBe('');
    root(element).querySelector<HTMLButtonElement>('.deck-prev')?.click();
    await settle(element);
    expect(notesField(element).value).toBe('書きかけのノート');
    expect(element.api.actions).toHaveLength(0);
  });

  it('gives unsent notes back after a reload-style remount', async () => {
    const element = mount({ hash: '#slide=problem', attrs: ' storage-key="slides-notes-recovery"' });
    await settle(element);
    await typeIntoNotes(element, '消えてもらっては困る');

    const remounted = mount({ hash: '#slide=problem', attrs: ' storage-key="slides-notes-recovery"' });
    await settle(remounted);
    expect(notesField(remounted).value).toBe('ここで実際の画面を見せる。');
    const field = notesField(remounted);
    focus(field);
    await settle(remounted);
    expect(field.value).toBe('消えてもらっては困る');
    expect(remounted.api.actions).toHaveLength(0);
  });

  it('goes stale when its slide is removed from the base', async () => {
    const element = mount({ hash: '#slide=how' });
    await settle(element);
    await typeIntoNotes(element, '消えるスライドのノート');
    root(element).querySelector<HTMLButtonElement>('.slide-notes-save')?.click();
    await settle(element);
    element.controller.setBase(parseSlidesBase({ title: 'x', slides: [{ id: 'cover', title: 'Cover' }] }));
    expect(element.api.stale.map((entry) => [entry.action.type, entry.action.target, entry.reason])).toEqual([
      ['SET_SLIDE_NOTES', { type: 'slide', id: 'how' }, 'target-missing'],
    ]);
  });
});

describe('presentation mode', () => {
  it('shows the slide as the whole screen, without the outline or the deck bar', async () => {
    const element = mount();
    await settle(element);
    root(element).querySelector<HTMLButtonElement>('.deck-present')?.click();
    await settle(element);
    expect(presentation(element)).not.toBeNull();
    expect(root(element).querySelector('.presentation .slide')).not.toBeNull();
    expect(root(element).querySelector('.outline')).toBeNull();
    expect(root(element).querySelector('.deck-bar')).toBeNull();
    expect(root(element).querySelector('.slide-comments')).toBeNull();
    // Viewing state, stored in the hash like the slide on screen.
    expect(window.location.hash).toBe('#present=1&slide=cover');
    expect(element.api.actions).toHaveLength(0);
    expect(element.navigation['present']).toBe('1');
  });

  it('enters from `data-dpk-navigate="present=1"` in the author markup', async () => {
    const element = mount({ markup: '<button class="present-me" data-dpk-navigate="present=1">Present</button>' });
    await settle(element);
    element.querySelector<HTMLButtonElement>('.present-me')?.click();
    await settle(element);
    expect(presentation(element)).not.toBeNull();
    expect(window.location.hash).toBe('#present=1&slide=cover');
  });

  it('opens on a deep link and canonicalizes the hash', async () => {
    const element = mount({ hash: '#present=1&slide=problem' });
    await settle(element);
    expect(presentation(element)).not.toBeNull();
    expect(root(element).querySelector('.slide-title')?.textContent?.trim()).toBe('何が起きるか');
    expect(window.location.hash).toBe('#present=1&slide=problem');
  });

  it('leaves a part of the hash that means no presentation out of it', async () => {
    const element = mount({ hash: '#present=0&slide=problem' });
    await settle(element);
    expect(presentation(element)).toBeNull();
    expect(window.location.hash).toBe('#slide=problem');
  });

  it('moves with the same keys, clamped at either end of the deck', async () => {
    const element = mount({ hash: '#present=1&slide=problem' });
    await settle(element);
    press('ArrowRight');
    await settle(element);
    expect(element.navigation['slide']).toBe('how');
    press('PageDown');
    await settle(element);
    expect(element.navigation['slide']).toBe('how');
    press('PageUp');
    await settle(element);
    expect(element.navigation['slide']).toBe('problem');
    press('Home');
    await settle(element);
    expect(element.navigation['slide']).toBe('cover');
    press('ArrowLeft');
    await settle(element);
    expect(element.navigation['slide']).toBe('cover');
    press('End');
    await settle(element);
    expect(element.navigation['slide']).toBe('how');
    expect(window.location.hash).toBe('#present=1&slide=how');
  });

  it('leaves on Escape and on its exit control, keeping the slide it was on', async () => {
    const element = mount({ hash: '#present=1&slide=problem' });
    await settle(element);
    press('Escape');
    await settle(element);
    expect(presentation(element)).toBeNull();
    expect(window.location.hash).toBe('#slide=problem');
    expect(root(element).querySelector('.outline')).not.toBeNull();
    expect(element.api.actions).toHaveLength(0);

    root(element).querySelector<HTMLButtonElement>('.deck-present')?.click();
    await settle(element);
    root(element).querySelector<HTMLButtonElement>('.presentation-exit')?.click();
    await settle(element);
    expect(presentation(element)).toBeNull();
    expect(window.location.hash).toBe('#slide=problem');
  });

  it('leaves Escape to the review rail while the rail is open', async () => {
    const element = mount({ hash: '#present=1', attrs: ' storage="memory" notes="on"' });
    await settle(element);
    expect(element.notesOpen).toBe(true);
    press('Escape');
    await settle(element);
    expect(element.notesOpen).toBe(false);
    expect(presentation(element)).not.toBeNull();
    press('Escape');
    await settle(element);
    expect(presentation(element)).toBeNull();
  });

  it('shows the speaker notes to the presenter, away from the slide', async () => {
    const element = mount({ hash: '#present=1&slide=problem' });
    await settle(element);
    expect(root(element).querySelector('.presentation-notes')?.textContent).toContain('ここで実際の画面を見せる。');
    expect(root(element).querySelector('.slide')?.textContent).not.toContain('ここで実際の画面を見せる。');
    // A presenter aid, not another field to write in while presenting.
    expect(root(element).querySelector('.presentation-notes textarea')).toBeNull();

    press('End');
    await settle(element);
    expect(root(element).querySelector('.presentation-notes')).toBeNull();
  });

  it('keeps an unsent comment through the round trip', async () => {
    const element = mount({ hash: '#slide=problem' });
    await settle(element);
    type(commentField(element), '書きかけのコメント');
    await settle(element);
    root(element).querySelector<HTMLButtonElement>('.deck-present')?.click();
    await settle(element);
    expect(root(element).querySelector('.slide-comment-input')).toBeNull();
    root(element).querySelector<HTMLButtonElement>('.presentation-exit')?.click();
    await settle(element);
    expect(commentField(element).value).toBe('書きかけのコメント');
    expect(element.api.actions).toHaveLength(0);
  });

  it('offers the browser’s full screen only where the document allows it', async () => {
    const element = mount({ hash: '#present=1' });
    await settle(element);
    expect(root(element).querySelector('.deck-fullscreen')).toBeNull();

    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    try {
      const allowed = mount({ hash: '#present=1' });
      await settle(allowed);
      expect(root(allowed).querySelector('.deck-fullscreen')).not.toBeNull();
    } finally {
      Reflect.deleteProperty(document, 'fullscreenEnabled');
    }
  });

  it('does not react to the keys of a deck that is not showing', async () => {
    window.location.hash = '';
    document.body.innerHTML = `
      <div hidden class="other-page">
        <dpk-view-slides storage="memory" class="other">
          <script type="application/json">${JSON.stringify(DECK)}</script>
        </dpk-view-slides>
      </div>
      <dpk-view-slides storage="memory" class="shown">
        <script type="application/json">${JSON.stringify(DECK)}</script>
      </dpk-view-slides>`;
    const other = document.querySelector<DpkViewSlides>('.other');
    const shown = document.querySelector<DpkViewSlides>('.shown');
    if (other === null || shown === null) throw new Error('element did not upgrade');
    await settle(other);
    await settle(shown);

    press('ArrowRight');
    await settle(shown);
    await settle(other);
    expect(shown.navigation['slide']).toBe('problem');
    expect(other.navigation['slide']).toBe('cover');

    other.hidden = false;
    document.querySelector('.other-page')?.removeAttribute('hidden');
    press('ArrowRight');
    await settle(other);
    expect(other.navigation['slide']).toBe('problem');
  });
});
