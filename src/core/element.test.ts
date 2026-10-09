// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkComponentCommentPanel } from '../components/comment-panel';
import type { DpkTemplatePrototype } from '../templates/prototype/element';

import { panelMessages } from '../components/comment-panel/messages';
import { prototypeDefinitionFor } from '../templates/prototype/definition';
import { prototypeMessages } from '../templates/prototype/messages';
import { COMMENT_ACTION } from './action';
import { coreMessages } from './messages';
import { DEFAULT_SIDEBAR_LAYOUT, SIDEBAR_WIDTH } from './sidebar-width';
import '../index';

const base = {
  title: 'Demo',
  apps: [
    {
      id: 'web',
      name: 'Web',
      screens: [
        {
          id: 'landing',
          title: 'LP',
          previews: [{ id: 'landing-mobile', kind: 'browser', viewport: 'mobile' }],
        },
        {
          id: 'google-auth',
          title: 'Google auth',
          previews: [
            { id: 'auth-mobile', kind: 'browser', viewport: 'mobile' },
            { id: 'auth-desktop', kind: 'browser', viewport: 'desktop' },
          ],
        },
      ],
    },
  ],
  activities: [
    {
      id: 'onboarding',
      name: 'Onboarding',
      stories: [
        {
          id: 'account',
          name: 'Account',
          steps: [
            { id: 'landing', name: 'Landing', panes: [{ screen: 'landing' }] },
            { id: 'google-auth', name: 'Google auth', panes: [{ screen: 'google-auth' }] },
          ],
        },
      ],
    },
  ],
};

