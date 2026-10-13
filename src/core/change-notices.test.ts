// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkTemplatePlain } from '../templates/plain/element';

import { coreMessages } from './messages';
import { TOAST_MS } from './shell/change-notice-controller';
import '../index';

const m = coreMessages('en');

const base = { title: 'Order flow', sections: [{ id: 'background', title: 'Background' }] };

const changeLog = (revision: string) => ({
  revision,
  changes: [
    { id: 'background', title: 'Background rewritten', body: 'Shorter', target: 'section:background' },
    { id: 'wording', title: 'Wording fixes' },
  ],
});

const mount = (log: unknown, storage = 'storage-key="notices"'): DpkTemplatePlain => {
  window.location.hash = '';
  document.body.innerHTML = `
    <dpk-template-plain ${storage}>
      <script type="application/json" data-dpk-changes>${JSON.stringify(log)}</script>
      <script type="application/json">${JSON.stringify(base)}</script>
      <section slot="main" data-dpk-target="section:background"><h2>Background</h2></section>
    </dpk-template-plain>`;
  const element = document.querySelector('dpk-template-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkTemplatePlain;
};

const settle = async (element: DpkTemplatePlain): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

const root = (element: DpkTemplatePlain): ShadowRoot => {
  if (!element.shadowRoot) throw new Error('no shadow root');
  return element.shadowRoot;
};

const bell = (element: DpkTemplatePlain) => root(element).querySelector<HTMLButtonElement>('.dpk-bell');
const badge = (element: DpkTemplatePlain) => root(element).querySelector('.dpk-bell-badge')?.textContent?.trim();
const toasts = (element: DpkTemplatePlain) =>
  [...root(element).querySelectorAll('.dpk-toast .dpk-change-title')].map((node) => node.textContent?.trim());
const click = (node: Element | null | undefined): void => {
  if (!(node instanceof HTMLElement)) throw new Error('nothing to click');
  node.click();
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('change notices', () => {
  it('puts no bell in the header of a page without a change log', async () => {
    document.body.innerHTML = `<dpk-template-plain storage="memory">
      <script type="application/json">${JSON.stringify(base)}</script></dpk-template-plain>`;
    const element = document.querySelector('dpk-template-plain') as DpkTemplatePlain;
    await settle(element);
    expect(bell(element)).toBeNull();
  });

  it('reads the base data apart from the change log, whichever comes first', async () => {
    const element = mount(changeLog('r2'));
    await settle(element);
    expect(element.derivation.state.title).toBe('Order flow');
  });

  it('announces unread changes with toasts and a badge on the header bell', async () => {
    const element = mount(changeLog('r2'));
    await settle(element);
    expect(root(element).querySelector('.dpk-header-tools .dpk-bell')).not.toBeNull();
    expect(badge(element)).toBe('2');
    expect(bell(element)?.getAttribute('aria-label')).toBe(m.changesUnread(2));
    expect(toasts(element)).toEqual(['Background rewritten', 'Wording fixes']);
  });

  it('opening the list clears the badge and the toasts, keeps the changes listed, and is remembered', async () => {
    const element = mount(changeLog('r2'));
    await settle(element);
    click(bell(element));
    await settle(element);
    const cards = [...root(element).querySelectorAll('.dpk-change')];
    expect(
      cards.map((card) => card.querySelector('.dpk-change-title')?.textContent?.replace(/\s+/g, ' ').trim()),
    ).toEqual([`${m.changesNew} Background rewritten`, `${m.changesNew} Wording fixes`]);
    expect(badge(element)).toBeUndefined();
    expect(toasts(element)).toEqual([]);
    // Elsewhere closes it; the bell still lists every change.
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    await settle(element);
    expect(root(element).querySelector('.dpk-changes')).toBeNull();
    click(bell(element));
    await settle(element);
    expect(root(element).querySelectorAll('.dpk-change')).toHaveLength(2);
    expect(root(element).querySelectorAll('.dpk-change[data-fresh]')).toHaveLength(0);

    const reopened = mount(changeLog('r2'));
    await settle(reopened);
    expect(badge(reopened)).toBeUndefined();
    expect(toasts(reopened)).toEqual([]);
  });

  it('announces the changes of a newer revision again', async () => {
    const element = mount(changeLog('r2'));
    await settle(element);
    click(bell(element));
    await settle(element);
    const next = mount(changeLog('r3'));
    await settle(next);
    expect(badge(next)).toBe('2');
  });

  it('a toast that goes away, closed or timed out, stays behind the badge', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const element = mount(changeLog('r2'));
    await settle(element);
    click(root(element).querySelector('.dpk-toast[data-key="wording"] .dpk-toast-close'));
    await settle(element);
    expect(toasts(element)).toEqual(['Background rewritten']);
    expect(badge(element)).toBe('2');
    vi.advanceTimersByTime(TOAST_MS);
    await settle(element);
    expect(toasts(element)).toEqual([]);
    expect(badge(element)).toBe('2');
  });

  it('holds the toasts while the reader points at them', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const element = mount(changeLog('r2'));
    await settle(element);
    root(element).querySelector('.dpk-toasts')?.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(TOAST_MS * 2);
    await settle(element);
    expect(toasts(element)).toHaveLength(2);
    root(element).querySelector('.dpk-toasts')?.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(TOAST_MS);
    await settle(element);
    expect(toasts(element)).toEqual([]);
  });

  it('keeps the toasts while one has focus, after the pointer leaves', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const element = mount(changeLog('r2'));
    await settle(element);
    const section = root(element).querySelector('.dpk-toasts');
    section?.dispatchEvent(new Event('pointerenter'));
    section?.dispatchEvent(new Event('focusin'));
    section?.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(TOAST_MS * 2);
    await settle(element);
    expect(toasts(element)).toHaveLength(2);
    section?.dispatchEvent(new Event('focusout'));
    vi.advanceTimersByTime(TOAST_MS);
    await settle(element);
    expect(toasts(element)).toEqual([]);
  });

  it('"Show" goes to the element the change is about and highlights it', async () => {
    const animate = vi.fn();
    const section = (): Element | null => document.querySelector('[data-dpk-target="section:background"]');
    const element = mount(changeLog('r2'));
    await settle(element);
    const target = section();
    if (!(target instanceof HTMLElement)) throw new Error('no target');
    target.animate = animate;
    vi.spyOn(target, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList);
    // A change about nothing in particular has nowhere to go.
    expect(root(element).querySelector('.dpk-toast[data-key="wording"] .dpk-notice-show')).toBeNull();
    click(root(element).querySelector('.dpk-toast[data-key="background"] .dpk-notice-show'));
    await vi.waitFor(() => expect(animate).toHaveBeenCalledTimes(1));
    await settle(element);
    expect(toasts(element)).toEqual(['Wording fixes']);
    expect(badge(element)).toBe('1');
  });

  it('"Show" on another change before the first one arrives goes only to the later one', async () => {
    const log = {
      revision: 'r2',
      changes: [
        { id: 'background', title: 'Background rewritten', target: 'section:background' },
        { id: 'goal', title: 'Goal added', target: 'section:goal' },
      ],
    };
    const element = mount(log);
    element.insertAdjacentHTML(
      'beforeend',
      '<section slot="main" data-dpk-target="section:goal"><h2>Goal</h2></section>',
    );
    await settle(element);
    const animated: string[] = [];
    for (const section of document.querySelectorAll<HTMLElement>('[data-dpk-target]')) {
      const ref = section.dataset['dpkTarget'] ?? '';
      section.animate = vi.fn(() => {
        animated.push(ref);
        return {} as Animation;
      });
      vi.spyOn(section, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList);
    }
    click(root(element).querySelector('.dpk-toast[data-key="background"] .dpk-notice-show'));
    click(root(element).querySelector('.dpk-toast[data-key="goal"] .dpk-notice-show'));
    await vi.waitFor(() => expect(animated).toEqual(['section:goal']));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(animated).toEqual(['section:goal']);
  });

  it('shows why a change log could not be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const element = mount({ revision: 'r2', changes: [{ title: 'x', target: 'nowhere' }] });
    await settle(element);
    expect(root(element).querySelector('.dpk-banner')?.textContent).toContain(m.changesError);
    expect(bell(element)).toBeNull();
  });
});
