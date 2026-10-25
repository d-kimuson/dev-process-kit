// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkViewPlain } from '../views/plain/element';

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

const mount = (log: unknown, storage = 'storage-key="notices"'): DpkViewPlain => {
  window.location.hash = '';
  document.body.innerHTML = `
    <dpk-view-plain ${storage}>
      <script type="application/json" data-dpk-changes>${JSON.stringify(log)}</script>
      <script type="application/json">${JSON.stringify(base)}</script>
      <section slot="main" data-dpk-target="section:background"><h2>Background</h2></section>
    </dpk-view-plain>`;
  const element = document.querySelector('dpk-view-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkViewPlain;
};

const settle = async (element: DpkViewPlain): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

const root = (element: DpkViewPlain): ShadowRoot => {
  if (!element.shadowRoot) throw new Error('no shadow root');
  return element.shadowRoot;
};

const bell = (element: DpkViewPlain) => root(element).querySelector<HTMLButtonElement>('.dpk-bell');
const badge = (element: DpkViewPlain) => root(element).querySelector('.dpk-bell-badge')?.textContent?.trim();
const toasts = (element: DpkViewPlain) =>
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
    document.body.innerHTML = `<dpk-view-plain storage="memory">
      <script type="application/json">${JSON.stringify(base)}</script></dpk-view-plain>`;
    const element = document.querySelector('dpk-view-plain') as DpkViewPlain;
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

  it('opening the list clears the toasts but leaves the badge to each "Show", and is remembered', async () => {
    const element = mount(changeLog('r2'));
    await settle(element);
    click(bell(element));
    await settle(element);
    const cards = [...root(element).querySelectorAll('.dpk-change')];
    expect(
      cards.map((card) => card.querySelector('.dpk-change-title')?.textContent?.replace(/\s+/g, ' ').trim()),
    ).toEqual([`${m.changesNew} Background rewritten`, `${m.changesNew} Wording fixes`]);
    // The change with nowhere to go is read on its card; the other waits for its "Show".
    expect(badge(element)).toBe('1');
    expect(toasts(element)).toEqual([]);
    // Elsewhere closes it; the bell still lists every change, and the one not shown is still new.
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    await settle(element);
    expect(root(element).querySelector('.dpk-changes')).toBeNull();
    click(bell(element));
    await settle(element);
    expect(root(element).querySelectorAll('.dpk-change')).toHaveLength(2);
    expect(
      [...root(element).querySelectorAll<HTMLElement>('.dpk-change[data-fresh]')].map((card) => card.dataset['key']),
    ).toEqual(['background']);

    const reopened = mount(changeLog('r2'));
    await settle(reopened);
    expect(badge(reopened)).toBe('1');
    expect(toasts(reopened)).toEqual(['Background rewritten']);
  });

  it('"Show" in the list marks only that change seen', async () => {
    const log = {
      revision: 'r2',
      changes: [
        { id: 'background', title: 'Background rewritten', target: 'section:background' },
        { id: 'goal', title: 'Goal added', target: 'section:goal' },
      ],
    };
    const element = mount(log);
    await settle(element);
    click(bell(element));
    await settle(element);
    expect(badge(element)).toBe('2');
    click(root(element).querySelector('.dpk-change[data-key="background"] .dpk-notice-show'));
    await settle(element);
    expect(badge(element)).toBe('1');

    const reopened = mount(log);
    await settle(reopened);
    expect(badge(reopened)).toBe('1');
    expect(toasts(reopened)).toEqual(['Goal added']);
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

  it('announces only what a version added, though the author keeps every version in the log', async () => {
    const first = { revision: 'r1', changes: [{ id: 'draft', title: 'First draft' }] };
    const appended = (...more: object[]) => ({ revisions: [first, changeLog('r2'), ...more] });
    // A first visit is told only this version's changes, not the whole history.
    const element = mount(appended());
    await settle(element);
    expect(badge(element)).toBe('2');
    expect(toasts(element)).toEqual(['Background rewritten', 'Wording fixes']);
    click(bell(element));
    await settle(element);
    expect(
      [...root(element).querySelectorAll<HTMLElement>('.dpk-changes-group')].map((group) => group.dataset['revision']),
    ).toEqual(['r2', 'r1']);
    const readAll = root(element).querySelector('.dpk-changes .dpk-changes-read-all');
    click(readAll);
    await settle(element);
    expect(badge(element)).toBeUndefined();
    // The button stays where the reader's focus is, with nothing left to do.
    expect(root(element).querySelector('.dpk-changes .dpk-changes-read-all')).toBe(readAll);
    expect(readAll?.getAttribute('aria-disabled')).toBe('true');
    expect(root(element).querySelectorAll('.dpk-change[data-fresh]')).toHaveLength(0);

    // The next version announces its own changes, not r1's and r2's again.
    const next = mount(appended({ revision: 'r3', changes: [{ id: 'goal', title: 'Goal added' }] }));
    await settle(next);
    expect(badge(next)).toBe('1');
    expect(toasts(next)).toEqual(['Goal added']);
  });

  it('keeps what a reader left unread for the next version, behind the bell', async () => {
    const first = {
      revision: 'r1',
      changes: [{ id: 'background', title: 'Background rewritten', target: 'section:background' }],
    };
    const element = mount({ revisions: [first] });
    await settle(element);
    expect(badge(element)).toBe('1');
    const next = mount({ revisions: [first, { revision: 'r2', changes: [{ id: 'goal', title: 'Goal added' }] }] });
    await settle(next);
    expect(badge(next)).toBe('2');
    // Only the new version toasts; the older change waits behind the bell.
    expect(toasts(next)).toEqual(['Goal added']);
  });

  it('marks everything read from the toasts', async () => {
    const element = mount(changeLog('r2'));
    await settle(element);
    click(root(element).querySelector('.dpk-toasts .dpk-changes-read-all'));
    await settle(element);
    expect(toasts(element)).toEqual([]);
    expect(badge(element)).toBeUndefined();
    const reopened = mount(changeLog('r2'));
    await settle(reopened);
    expect(badge(reopened)).toBeUndefined();
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
