// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DpkTemplateSlides } from './element';

import '../../index';
import { slidesDefinitionFor, slidesHasTarget } from './definition';
import { slideKeyStep, stepSlide } from './interactions';
import { slidesMessages } from './messages';
import { parseSlidesBase } from './model';
import {
  describeSlidesAction,
  resolveSlidesNavigation,
  slideComments,
  slidePosition,
  slidesCommentTargets,
  slidesCurrentTarget,
  slidesTargetLabel,
} from './present';

const m = slidesMessages('en');

const base = {
  title: '楽観的ロックを 5 分で',
  slides: [
    { id: 'cover', layout: 'title', title: '楽観的ロック', subtitle: '更新の衝突を検出する' },
    { id: 'problem', title: '何が起きるか', points: ['同時に編集する', '後勝ちで上書きされる'] },
    { id: 'how', layout: 'section', title: '仕組み' },
    { id: 'flow', title: '更新の流れ' },
  ],
};

describe('slides base data', () => {
  it('fills defaults and keeps the authored order', () => {
    expect(parseSlidesBase({})).toEqual({ title: '', slides: [] });
    const state = parseSlidesBase(base);
    expect(state.slides.map((slide) => slide.id)).toEqual(['cover', 'problem', 'how', 'flow']);
    expect(state.slides[3]).toEqual({
      id: 'flow',
      layout: 'content',
      title: '更新の流れ',
      subtitle: '',
      points: [],
    });
  });

  it('rejects duplicate ids, bad ids, unknown layouts and unknown keys', () => {
    expect(() =>
      parseSlidesBase({
        slides: [
          { id: 'a', title: 'A' },
          { id: 'a', title: 'B' },
        ],
      }),
    ).toThrow(/duplicate slide id/);
    expect(() => parseSlidesBase({ slides: [{ id: 'a.b', title: 'A' }] })).toThrow();
    expect(() => parseSlidesBase({ slides: [{ id: 'a', title: 'A', layout: 'grid' }] })).toThrow();
    expect(() => parseSlidesBase({ slides: [{ id: 'a', title: 'A', body: 'x' }] })).toThrow();
    // What the reader needs belongs on the slide: there are no speaker notes.
    expect(() => parseSlidesBase({ slides: [{ id: 'a', title: 'A', notes: 'x' }] })).toThrow();
    expect(() => parseSlidesBase({ title: 'x', typo: 1 })).toThrow();
  });
});

describe('slides navigation', () => {
  const state = parseSlidesBase(base);

  it('opens on the first slide and falls back to it for an unknown one', () => {
    expect(resolveSlidesNavigation(state, {})).toEqual({ slide: 'cover' });
    expect(resolveSlidesNavigation(state, { slide: 'how' })).toEqual({ slide: 'how' });
    expect(resolveSlidesNavigation(state, { slide: 'gone', other: 'x' })).toEqual({ slide: 'cover', other: 'x' });
    expect(resolveSlidesNavigation(parseSlidesBase({}), { slide: 'gone' })).toEqual({});
  });

  it('positions the current slide between its neighbours', () => {
    const position = slidePosition(state, { slide: 'problem' });
    expect(position?.index).toBe(1);
    expect(position?.total).toBe(4);
    expect(position?.previous?.id).toBe('cover');
    expect(position?.next?.id).toBe('how');
    expect(slidePosition(state, { slide: 'cover' })?.previous).toBeUndefined();
    expect(slidePosition(state, { slide: 'flow' })?.next).toBeUndefined();
    expect(slidePosition(parseSlidesBase({}), {})).toBeNull();
  });

  it('steps through the deck and stops at either end', () => {
    expect(stepSlide(state, 'problem', 'next')).toBe('how');
    expect(stepSlide(state, 'problem', 'previous')).toBe('cover');
    expect(stepSlide(state, 'flow', 'next')).toBe('flow');
    expect(stepSlide(state, 'cover', 'previous')).toBe('cover');
    expect(stepSlide(state, 'how', 'first')).toBe('cover');
    expect(stepSlide(state, 'cover', 'last')).toBe('flow');
    expect(stepSlide(state, 'gone', 'next')).toBe('problem');
    expect(stepSlide(parseSlidesBase({}), undefined, 'next')).toBeUndefined();
  });

  it('maps presentation keys and leaves everything else alone', () => {
    expect(slideKeyStep({ key: 'ArrowRight' })).toBe('next');
    expect(slideKeyStep({ key: 'PageDown' })).toBe('next');
    expect(slideKeyStep({ key: 'ArrowLeft' })).toBe('previous');
    expect(slideKeyStep({ key: 'PageUp' })).toBe('previous');
    expect(slideKeyStep({ key: 'Home' })).toBe('first');
    expect(slideKeyStep({ key: 'End' })).toBe('last');
    // Vertical arrows keep scrolling the page; modified keys belong to the browser.
    expect(slideKeyStep({ key: 'ArrowDown' })).toBeNull();
    expect(slideKeyStep({ key: 'ArrowRight', altKey: true })).toBeNull();
    expect(slideKeyStep({ key: 'ArrowLeft', metaKey: true })).toBeNull();
    expect(slideKeyStep({ key: 'ArrowRight', ctrlKey: true })).toBeNull();
    expect(slideKeyStep({ key: 'ArrowRight', shiftKey: true })).toBeNull();
  });
});

