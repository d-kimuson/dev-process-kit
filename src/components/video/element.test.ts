import * as v from 'valibot';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DraftAction } from '../../core/types';

import { DpkVideo } from './element';
import { defineVideo } from './index';
import { videoMessages } from './messages';

const m = videoMessages('en');

// happy-dom has no Web Animations API; the scenes here carry no animation to drive.
if (!('getAnimations' in Element.prototype))
  Object.defineProperty(Element.prototype, 'getAnimations', { value: (): Animation[] => [] });

defineVideo();

const DATA = {
  pacing: { lead: 1, gap: 0, tail: 1 },
  scenes: [
    { id: 'intro', title: 'Intro', cues: [{ voice: 'Ann', text: 'Hello there', duration: 2 }] },
    {
      id: 'demo',
      title: 'Demo',
      cues: [
        { id: 'look', text: 'Look', duration: 3 },
        { id: 'flash', at: 4.5, duration: 0.5 },
      ],
    },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

const settle = async (element: DpkVideo): Promise<DpkVideo> => {
  for (let index = 0; index < 4; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;
  }
  return element;
};

const mount = async (data: unknown = DATA, id = 'promo', scenes = ['intro', 'demo']): Promise<DpkVideo> => {
  const element = document.createElement('dpk-video');
  if (!(element instanceof DpkVideo)) throw new Error('did not upgrade');
  if (id) element.id = id;
  const script = document.createElement('script');
  script.type = 'application/json';
  script.textContent = JSON.stringify(data);
  const backdrop = document.createElement('div');
  element.append(
    script,
    backdrop,
    ...scenes.map((scene) => {
      const layer = document.createElement('div');
      layer.dataset['scene'] = scene;
      return layer;
    }),
  );
  document.body.append(element);
  return settle(element);
};

const query = <T extends HTMLElement = HTMLElement>(element: DpkVideo, selector: string): T => {
  const found = element.renderRoot.querySelector<T>(selector);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

const text = (element: DpkVideo, selector: string): string =>
  query(element, selector).textContent?.replace(/\s+/g, ' ').trim() ?? '';

const openComments = async (element: DpkVideo): Promise<void> => {
  element.panelOpen = true;
  await element.updateComplete;
  const radios = element.renderRoot.querySelectorAll<HTMLInputElement>('.comment-kind input');
  radios[1]?.click();
  await element.updateComplete;
};

const comment = (scene: string, ms: number, body: string): DraftAction => ({
  id: `c${scene}${ms}`,
  type: 'COMMENT',
  target: { type: 'element', id: `promo/scene/${scene}/at/${ms}` },
  payload: { body },
  createdAt: '2026-11-28T00:00:00.000Z',
});

describe('dpk-video', () => {
  it('lays the scenes out from the cues and shows the time and the controls while paused', async () => {
    const element = await mount();
    expect(element.duration).toBe(9);
    expect(text(element, '.time')).toBe('0:00 / 0:09');
    expect(element.hasAttribute('controls-visible')).toBe(true);
  });

  it('shows the caption and reflects the scene, the cue and its voice on the host', async () => {
    const element = await mount();
    const updates: unknown[] = [];
    element.addEventListener('dpk-video-timeupdate', (event) => {
      if (event instanceof CustomEvent) updates.push(event.detail);
    });
    element.seek(1.5);
    await element.updateComplete;
    expect(text(element, '.subtitle')).toBe('Ann Hello there');
    expect(text(element, '[part="voice"]')).toBe('Ann');
    expect([element.getAttribute('scene'), element.getAttribute('cue'), element.getAttribute('voice')]).toEqual([
      'intro',
      '0',
      'Ann',
    ]);
    expect(updates.at(-1)).toEqual({
      time: 1.5,
      scene: 'intro',
      sceneTime: 1.5,
      sceneDuration: 4,
      cue: '0',
      cueTime: 0.5,
      playing: false,
    });

    element.seek(6);
    await element.updateComplete;
    expect(text(element, '.subtitle')).toBe('Look');
    expect([element.getAttribute('scene'), element.getAttribute('cue'), element.hasAttribute('voice')]).toEqual([
      'demo',
      'look',
      false,
    ]);
    expect(element.querySelector<HTMLElement>('[data-scene="intro"]')?.style.opacity).toBe('0');
    expect(element.querySelector<HTMLElement>('[data-scene="demo"]')?.style.opacity).toBe('1');
  });
  it('drives the animations inside a component of a picture and makes the component inert', async () => {
    const element = await mount();
    const component = document.createElement('dpk-probe');
    const shadow = component.attachShadow({ mode: 'open' });
    const getAnimations = vi.fn((): Animation[] => []);
    Object.defineProperty(shadow, 'getAnimations', { value: getAnimations });
    element.querySelector('[data-scene="intro"]')?.append(component);
    element.seek(1);
    await element.updateComplete;
    expect(getAnimations).toHaveBeenCalled();
    expect(component.inert).toBe(true);
  });

  it('sets --dpk-video-scale from the stage width and design-width', async () => {
    const observers: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          observers.push(callback);
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
    const element = await mount();
    vi.unstubAllGlobals();
    const resize = (width: number): void => {
      for (const callback of observers)
        callback([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver);
    };
    resize(640);
    expect(element.style.getPropertyValue('--dpk-video-scale')).toBe('0.5000');
    element.designWidth = 1920;
    await element.updateComplete;
    expect(element.style.getPropertyValue('--dpk-video-scale')).toBe('0.3333');
  });

  it('colors a caption by the tone of its voice instead of naming the voice', async () => {
    const element = await mount({ ...DATA, voices: { Ann: { tone: 'pink' } } });
    element.seek(1.5);
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.subtitle')?.getAttribute('data-tone')).toBe('pink');
    expect(element.shadowRoot?.querySelector('[part="voice"]')?.classList.contains('sr-only')).toBe(true);
  });

  it('hides and shows the captions with the captions button', async () => {
    const element = await mount();
    element.seek(1.5);
    await element.updateComplete;
    const button = query<HTMLButtonElement>(element, 'button[aria-label="' + m.captions + '"]');
    button.click();
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.subtitle')).toBeNull();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    await element.updateComplete;
    expect(text(element, '.subtitle')).toBe('Ann Hello there');
  });

  it('shows no caption for a cue without text, and clears the cue between cues', async () => {
    const element = await mount();
    element.seek(8.7);
    await element.updateComplete;
    expect(element.getAttribute('cue')).toBe('flash');
    expect(element.renderRoot.querySelector('.subtitle')).toBeNull();
    element.seek(3.5);
    await element.updateComplete;
    expect(element.hasAttribute('cue')).toBe(false);
  });

  it('gives each cue start of a scene to its picture as a custom property', async () => {
    const element = await mount();
    const demo = element.querySelector<HTMLElement>('[data-scene="demo"]');
    expect(demo?.style.getPropertyValue('--dpk-cue-look')).toBe('1.000s');
    expect(demo?.style.getPropertyValue('--dpk-cue-flash')).toBe('4.500s');
    expect(demo?.style.getPropertyValue('--dpk-scene-duration')).toBe('5.000s');
    expect(element.querySelector<HTMLElement>('[data-scene="intro"]')?.style.getPropertyValue('--dpk-cue-0')).toBe(
      '1.000s',
    );
  });

  it('gives a scene picture added later its custom properties', async () => {
    const element = await mount(DATA, 'promo', ['intro']);
    const demo = document.createElement('div');
    demo.dataset['scene'] = 'demo';
    element.append(demo);
    await settle(element);
    expect(demo.style.getPropertyValue('--dpk-cue-look')).toBe('1.000s');
  });

  it('reports a picture of no scene until its data-scene is fixed', async () => {
    const element = await mount(DATA, 'promo', ['intro', 'gone']);
    expect(element.dataError).toMatch(/data-scene="gone"/);
    const layer = element.querySelector<HTMLElement>('[data-scene="gone"]');
    if (layer === null) throw new Error('no layer');
    layer.dataset['scene'] = 'demo';
    await settle(element);
    expect(element.dataError).toBeNull();
    expect(layer.style.getPropertyValue('--dpk-cue-look')).toBe('1.000s');
  });

  it('hides a scene picture added while paused unless its scene plays', async () => {
    const element = await mount(DATA, 'promo', ['intro']);
    const demo = document.createElement('div');
    demo.dataset['scene'] = 'demo';
    element.append(demo);
    await settle(element);
    expect([demo.style.opacity, demo.style.visibility, demo.inert]).toEqual(['0', 'hidden', true]);
  });

  it('lists the chapters and seeks to one', async () => {
    const element = await mount();
    element.panelOpen = true;
    await element.updateComplete;
    const chapters = element.renderRoot.querySelectorAll<HTMLButtonElement>('.chapter');
    expect([...chapters].map((chapter) => chapter.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '0:00 Intro',
      '0:04 Demo',
    ]);
    chapters[1]?.click();
    await element.updateComplete;
    expect(element.currentTime).toBe(4);
    expect(chapters[1]?.getAttribute('aria-current')).toBe('true');
  });

  it('offers every scene as a comment target, and none without an id', async () => {
    const element = await mount();
    expect(element.commentTargets).toEqual([
      { value: 'element:promo/scene/intro', label: 'Intro', group: `${m.heading} · promo` },
      { value: 'element:promo/scene/demo', label: 'Demo', group: `${m.heading} · promo` },
    ]);
    const anonymous = await mount(DATA, '');
    expect(anonymous.commentTargets).toEqual([]);
  });

  it('submits a comment on the current moment and keeps it a target until the view returns it', async () => {
    const element = await mount();
    element.seek(5.25);
    await openComments(element);
    const submitted: unknown[] = [];
    element.addEventListener('dpk-comment-submit', (event) => {
      if (!(event instanceof CustomEvent)) return;
      submitted.push(event.detail);
      const { target } = v.parse(v.object({ target: v.string() }), event.detail);
      expect(element.commentTargets.map((option) => option.value)).toContain(target);
      event.preventDefault();
    });
    const textarea = query<HTMLTextAreaElement>(element, 'textarea');
    expect(textarea.getAttribute('aria-label')).toBe(m.commentAt('0:05 · Demo'));
    expect(textarea.placeholder).toBe(m.commentPlaceholder);
    textarea.value = 'Too fast here';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    query<HTMLButtonElement>(element, '.composer button[type="submit"]').click();
    await element.updateComplete;

    expect(submitted).toEqual([{ target: 'element:promo/scene/demo/at/1250', body: 'Too fast here' }]);
    expect(query<HTMLTextAreaElement>(element, 'textarea').value).toBe('');
    expect(element.commentTargets.at(-1)).toEqual({
      value: 'element:promo/scene/demo/at/1250',
      label: '0:05 · Demo',
      group: `${m.heading} · promo`,
    });
  });

  it('says so when no view records the comment', async () => {
    const element = await mount();
    await openComments(element);
    const textarea = query<HTMLTextAreaElement>(element, 'textarea');
    textarea.value = 'Hello';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    query<HTMLButtonElement>(element, '.composer button[type="submit"]').click();
    await element.updateComplete;
    expect(text(element, '.comment-error')).toBe(m.notSaved);
    expect(query<HTMLTextAreaElement>(element, 'textarea').value).toBe('Hello');
    expect(element.commentTargets.map((target) => target.value)).not.toContain('element:promo/scene/intro/at/0');
  });

  it('lists the comments in time order and seeks to one', async () => {
    const element = await mount();
    element.elementComments = [
      comment('demo', 2000, 'Later'),
      comment('intro', 1500, 'Earlier'),
      { ...comment('demo', 0, 'Whole scene'), target: { type: 'element', id: 'promo/scene/demo' } },
    ];
    await openComments(element);
    expect(text(element, '.comment-kind:nth-of-type(2)')).toBe(`${m.comments} 3`);
    const moments = element.renderRoot.querySelectorAll('.moment');
    expect([...moments].map((moment) => moment.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '0:01 Intro Earlier',
      '0:04 Demo Whole scene',
      '0:06 Demo Later',
    ]);
    element.renderRoot.querySelectorAll<HTMLButtonElement>('.moment-time')[2]?.click();
    expect(element.currentTime).toBe(6);
  });

  it('labels a moment at the very end of a scene with that scene', async () => {
    const element = await mount();
    element.elementComments = [comment('intro', 4000, 'At the cut')];
    await element.updateComplete;
    expect(element.commentTargets.at(-1)?.label).toBe('0:04 · Intro');
  });

  it('shows why the data could not be read', async () => {
    const element = await mount({ scenes: [] });
    expect(element.dataError).toMatch(/Invalid length/);
    expect(element.renderRoot.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('keeps a note on the scene at the current time, and lists it once the view hands it back', async () => {
    const element = await mount();
    element.seek(5.25);
    await openComments(element);
    const kinds = element.renderRoot.querySelectorAll<HTMLInputElement>('.composer .comment-kind input');
    kinds[1]?.click();
    await element.updateComplete;
    expect(query<HTMLTextAreaElement>(element, 'textarea').placeholder).toBe(m.notePlaceholder);
    const actions: unknown[] = [];
    element.addEventListener('dpk-element-action', (event) => {
      if (!(event instanceof CustomEvent)) return;
      actions.push(event.detail);
      event.preventDefault();
    });
    const textarea = query<HTMLTextAreaElement>(element, 'textarea');
    textarea.value = 'Keep this shot';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    query<HTMLButtonElement>(element, '.composer button[type="submit"]').click();
    await element.updateComplete;

    const detail = v.parse(
      v.object({
        type: v.string(),
        target: v.string(),
        payload: v.object({ id: v.string(), at: v.number(), body: v.string() }),
      }),
      actions[0],
    );
    expect(detail).toMatchObject({
      type: 'ADD_NOTE',
      target: 'element:promo/scene/demo',
      payload: { at: 1.25, body: 'Keep this shot' },
    });
    expect(query<HTMLTextAreaElement>(element, 'textarea').value).toBe('');

    element.elementActions = [
      {
        id: 'a1',
        type: detail.type,
        target: { type: 'element', id: 'promo/scene/demo' },
        payload: detail.payload,
        createdAt: '2026-11-28T00:00:00.000Z',
      },
    ];
    await element.updateComplete;
    expect(element.elementActionResults).toEqual([
      { id: 'a1', title: m.noteTitle('Demo'), summary: 'Keep this shot', tone: 'create' },
    ]);
    expect(text(element, '.moment[data-kind="note"]')).toBe('0:05 Demo Keep this shot');
  });

  it('keeps the note in the box when no view records it', async () => {
    const element = await mount();
    await openComments(element);
    element.renderRoot.querySelectorAll<HTMLInputElement>('.composer .comment-kind input')[1]?.click();
    await element.updateComplete;
    const textarea = query<HTMLTextAreaElement>(element, 'textarea');
    textarea.value = 'Keep';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    query<HTMLButtonElement>(element, '.composer button[type="submit"]').click();
    await element.updateComplete;
    expect(text(element, '.comment-error')).toBe(m.notSaved);
    expect(query<HTMLTextAreaElement>(element, 'textarea').value).toBe('Keep');
  });

  it('announces the targets again when a note result changes', async () => {
    const element = await mount();
    let announced = 0;
    element.addEventListener('dpk-comment-targets-change', () => announced++);
    element.elementActions = [
      {
        id: 'a1',
        type: 'ADD_NOTE',
        target: { type: 'element', id: 'promo/scene/intro' },
        payload: { id: 'n1', body: 'Keep' },
        createdAt: '2026-11-28T00:00:00.000Z',
      },
    ];
    await element.updateComplete;
    expect(announced).toBe(1);
  });
});