const mount = (hash = '', attributes = ''): DpkTemplatePrototype => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-template-prototype storage="memory" ${attributes}>
      <script type="application/json">${JSON.stringify(base)}</script>
      <div slot="preview" data-preview-id="landing-mobile"><p id="landing-body">hello</p></div>
      <div slot="preview" data-preview-id="auth-mobile"><p id="auth-body">auth</p></div>
      <div slot="preview" data-preview-id="auth-desktop"><p id="auth-desktop-body">auth wide</p></div>
    </dpk-template-prototype>`;
  return document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
};

const settle = async (el: DpkTemplatePrototype): Promise<void> => {
  await el.api.ready;
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
};

describe('<dpk-template-prototype>', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('reads base data, renders the tree and canonically syncs the URL', async () => {
    const el = mount();
    await settle(el);
    expect(el.dataset['template']).toBe('prototype');
    expect(el.api.state.title).toBe('Demo');
    expect(el.shadowRoot?.querySelectorAll('.step-link')).toHaveLength(2);
    expect(el.shadowRoot?.querySelectorAll('.nav select')).toHaveLength(2);
    expect(location.hash).toBe('#activity=onboarding&preview=landing-mobile&step=landing&story=account');
  });

  it('keeps the base JSON out of the rendering and exposes it read-only', async () => {
    const el = mount();
    await settle(el);
    expect(el.api.base.activities).toHaveLength(1);
    expect(el.shadowRoot?.querySelector('script')).toBeNull();
  });

  it('routes light DOM previews into the frame slot for their preview id', async () => {
    const el = mount();
    await settle(el);
    const landing = el.querySelector('[data-preview-id="landing-mobile"]');
    expect(landing?.getAttribute('slot')).toBe('preview:landing-mobile');
    const frames = el.shadowRoot?.querySelectorAll('figure.frame') ?? [];
    expect(frames).toHaveLength(1);
    expect(el.shadowRoot?.querySelector('slot[name="preview:landing-mobile"]')).not.toBeNull();
  });

  it('renders both preview frames of the current step after navigation', async () => {
    const el = mount();
    await settle(el);
    el.api.navigate({ step: 'google-auth' });
    await settle(el);
    // Previews of one step are tabs: exactly one frame is visible at a time.
    expect(el.shadowRoot?.querySelectorAll('.tab')).toHaveLength(2);
    expect(el.shadowRoot?.querySelectorAll('figure.frame')).toHaveLength(1);
    expect(location.hash).toBe('#activity=onboarding&preview=auth-mobile&step=google-auth&story=account');
    expect(el.shadowRoot?.querySelector('.frame .url')?.textContent ?? '').toContain('auth-mobile');

    // The sibling preview keeps its (parked) slot: nothing falls into the orphan bucket.
    expect(el.shadowRoot?.querySelector('.dpk-orphans')?.hasAttribute('hidden')).toBe(true);

    el.api.navigate({ preview: 'auth-desktop' });
    await settle(el);
    expect(el.shadowRoot?.querySelector('.frame')?.getAttribute('data-viewport')).toBe('desktop');
    expect(el.shadowRoot?.querySelector('.tab[data-current="true"]')?.textContent?.trim()).toBe('desktop');
    expect(el.shadowRoot?.querySelector('.dpk-orphans')?.hasAttribute('hidden')).toBe(true);
    expect(location.hash).toContain('preview=auth-desktop');
  });

  it('navigates with the hash instead of draft actions', async () => {
    const el = mount();
    await settle(el);
    el.api.navigate({ step: 'google-auth' });
    await settle(el);
    expect(el.api.actions).toHaveLength(0);
    expect(el.api.navigation['step']).toBe('google-auth');
  });

  it('publishes current issues and navigation through the same snapshot subscription', async () => {
    const el = mount();
    await settle(el);
    const snapshots: ReturnType<typeof el.api.snapshot>[] = [];
    const unsubscribe = el.api.subscribe((snapshot) => snapshots.push(snapshot));
    el.api.dispatch({ type: 'SET_STEP_NAME', target: 'landing', payload: {} });
    expect(snapshots.at(-1)?.issues.length).toBeGreaterThan(0);
    el.api.dispatch({ type: 'SET_STEP_NAME', target: 'landing', payload: { name: 'Updated' } });
    expect(snapshots.at(-1)?.issues).toEqual([]);
    el.api.navigate({ step: 'google-auth' });
    expect(snapshots.at(-1)?.navigation['step']).toBe('google-auth');
    unsubscribe();
    const count = snapshots.length;
    el.api.navigate({ step: 'landing' });
    expect(snapshots).toHaveLength(count);
  });

  it('resolves a deep link that only carries the step id', async () => {
    const el = mount('#step=google-auth');
    await settle(el);
    expect(el.api.navigation).toMatchObject({
      activity: 'onboarding',
      story: 'account',
      step: 'google-auth',
    });
  });

  it('dispatches draft actions and re-renders the review rail', async () => {
    const el = mount();
    await settle(el);
    el.api.dispatch({
      type: 'SET_STEP_NAME',
      target: 'landing',
      payload: { name: 'LP' },
    });
    await settle(el);
    expect(el.api.state.activities[0]?.stories[0]?.steps[0]?.name).toBe('LP');
    const panel = el.shadowRoot?.querySelector('dpk-component-comment-panel');
    expect(panel?.shadowRoot?.querySelectorAll('.item')).toHaveLength(1);
  });

  it('navigates from `data-dpk-navigate` clicks inside preview content', async () => {
    const el = mount();
    await settle(el);
    const trigger = document.createElement('a');
    trigger.setAttribute('data-dpk-navigate', 'step=google-auth');
    el.querySelector('[data-preview-id="landing-mobile"]')?.append(trigger);
    trigger.click();
    await settle(el);
    expect(location.hash).toContain('step=google-auth');
  });

  it('comments on the whole page by default and on the current step when attached', async () => {
    const el = mount();
    await settle(el);
    el.requestComment('page:prototype');
    await settle(el);
    const panel = el.shadowRoot?.querySelector('dpk-component-comment-panel') as DpkComponentCommentPanel | null;
    const composer = panel?.shadowRoot;

    const submit = async (text: string): Promise<void> => {
      const area = composer?.querySelector('textarea');
      if (!(area instanceof HTMLTextAreaElement)) throw new Error('comment textarea not found');
      area.value = text;
      area.dispatchEvent(new Event('input', { bubbles: true }));
      // the disabled state of the button follows the value on the next update
      await panel?.updateComplete;
      const button = composer?.querySelector('button.dpk-btn--accent');
      if (!(button instanceof HTMLButtonElement)) throw new Error('comment submit button not found');
      button.click();
    };

    await submit('全体へのメモ');
    await settle(el);
    expect(el.api.comments[0]?.target).toEqual({ type: 'page', id: 'prototype' });

    // The checkbox attaches the note to the step the reader is looking at.
    const box = composer?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(box).not.toBeNull();
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(el);
    await submit('この Step へのメモ');
    await settle(el);
    expect(el.api.comments[1]?.target).toEqual({ type: 'step', id: 'onboarding.account.landing' });
  });

  it('keeps the review rail closed behind the floating comment button', async () => {
    const el = mount();
    await settle(el);
    const notes = el.shadowRoot?.querySelector('.dpk-notes');
    const fab = el.shadowRoot?.querySelector('.dpk-fab');
    expect(fab).not.toBeNull();
    expect(notes?.hasAttribute('hidden')).toBe(true);

    (fab as HTMLElement).click();
    await settle(el);
    expect(el.shadowRoot?.querySelector('.dpk-notes')?.hasAttribute('hidden')).toBe(false);
    expect(el.shadowRoot?.querySelector('.dpk-fab')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows the draft count on the floating button', async () => {
    const el = mount();
    await settle(el);
    expect(el.shadowRoot?.querySelector('.dpk-fab-badge')).toBeNull();
    el.api.dispatch({ type: 'SET_STEP_NAME', target: 'landing', payload: { name: 'LP' } });
    await settle(el);
    expect(el.shadowRoot?.querySelector('.dpk-fab-badge')?.textContent?.trim()).toBe('1');
  });

  it('counts the changes and the comments of the draft apart in the header', async () => {
    const el = mount();
    await settle(el);
    el.api.dispatch({ type: COMMENT_ACTION, target: 'page:prototype', payload: { body: 'one' } });
    el.api.dispatch({ type: COMMENT_ACTION, target: 'page:prototype', payload: { body: 'two' } });
    el.api.dispatch({ type: 'SET_STEP_NAME', target: 'landing', payload: { name: 'LP' } });
    await settle(el);
    const count = el.shadowRoot?.querySelector('.dpk-meta-count')?.textContent?.trim();
    expect(count).toBe(coreMessages('en').draftCount(1, 2));
  });

  it('offers the hand-off beside the closed rail once there is a draft', async () => {
    const el = mount();
    await settle(el);
    const dock = () => el.shadowRoot?.querySelector('.dpk-dock') ?? null;
    expect(dock()).toBeNull();

    el.api.comment('page:prototype', 'looks good');
    await settle(el);
    const buttons = [...(dock()?.querySelectorAll('button') ?? [])].map((b) => b.textContent?.trim());
    expect(buttons).toEqual([coreMessages('en').handoffCopy]);

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    try {
      dock()?.querySelector('button')?.click();
      await settle(el);
      expect(writeText).toHaveBeenCalledWith(el.api.exportBrief());
      expect(dock()?.querySelector('button')?.textContent?.trim()).toBe(coreMessages('en').handoffCopied);
    } finally {
      vi.unstubAllGlobals();
    }

    el.shadowRoot?.querySelector<HTMLElement>('.dpk-fab')?.click();
    await settle(el);
    expect(dock()).toBeNull();
  });

  it('renders the floating memo only when the author slots content into it', async () => {
    const el = mount();
    await settle(el);
    expect(el.shadowRoot?.querySelector('.dpk-memo')?.hasAttribute('hidden')).toBe(true);

    const memo = document.createElement('div');
    memo.setAttribute('slot', 'memo');
    memo.textContent = '前提メモ';
    el.append(memo);
    el.requestUpdate();
    await settle(el);
    expect(el.shadowRoot?.querySelector('.dpk-memo')?.hasAttribute('hidden')).toBe(false);
  });

  it('keeps the memo folded into a labelled bar until the reader opens it', async () => {
    const el = mount();
    const memo = document.createElement('div');
    memo.setAttribute('slot', 'memo');
    memo.textContent = '前提メモ';
    el.append(memo);
    el.requestUpdate();
    await settle(el);
    const fold = el.shadowRoot?.querySelector<HTMLDetailsElement>('.dpk-memo details');
    expect(fold?.open).toBe(false);
    expect(fold?.querySelector('summary')?.textContent?.trim()).toBe(coreMessages('en').memo);
    expect(fold?.querySelector('slot[name="memo"]')).not.toBeNull();

    fold?.querySelector('summary')?.click();
    await settle(el);
    expect(fold?.open).toBe(true);
  });

  it('falls back to an empty state with a visible error when base data is invalid', async () => {
    document.body.innerHTML = `
      <dpk-template-prototype storage="memory">
        <script type="application/json">{"activities":[{"id":"a","name":"A","oops":true}]}</script>
      </dpk-template-prototype>`;
    const el = document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
    await settle(el);
    expect(el.api.state.activities).toHaveLength(0);
    expect(el.shadowRoot?.querySelector('.dpk-banner')).not.toBeNull();
  });

  it('exposes the rendered description and serialization through the definition', () => {
    expect(prototypeDefinitionFor('en').name).toBe('prototype');
    expect(prototypeDefinitionFor('en').label).toBe('UX Prototype');
  });

  it('notifies facade subscribers while detached without changing the document URL', async () => {
    const el = mount();
    await settle(el);
    const listener = vi.fn();
    const stop = el.api.subscribe(listener);
    el.remove();
    const url = location.href;
    el.api.comment('page:prototype', 'detached');
    expect(listener).toHaveBeenCalledOnce();
    expect(location.href).toBe(url);
    stop();
    el.api.comment('page:prototype', 'unsubscribed');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('detaches listeners and observers on disconnect, and works again after reconnection', async () => {
    const observerDisconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');

    // No base JSON: this is the path that installs the MutationObserver.
    document.body.innerHTML = '<dpk-template-prototype storage="memory"></dpk-template-prototype>';
    const el = document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
    await settle(el);

    el.remove();
    expect(observerDisconnect).toHaveBeenCalled();
    expect(removeEventListener).toHaveBeenCalledWith('hashchange', expect.any(Function));

    // Reconnecting must re-subscribe, otherwise drafts would stop rendering.
    document.body.append(el);
    await settle(el);
    el.api.comment('page:prototype', 'after reconnect');
    await settle(el);
    expect(el.api.comments).toHaveLength(1);
  });
});

describe('color scheme', () => {
  const toggle = (el: DpkTemplatePrototype): HTMLButtonElement =>
    el.shadowRoot?.querySelector('.dpk-theme-toggle') as HTMLButtonElement;

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    delete document.documentElement.dataset['theme'];
  });

  it('follows the environment and flips with the header toggle', async () => {
    const el = mount();
    await settle(el);
    expect(el.dataset['theme']).toBe('light');
    expect(toggle(el).getAttribute('aria-label')).toBe(coreMessages('en').useDarkTheme);

    toggle(el).click();
    await settle(el);
    expect(el.dataset['theme']).toBe('dark');
    expect(toggle(el).getAttribute('aria-label')).toBe(coreMessages('en').useLightTheme);
  });

  it("follows the page's data-theme stamp, also when it changes later", async () => {
    document.documentElement.dataset['theme'] = 'dark';
    const el = mount();
    await settle(el);
    expect(el.dataset['theme']).toBe('dark');

    document.documentElement.dataset['theme'] = 'light';
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(el);
    expect(el.dataset['theme']).toBe('light');
  });

  it('lets the author fix the default with the theme attribute', async () => {
    document.documentElement.dataset['theme'] = 'light';
    const el = mount();
    el.setAttribute('theme', 'dark');
    await settle(el);
    expect(el.dataset['theme']).toBe('dark');
  });
});

describe('editing a review comment', () => {
  const STORAGE_KEY = 'edit-test';
  const mountStored = (): DpkTemplatePrototype => {
    document.body.innerHTML = `
      <dpk-template-prototype storage-key="${STORAGE_KEY}" notes="on">
        <script type="application/json">${JSON.stringify(base)}</script>
      </dpk-template-prototype>`;
    return document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
  };
  const panelOf = async (el: DpkTemplatePrototype): Promise<DpkComponentCommentPanel> => {
    const panel = el.shadowRoot?.querySelector('dpk-component-comment-panel') as DpkComponentCommentPanel;
    await panel.updateComplete;
    return panel;
  };

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('rewrites a comment from the review rail, and the new text survives a reload', async () => {
    const el = mountStored();
    await settle(el);
    const posted = el.api.comment('step:landing', 'first thought');
    if (!posted.ok) throw new Error('comment rejected');
    await settle(el);
    const target = el.api.comments[0]?.target;
    const panel = await panelOf(el);
    panel.shadowRoot?.querySelector<HTMLButtonElement>('.item-edit')?.click();
    await panel.updateComplete;
    const area = panel.shadowRoot?.querySelector<HTMLTextAreaElement>('.item-editor textarea');
    if (!area) throw new Error('no editor');
    area.value = 'second thought';
    area.dispatchEvent(new Event('input'));
    await panel.updateComplete;
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
    await settle(el);
    expect(el.api.comments).toMatchObject([{ id: posted.id, target, payload: { body: 'second thought' } }]);

    const reloaded = mountStored();
    await settle(reloaded);
    expect(reloaded.api.comments).toMatchObject([{ id: posted.id, payload: { body: 'second thought' } }]);
  });

  it('edits a comment stored by an earlier version of the kit', async () => {
    const stored = {
      id: 'old-comment',
      type: 'comment',
      target: { type: 'page', id: 'prototype' },
      payload: { body: 'written before edits existed' },
      createdAt: '2026-09-01T00:00:00.000Z',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, template: 'prototype', actions: [stored] }));
    const el = mountStored();
    await settle(el);
    expect(el.api.editComment('old-comment', 'rewritten')).toEqual({ ok: true, id: 'old-comment' });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual({
      v: 1,
      template: 'prototype',
      actions: [{ ...stored, payload: { body: 'rewritten' } }],
    });
  });

  it('reports a rejected edit with dpk-error', async () => {
    const el = mountStored();
    await settle(el);
    const errors = vi.fn();
    el.addEventListener('dpk-error', errors);
    expect(el.api.editComment('missing', 'text').ok).toBe(false);
    expect(errors).toHaveBeenCalledOnce();
  });
});

describe('sidebar width', () => {
  const sidebar = (el: Element): HTMLElement => el.shadowRoot?.querySelector('.dpk-sidebar') as HTMLElement;
  const width = (el: Element): string => sidebar(el).style.getPropertyValue('--dpk-sidebar-width');
  const edge = (el: Element): HTMLElement | null => el.shadowRoot?.querySelector('.dpk-sidebar-resizer') ?? null;
  const press = (target: HTMLElement, key: string): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  };
  const pointer = (target: HTMLElement, type: string, clientX: number): void => {
    target.dispatchEvent(new PointerEvent(type, { pointerId: 1, button: 0, clientX, bubbles: true }));
  };
  const defaultWidth = DEFAULT_SIDEBAR_LAYOUT.defaultWidth;

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    localStorage.clear();
    // jsdom has no pointer capture; every browser the kit targets does.
    if (!('setPointerCapture' in HTMLElement.prototype)) {
      Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: () => {} });
    }
  });

  it('starts at the default width with a labelled edge after the sidebar', async () => {
    const el = mount();
    await settle(el);
    const handle = edge(el) as HTMLElement;
    expect(handle.previousElementSibling).toBe(sidebar(el));
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-label')).toBe(coreMessages('en').resizeSidebar);
    expect(handle.getAttribute('aria-valuenow')).toBe(String(defaultWidth));
    expect(width(el)).toBe(`${defaultWidth}px`);
  });

  it('resizes with the keyboard and goes back to the default on double-click', async () => {
    const el = mount();
    await settle(el);
    const handle = edge(el) as HTMLElement;

    press(handle, 'ArrowRight');
    await settle(el);
    expect(width(el)).toBe(`${defaultWidth + SIDEBAR_WIDTH.step}px`);
    expect(handle.getAttribute('aria-valuenow')).toBe(String(defaultWidth + SIDEBAR_WIDTH.step));

    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(el);
    expect(width(el)).toBe(`${defaultWidth}px`);
  });

  it('follows a pointer drag on the edge until the pointer is released', async () => {
    const el = mount();
    await settle(el);
    const handle = edge(el) as HTMLElement;
    const shell = el.shadowRoot?.querySelector('.dpk-shell') as HTMLElement;

    pointer(handle, 'pointerdown', 260);
    pointer(handle, 'pointermove', 360);
    await settle(el);
    expect(width(el)).toBe(`${defaultWidth + 100}px`);
    expect(shell.hasAttribute('data-resizing')).toBe(true);

    pointer(handle, 'pointerup', 360);
    pointer(handle, 'pointermove', 500);
    await settle(el);
    expect(width(el)).toBe(`${defaultWidth + 100}px`);
    expect(shell.hasAttribute('data-resizing')).toBe(false);
  });

  it("remembers the reader's width for every page of the same template", async () => {
    document.body.innerHTML = '<dpk-template-prototype storage-key="first"></dpk-template-prototype>';
    const first = document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
    await settle(first);
    press(edge(first) as HTMLElement, 'End');
    await settle(first);

    document.body.innerHTML = '<dpk-template-prototype storage-key="second"></dpk-template-prototype>';
    const second = document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
    await settle(second);
    expect(width(second)).toBe(`${SIDEBAR_WIDTH.max}px`);
  });

  it('puts the edge of a right-hand sidebar on its left, growing it as the edge moves left', async () => {
    document.body.innerHTML = '<dpk-template-task-board storage="memory"></dpk-template-task-board>';
    const el = document.querySelector('dpk-template-task-board') as DpkTemplatePrototype;
    await settle(el);
    const handle = edge(el) as HTMLElement;
    expect(handle.nextElementSibling).toBe(sidebar(el));
    const start = Number(handle.getAttribute('aria-valuenow'));

    press(handle, 'ArrowLeft');
    await settle(el);
    expect(width(el)).toBe(`${start + SIDEBAR_WIDTH.step}px`);
  });

  it('has no edge when the template shows no sidebar', async () => {
    document.body.innerHTML = '<dpk-template-usm storage="memory"></dpk-template-usm>';
    const el = document.querySelector('dpk-template-usm') as DpkTemplatePrototype;
    await settle(el);
    expect(sidebar(el).hidden).toBe(true);
    expect(edge(el)).toBeNull();
  });
});

describe('sidebar collapse', () => {
  const sidebar = (el: Element): HTMLElement => el.shadowRoot?.querySelector('.dpk-sidebar') as HTMLElement;
  const toggle = (el: Element): HTMLButtonElement | null =>
    el.shadowRoot?.querySelector<HTMLButtonElement>('.dpk-sidebar-toggle') ?? null;
  const edge = (el: Element): HTMLElement | null => el.shadowRoot?.querySelector('.dpk-sidebar-resizer') ?? null;
  const messages = coreMessages('en');

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('folds the sidebar away with a labelled button and brings it back', async () => {
    const el = mount();
    await settle(el);
    const button = toggle(el) as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe(messages.collapseSidebar);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-controls')).toBe(sidebar(el).id);

    button.click();
    await settle(el);
    expect(sidebar(el).hidden).toBe(true);
    expect(edge(el)).toBeNull();
    const expand = toggle(el) as HTMLButtonElement;
    expect(expand.getAttribute('aria-label')).toBe(messages.expandSidebar);
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(expand.closest('.dpk-sidebar-strip')).not.toBeNull();
    expect(el.shadowRoot?.activeElement).toBe(expand);

    expand.click();
    await settle(el);
    expect(sidebar(el).hidden).toBe(false);
    expect(edge(el)).not.toBeNull();
    expect(toggle(el)?.getAttribute('aria-label')).toBe(messages.collapseSidebar);
  });

  it('keeps the resizable edge working once expanded again', async () => {
    const el = mount();
    await settle(el);
    (toggle(el) as HTMLButtonElement).click();
    await settle(el);
    (toggle(el) as HTMLButtonElement).click();
    await settle(el);
    (edge(el) as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await settle(el);
    expect(sidebar(el).style.getPropertyValue('--dpk-sidebar-width')).toBe(`${SIDEBAR_WIDTH.max}px`);
  });

  it("remembers the reader's choice for every page of the same template", async () => {
    document.body.innerHTML = '<dpk-template-prototype storage-key="first"></dpk-template-prototype>';
    const first = document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
    await settle(first);
    (toggle(first) as HTMLButtonElement).click();
    await settle(first);

    document.body.innerHTML = '<dpk-template-prototype storage-key="second"></dpk-template-prototype>';
    const second = document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
    await settle(second);
    expect(sidebar(second).hidden).toBe(true);

    (toggle(second) as HTMLButtonElement).click();
    await settle(second);
    expect(localStorage.getItem('dev-process-kit:sidebar-collapsed:prototype')).toBeNull();
  });

  it('keeps the choice to the page load with storage="memory"', async () => {
    const el = mount();
    await settle(el);
    (toggle(el) as HTMLButtonElement).click();
    await settle(el);
    expect(localStorage.getItem('dev-process-kit:sidebar-collapsed:prototype')).toBeNull();
  });

  it('folds a right-hand sidebar towards the right', async () => {
    document.body.innerHTML = '<dpk-template-task-board storage="memory"></dpk-template-task-board>';
    const el = document.querySelector('dpk-template-task-board') as DpkTemplatePrototype;
    await settle(el);
    const button = toggle(el) as HTMLButtonElement;
    expect(button.nextElementSibling).toBe(edge(el));
    button.click();
    await settle(el);
    expect(sidebar(el).hidden).toBe(true);
    expect(toggle(el)?.closest('.dpk-sidebar-strip')?.nextElementSibling).toBe(sidebar(el));
  });

  it('offers no fold button when the template shows no sidebar or folds it itself', async () => {
    document.body.innerHTML = '<dpk-template-usm storage="memory"></dpk-template-usm>';
    const usm = document.querySelector('dpk-template-usm') as DpkTemplatePrototype;
    await settle(usm);
    expect(toggle(usm)).toBeNull();

    document.body.innerHTML = '<dpk-template-grill storage="memory"></dpk-template-grill>';
    const grill = document.querySelector('dpk-template-grill') as DpkTemplatePrototype;
    await settle(grill);
    expect(toggle(grill)).toBeNull();
    expect(edge(grill)).not.toBeNull();
  });
});

describe('language', () => {
  const select = (el: DpkTemplatePrototype): HTMLSelectElement =>
    el.shadowRoot?.querySelector('.dpk-lang-select') as HTMLSelectElement;
  const pick = (el: DpkTemplatePrototype, locale: string): void => {
    select(el).value = locale;
    select(el).dispatchEvent(new Event('change'));
  };
  const railText = async (el: DpkTemplatePrototype): Promise<string> => {
    const panel = el.shadowRoot?.querySelector('dpk-component-comment-panel') as DpkComponentCommentPanel;
    await panel.updateComplete;
    return panel.shadowRoot?.textContent ?? '';
  };

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('lang');
  });

  it('defaults to the closest lang and switches the template and its nested elements', async () => {
    document.documentElement.lang = 'ja';
    const el = mount();
    await settle(el);
    el.api.dispatch({ type: 'SET_STEP_NAME', target: 'landing', payload: { name: 'LP' } });
    await settle(el);
    expect(select(el).value).toBe('ja');
    expect(await railText(el)).toContain(prototypeMessages('ja').renameStep);

    pick(el, 'en');
    await settle(el);
    expect(el.getAttribute('lang')).toBe('en');
    expect(select(el).value).toBe('en');
    const rail = await railText(el);
    expect(rail).toContain(panelMessages('en').copy);
    expect(rail).toContain(prototypeMessages('en').renameStep);
    expect(el.api.actions).toHaveLength(1);
  });

  it("gives the author's own lang back when the reader picks the page language again", async () => {
    const el = mount('', 'lang="ja-JP"');
    await settle(el);
    expect(select(el).value).toBe('ja');

    pick(el, 'en');
    await settle(el);
    expect(el.getAttribute('lang')).toBe('en');

    pick(el, 'ja');
    await settle(el);
    expect(el.getAttribute('lang')).toBe('ja-JP');
    expect(await railText(el)).toContain(panelMessages('ja').copy);
  });
});

describe('send to Claude', () => {
  const sendButton = (el: DpkTemplatePrototype): HTMLButtonElement | undefined => {
    const panel = el.shadowRoot?.querySelector('dpk-component-comment-panel') as DpkComponentCommentPanel;
    return Array.from(panel.shadowRoot?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent?.trim() === panelMessages('en').sendToClaude,
    );
  };
  const flush = async (el: DpkTemplatePrototype): Promise<void> => {
    for (let i = 0; i < 4; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await settle(el);
      const panel = el.shadowRoot?.querySelector('dpk-component-comment-panel') as DpkComponentCommentPanel | null;
      await panel?.updateComplete;
    }
  };

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'claude');
  });

  it('keeps only the copy buttons outside a Claude Artifact', async () => {
    const el = mount();
    await flush(el);
    expect(sendButton(el)).toBeUndefined();
  });

  it('posts the brief as a comment sent to Claude, pinned to the template element', async () => {
    const sendToClaude = vi.fn(async () => ({ threadId: 't', commentId: 'c' }));
    const anchorFor = vi.fn(async () => ({ path: 'x', x: 0, y: 0 }));
    const comments = { anchorFor, sendToClaude, canSendToClaude: async () => 'available' };
    Object.assign(window, { claude: { use: async (name: string) => (name === 'comments' ? comments : null) } });

    const el = mount();
    await flush(el);
    el.api.comment('page:prototype', 'looks good');
    await flush(el);
    sendButton(el)?.click();
    await flush(el);

    expect(anchorFor).toHaveBeenCalledWith(el);
    expect(sendToClaude).toHaveBeenCalledWith({
      anchor: { path: 'x', x: 0, y: 0 },
      text: expect.stringContaining('looks good'),
    });
  });

  it('sends from the floating hand-off without opening the rail', async () => {
    const sendToClaude = vi.fn(async () => ({ threadId: 't', commentId: 'c' }));
    const comments = {
      anchorFor: async () => ({ path: 'x', x: 0, y: 0 }),
      sendToClaude,
      canSendToClaude: async () => 'available',
    };
    Object.assign(window, { claude: { use: async (name: string) => (name === 'comments' ? comments : null) } });

    const el = mount();
    await flush(el);
    el.api.comment('page:prototype', 'ship it');
    await flush(el);
    const send = [...(el.shadowRoot?.querySelectorAll<HTMLButtonElement>('.dpk-dock button') ?? [])].find(
      (button) => button.textContent?.trim() === coreMessages('en').handoffSend,
    );
    send?.click();
    await flush(el);

    expect(sendToClaude).toHaveBeenCalledWith({ anchor: expect.anything(), text: expect.stringContaining('ship it') });
    expect(el.shadowRoot?.querySelector('.dpk-notes')?.hasAttribute('hidden')).toBe(true);
  });
});