describe('slides definition', () => {
  const state = parseSlidesBase(base);
  const definition = slidesDefinitionFor('en');

  it('offers every slide as a comment target and the current one as the attachment', () => {
    expect(slidesCommentTargets(m, state).map((option) => option.value)).toEqual([
      'slide:cover',
      'slide:problem',
      'slide:how',
      'slide:flow',
    ]);
    expect(slidesCurrentTarget(m, state, { slide: 'how' })).toEqual({
      value: 'slide:how',
      label: '3. 仕組み',
      group: 'Slide',
    });
    expect(slidesCurrentTarget(m, parseSlidesBase({}), {})).toBeNull();
    expect(slidesHasTarget(state, { type: 'slide', id: 'flow' })).toBe(true);
    expect(slidesHasTarget(state, { type: 'slide', id: 'gone' })).toBe(false);
    expect(slidesHasTarget(state, { type: 'page', id: 'slides' })).toBe(true);
  });

  it('labels targets by position and never throws on a missing one', () => {
    expect(slidesTargetLabel(m, state, { type: 'slide', id: 'problem' })).toBe('2. 何が起きるか');
    expect(slidesTargetLabel(m, state, { type: 'slide', id: 'gone' })).toBe('gone');
    expect(slidesTargetLabel(m, state, { type: 'page', id: 'slides' })).toBe('Whole deck');
    const comment = {
      id: 'c',
      type: 'comment',
      target: { type: 'slide', id: 'flow' },
      payload: { body: 'x' },
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(describeSlidesAction(m, comment, state).targetLabel).toBe('4. 更新の流れ');
  });

  it('lists the comments on one slide, in the order they were written', () => {
    const at = (id: string, target: { type: string; id: string }, payload: unknown) => ({
      id,
      type: 'comment',
      target,
      payload,
      createdAt: '2026-01-01T00:00:00Z',
    });
    const comments = [
      at('a', { type: 'slide', id: 'flow' }, { body: '一つ目' }),
      at('b', { type: 'page', id: 'slides' }, { body: '全体' }),
      at('c', { type: 'slide', id: 'problem' }, { body: '別のスライド' }),
      at('d', { type: 'slide', id: 'flow' }, { body: '二つ目' }),
      at('e', { type: 'slide', id: 'flow' }, { broken: true }),
    ];
    expect(slideComments(comments, 'flow')).toEqual([
      { id: 'a', body: '一つ目' },
      { id: 'd', body: '二つ目' },
    ]);
    expect(slideComments(comments, 'how')).toEqual([]);
  });

  it('has no actions of its own and titles itself', () => {
    expect(definition.actions).toEqual({});
    expect(definition.title(state)).toBe('楽観的ロックを 5 分で');
    expect(definition.title(parseSlidesBase({}))).toBe('Slides');
  });
});

const mount = (hash = '', lang = ''): DpkTemplateSlides => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-template-slides storage="memory"${lang === '' ? '' : ` lang="${lang}"`}>
      <script type="application/json">${JSON.stringify(base)}</script>
      <section slot="preview" data-preview-id="flow"><p class="flow-body">本文</p></section>
      <section slot="preview" data-preview-id="problem"><p>問題の図</p></section>
    </dpk-template-slides>`;
  const element = document.querySelector('dpk-template-slides');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkTemplateSlides;
};

const settle = async (element: DpkTemplateSlides): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

const press = (key: string, target: EventTarget = document.body): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
};

const commentField = (element: DpkTemplateSlides): HTMLTextAreaElement | null =>
  element.shadowRoot?.querySelector<HTMLTextAreaElement>('.slide-comment-input') ?? null;

const type = (element: DpkTemplateSlides, text: string): void => {
  const field = commentField(element);
  if (field === null) throw new Error('no comment field');
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};

const keyInField = (element: DpkTemplateSlides, init: KeyboardEventInit): void => {
  commentField(element)?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, ...init }),
  );
};

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
  vi.restoreAllMocks();
});

describe('<dpk-template-slides>', () => {
  it('shows the first slide with its outline and counter', async () => {
    const element = mount();
    await settle(element);
    const root = element.shadowRoot;
    expect(root?.querySelector('.dpk-banner')).toBeNull();
    expect(root?.querySelector('.slide')?.getAttribute('data-layout')).toBe('title');
    expect(root?.querySelector('.slide-title')?.textContent?.trim()).toBe('楽観的ロック');
    expect(root?.querySelector('.slide-subtitle')?.textContent?.trim()).toBe('更新の衝突を検出する');
    expect(root?.querySelectorAll('.outline-row')).toHaveLength(4);
    expect(root?.querySelector('.outline-row[data-current="true"]')?.textContent).toContain('楽観的ロック');
    expect(root?.querySelector('.deck-counter')?.textContent?.replace(/\s+/g, '')).toBe('1/4');
    expect(window.location.hash).toBe('#slide=cover');
  });

  it('renders points and routes the slide body into the current slide', async () => {
    const element = mount('#slide=problem');
    await settle(element);
    const root = element.shadowRoot;
    expect([...(root?.querySelectorAll('.slide-points li') ?? [])].map((item) => item.textContent?.trim())).toEqual([
      '同時に編集する',
      '後勝ちで上書きされる',
    ]);
    // Every body has a slot (the others are parked), so none of them is an orphan.
    expect(root?.querySelector('.slide slot[name="preview:problem"]')).not.toBeNull();
    expect(root?.querySelector('.parked slot[name="preview:flow"]')).not.toBeNull();
    expect(element.querySelector('[data-preview-id="flow"]')?.getAttribute('slot')).toBe('preview:flow');
    expect(root?.querySelector('.dpk-orphans')?.hasAttribute('hidden')).toBe(true);
  });

  it('moves with the arrow keys, but not while the reader types', async () => {
    const element = mount();
    await settle(element);
    press('ArrowRight');
    await settle(element);
    expect(element.navigation['slide']).toBe('problem');
    press('End');
    await settle(element);
    expect(element.navigation['slide']).toBe('flow');
    press('ArrowRight');
    await settle(element);
    expect(element.navigation['slide']).toBe('flow');

    const field = document.createElement('textarea');
    element.append(field);
    press('ArrowLeft', field);
    await settle(element);
    expect(element.navigation['slide']).toBe('flow');
  });

  it('moves with the previous / next buttons and the outline', async () => {
    const element = mount('#slide=how');
    await settle(element);
    const root = element.shadowRoot;
    root?.querySelector<HTMLButtonElement>('.deck-next')?.click();
    await settle(element);
    expect(element.navigation['slide']).toBe('flow');
    expect(root?.querySelector<HTMLButtonElement>('.deck-next')?.disabled).toBe(true);
    root?.querySelector<HTMLButtonElement>('.deck-prev')?.click();
    await settle(element);
    expect(element.navigation['slide']).toBe('how');
    expect(root?.querySelector('.outline-row a')?.getAttribute('href')).toBe('#slide=cover');
  });

  it('comments on the slide on screen from the form beneath it', async () => {
    const element = mount('#slide=problem');
    await settle(element);
    const root = element.shadowRoot;
    const submit = root?.querySelector<HTMLButtonElement>('.slide-comment-submit');
    expect(submit?.disabled).toBe(true);
    type(element, 'ここがわからない');
    await settle(element);
    expect(submit?.disabled).toBe(false);
    submit?.click();
    await settle(element);
    expect(element.api.actions.map((action) => [action.target, action.payload])).toEqual([
      [{ type: 'slide', id: 'problem' }, { body: 'ここがわからない' }],
    ]);
    expect(commentField(element)?.value).toBe('');
    expect([...(root?.querySelectorAll('.slide-comment-body') ?? [])].map((body) => body.textContent)).toEqual([
      'ここがわからない',
    ]);
    expect(root?.querySelector('.outline-row[data-current="true"] .outline-note')?.textContent).toBe('1');
    expect(element.api.exportBrief()).toContain('slide:problem');
  });

  it('scrolls the comment list to the newest one, leaving the form where it is', async () => {
    const element = mount('#slide=problem');
    await settle(element);
    const scrolled = vi.spyOn(Element.prototype, 'scrollTop', 'set');
    element.api.comment('slide:problem', '一つ目');
    await settle(element);
    expect(scrolled).toHaveBeenCalledTimes(1);
    // Typing re-renders, but the list has not changed: the reader's scroll stays.
    type(element, '書きかけ');
    await settle(element);
    expect(scrolled).toHaveBeenCalledTimes(1);
    element.api.comment('slide:problem', '二つ目');
    await settle(element);
    expect(scrolled).toHaveBeenCalledTimes(2);
    const list = element.shadowRoot?.querySelector('.slide-comment-list');
    expect(list?.nextElementSibling?.classList.contains('slide-comment-form')).toBe(true);
  });

  it('deletes a comment from the list beneath the slide', async () => {
    const element = mount('#slide=problem');
    await settle(element);
    element.api.comment('slide:problem', '残す');
    element.api.comment('slide:problem', '消す');
    await settle(element);
    const rows = [...(element.shadowRoot?.querySelectorAll('.slide-comment-list li') ?? [])];
    const remove = rows[1]?.querySelector<HTMLButtonElement>('.slide-comment-delete');
    expect(remove?.getAttribute('aria-label')).toBe('Delete this comment');
    const scrolled = vi.spyOn(Element.prototype, 'scrollTop', 'set');
    remove?.click();
    await settle(element);
    // Deleting leaves the reader's scroll where it is.
    expect(scrolled).not.toHaveBeenCalled();
    expect(element.api.actions.map((action) => action.payload)).toEqual([{ body: '残す' }]);
    expect(
      [...(element.shadowRoot?.querySelectorAll('.slide-comment-body') ?? [])].map((body) => body.textContent),
    ).toEqual(['残す']);
  });

  it('submits with Cmd/Ctrl+Enter, but not while an IME is composing or the text is blank', async () => {
    const element = mount('#slide=problem');
    await settle(element);
    type(element, '   ');
    await settle(element);
    keyInField(element, { key: 'Enter', metaKey: true });
    expect(element.api.actions).toHaveLength(0);
    type(element, '変換中');
    await settle(element);
    keyInField(element, { key: 'Enter', ctrlKey: true, isComposing: true });
    expect(element.api.actions).toHaveLength(0);
    keyInField(element, { key: 'Enter', ctrlKey: true });
    await settle(element);
    expect(element.api.actions.map((action) => action.payload)).toEqual([{ body: '変換中' }]);
  });

  it('keeps an unsent comment with its slide while the reader moves through the deck', async () => {
    const element = mount('#slide=problem');
    await settle(element);
    type(element, '書きかけ');
    await settle(element);
    element.shadowRoot?.querySelector<HTMLButtonElement>('.deck-next')?.click();
    await settle(element);
    expect(commentField(element)?.value).toBe('');
    expect(element.shadowRoot?.querySelector('.slide-comment-list')).toBeNull();
    element.shadowRoot?.querySelector<HTMLButtonElement>('.deck-prev')?.click();
    await settle(element);
    expect(commentField(element)?.value).toBe('書きかけ');
    expect(element.api.actions).toHaveLength(0);
  });

  it('keeps a comment on a removed slide as stale', async () => {
    const element = mount();
    await settle(element);
    element.api.comment('slide:flow', '残る');
    element.controller.setBase(parseSlidesBase({ title: 'x', slides: [{ id: 'cover', title: 'Cover' }] }));
    expect(element.api.stale.map((entry) => entry.action.target)).toEqual([{ type: 'slide', id: 'flow' }]);
  });

  it('hides the full screen button where the browser does not allow it', async () => {
    const element = mount();
    await settle(element);
    expect(element.shadowRoot?.querySelector('.deck-fullscreen')).toBeNull();
  });

  it('says how to add slides when the deck is empty', async () => {
    window.location.hash = '';
    document.body.innerHTML = `<dpk-template-slides storage="memory" lang="ja"><script type="application/json">{}</script></dpk-template-slides>`;
    const element = document.querySelector('dpk-template-slides') as DpkTemplateSlides;
    await settle(element);
    expect(element.shadowRoot?.querySelector('.deck-empty')?.textContent).toContain('slides');
    expect(element.shadowRoot?.querySelector('.deck-bar')).toBeNull();
  });
});
