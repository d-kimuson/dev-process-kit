// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkCommentPanel } from '../components/comment-panel';
import type { DpkInternalLayoutSidebar } from './layouts/sidebar/element';

import { panelMessages } from '../components/comment-panel/messages';
import { prototypeDefinitionFor } from '../views/prototype/definition';
import { DpkViewPrototype } from '../views/prototype/element';
import { prototypeMessages } from '../views/prototype/messages';
import { COMMENT_ACTION } from './action';
import { sidebarMessages } from './layouts/sidebar/messages';
import { DEFAULT_SIDEBAR_LAYOUT, FOLD_BUTTON, SIDEBAR_WIDTH, type SidebarLayout } from './layouts/sidebar/model';
import { coreMessages } from './messages';
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

const mount = (hash = '', attributes = ''): DpkViewPrototype => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-view-prototype storage="memory" ${attributes}>
      <script type="application/json">${JSON.stringify(base)}</script>
      <div slot="preview" data-preview-id="landing-mobile"><p id="landing-body">hello</p></div>
      <div slot="preview" data-preview-id="auth-mobile"><p id="auth-body">auth</p></div>
      <div slot="preview" data-preview-id="auth-desktop"><p id="auth-desktop-body">auth wide</p></div>
    </dpk-view-prototype>`;
  return document.querySelector('dpk-view-prototype') as DpkViewPrototype;
};

const settle = async (el: DpkViewPrototype): Promise<void> => {
  await el.api.ready;
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
};

/**
 * A template whose own sidebar is on the right. The generic shell tests below
 * need one, and no shipped template takes that side any more (the task board,
 * which used to, keeps its outputs on the left so the review rail never covers
 * them). The fixture states the side itself, so those tests do not depend on
 * any one template's layout.
 */
class DpkViewRightSidebar extends DpkViewPrototype {
  protected override get sidebarLayout(): SidebarLayout {
    return { side: 'right', defaultWidth: DEFAULT_SIDEBAR_LAYOUT.defaultWidth };
  }
}

if (!customElements.get('dpk-view-right-sidebar')) {
  customElements.define('dpk-view-right-sidebar', DpkViewRightSidebar);
}

const mountRightSidebar = (): DpkViewPrototype => {
  document.body.innerHTML = `
    <dpk-view-right-sidebar storage="memory">
      <script type="application/json">${JSON.stringify(base)}</script>
    </dpk-view-right-sidebar>`;
  return document.querySelector('dpk-view-right-sidebar') as DpkViewPrototype;
};

describe('<dpk-view-prototype>', () => {
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
    expect(el.shadowRoot?.querySelectorAll('.nav .dpk-rich-select')).toHaveLength(2);
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
    expect(el.shadowRoot?.querySelector('.frame .dpk-browser-frame-url')?.textContent ?? '').toContain('auth-mobile');

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
    el.shadowRoot?.querySelector<HTMLElement>('.dpk-review-toggle[data-section="changes"]')?.click();
    await settle(el);
    const panel = el.shadowRoot?.querySelector('dpk-comment-panel');
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
    const panel = el.shadowRoot?.querySelector('dpk-comment-panel') as DpkCommentPanel | null;
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

  it('floats the review in a popover outside the page body, so the main column keeps its width', async () => {
    const el = mount();
    await settle(el);
    const review = el.shadowRoot?.querySelector('#dpk-review');
    expect(review?.getAttribute('popover')).toBe('manual');
    expect(review?.closest('.dpk-body')).toBeNull();
    expect(review?.querySelector('dpk-comment-panel')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('.dpk-review-toggle')?.getAttribute('aria-controls')).toBe('dpk-review');
  });

  it('names each button of the floating menu in a label shown on hover, the header holding the settings gear', async () => {
    const el = mount();
    await settle(el);
    const messages = coreMessages('en');
    const header = el.shadowRoot?.querySelector('.dpk-header');
    // The gear is always there: the settings dialog holds the page's own settings.
    expect(header?.querySelector('.dpk-settings-trigger')).not.toBeNull();
    // The reader's own controls sit in the header, not in the dialog.
    expect(header?.querySelector('.dpk-header-tools .dpk-lang-select')).not.toBeNull();
    expect(header?.querySelector('.dpk-header-tools .dpk-theme-toggle')).not.toBeNull();
    const menu = el.shadowRoot?.querySelector('.dpk-floating-menu');
    expect(
      [...(menu?.querySelectorAll('[data-tooltip]') ?? [])].map((button) => button.getAttribute('data-tooltip')),
    ).toEqual([
      messages.menuMove,
      messages.undo,
      messages.redo,
      messages.reviewComments,
      messages.reviewChanges,
      messages.checkModeOff,
    ]);
    expect(menu?.querySelector('.dpk-review-toggle')?.hasAttribute('title')).toBe(false);
  });

  it('keeps the review closed behind the changes and the review comments toggles', async () => {
    const el = mount();
    await settle(el);
    const toggle = (section: string) =>
      el.shadowRoot?.querySelector<HTMLElement>(`.dpk-review-toggle[data-section="${section}"]`) ?? null;
    const panel = () => el.shadowRoot?.querySelector('dpk-comment-panel') as DpkCommentPanel;
    expect(el.notesOpen).toBe(false);
    expect(toggle('changes')?.getAttribute('aria-pressed')).toBe('false');
    expect(toggle('comments')?.getAttribute('aria-pressed')).toBe('false');

    toggle('changes')?.click();
    await settle(el);
    expect(el.notesOpen).toBe(true);
    expect(toggle('changes')?.getAttribute('aria-pressed')).toBe('true');
    expect(panel().section).toBe('changes');

    toggle('comments')?.click();
    await settle(el);
    expect(el.notesOpen).toBe(true);
    expect(toggle('changes')?.getAttribute('aria-pressed')).toBe('false');
    expect(toggle('comments')?.getAttribute('aria-pressed')).toBe('true');
    expect(panel().section).toBe('comments');

    toggle('comments')?.click();
    await settle(el);
    expect(el.notesOpen).toBe(false);
    expect(toggle('comments')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('counts the changes and the review comments of the draft apart on their toggles', async () => {
    const el = mount();
    await settle(el);
    const badge = (section: string) =>
      el.shadowRoot?.querySelector(`.dpk-review-toggle[data-section="${section}"] .dpk-review-badge`) ?? null;
    expect(badge('changes')).toBeNull();
    expect(badge('comments')).toBeNull();
    el.api.dispatch({ type: COMMENT_ACTION, target: 'page:prototype', payload: { body: 'one' } });
    el.api.dispatch({ type: COMMENT_ACTION, target: 'page:prototype', payload: { body: 'two' } });
    el.api.dispatch({ type: 'SET_STEP_NAME', target: 'landing', payload: { name: 'LP' } });
    await settle(el);
    expect(badge('changes')?.textContent?.trim()).toBe('1');
    expect(badge('comments')?.textContent?.trim()).toBe('2');
  });

  it('opens the review comments when a comment is requested', async () => {
    const el = mount();
    await settle(el);
    el.shadowRoot?.querySelector<HTMLElement>('.dpk-review-toggle[data-section="changes"]')?.click();
    await settle(el);
    el.requestComment('page:prototype');
    await settle(el);
    const panel = el.shadowRoot?.querySelector('dpk-comment-panel') as DpkCommentPanel;
    expect(panel.section).toBe('comments');
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

    el.shadowRoot?.querySelector<HTMLElement>('.dpk-review-toggle')?.click();
    await settle(el);
    expect(dock()).toBeNull();
  });

  it('falls back to an empty state with a visible error when base data is invalid', async () => {
    document.body.innerHTML = `
      <dpk-view-prototype storage="memory">
        <script type="application/json">{"activities":[{"id":"a","name":"A","oops":true}]}</script>
      </dpk-view-prototype>`;
    const el = document.querySelector('dpk-view-prototype') as DpkViewPrototype;
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
    document.body.innerHTML = '<dpk-view-prototype storage="memory"></dpk-view-prototype>';
    const el = document.querySelector('dpk-view-prototype') as DpkViewPrototype;
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
  /** The theme toggle of the header, which is where the reader flips it. */
  const toggle = (el: DpkViewPrototype): HTMLButtonElement =>
    el.shadowRoot?.querySelector('.dpk-header-tools .dpk-theme-toggle') as HTMLButtonElement;

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    delete document.documentElement.dataset['theme'];
  });

  it('follows the environment and flips with the header theme toggle', async () => {
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
  const mountStored = (): DpkViewPrototype => {
    document.body.innerHTML = `
      <dpk-view-prototype storage-key="${STORAGE_KEY}" notes="on">
        <script type="application/json">${JSON.stringify(base)}</script>
      </dpk-view-prototype>`;
    return document.querySelector('dpk-view-prototype') as DpkViewPrototype;
  };
  const panelOf = async (el: DpkViewPrototype): Promise<DpkCommentPanel> => {
    const panel = el.shadowRoot?.querySelector('dpk-comment-panel') as DpkCommentPanel;
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
  const layout = (el: Element): DpkInternalLayoutSidebar =>
    el.shadowRoot?.querySelector('dpk-internal-layout-sidebar') as DpkInternalLayoutSidebar;
  const inner = (el: Element): ShadowRoot => layout(el).shadowRoot as ShadowRoot;
  const sidebar = (el: Element): HTMLElement => {
    const panes = Array.from(inner(el).querySelectorAll<HTMLElement>('.sidebar'));
    const filled = panes.find((pane) => (pane.querySelector('slot')?.assignedNodes().length ?? 0) > 0);
    return filled ?? (panes[0] as HTMLElement);
  };
  const width = (el: Element): string => sidebar(el).style.getPropertyValue('--dpk-sidebar-width');
  const edge = (el: Element): HTMLElement | null => inner(el).querySelector('.resizer');
  const press = (target: HTMLElement, key: string): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  };
  const pointer = (target: HTMLElement, type: string, clientX: number): void => {
    target.dispatchEvent(new PointerEvent(type, { pointerId: 1, button: 0, clientX, bubbles: true }));
  };
  const settleAll = async (el: DpkViewPrototype): Promise<void> => {
    await settle(el);
    await layout(el).updateComplete;
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

  it('lays the shell out with a resizable, collapsible sidebar layout', async () => {
    const el = mount();
    await settleAll(el);
    const body = layout(el);
    expect(body.left).toMatchObject({ width: defaultWidth, resizable: true, collapsible: true });
    expect(body.querySelector('.dpk-sidebar')?.getAttribute('slot')).toBe('left');
  });

  it('starts at the default width with a labelled edge after the sidebar', async () => {
    const el = mount();
    await settleAll(el);
    const handle = edge(el) as HTMLElement;
    expect(handle.previousElementSibling).toBe(sidebar(el));
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-label')).toBe(sidebarMessages('en').resizeSidebar);
    expect(handle.getAttribute('aria-valuenow')).toBe(String(defaultWidth));
    expect(width(el)).toBe(`${defaultWidth}px`);
  });

  it('resizes with the keyboard and goes back to the default on double-click', async () => {
    const el = mount();
    await settleAll(el);
    const handle = edge(el) as HTMLElement;

    press(handle, 'ArrowRight');
    await settleAll(el);
    expect(width(el)).toBe(`${defaultWidth + SIDEBAR_WIDTH.step}px`);
    expect(handle.getAttribute('aria-valuenow')).toBe(String(defaultWidth + SIDEBAR_WIDTH.step));

    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settleAll(el);
    expect(width(el)).toBe(`${defaultWidth}px`);
  });

  it('follows a pointer drag on the edge until the pointer is released', async () => {
    const el = mount();
    await settleAll(el);
    const handle = edge(el) as HTMLElement;
    const body = inner(el).querySelector('.body') as HTMLElement;

    pointer(handle, 'pointerdown', 260);
    pointer(handle, 'pointermove', 360);
    await settleAll(el);
    expect(width(el)).toBe(`${defaultWidth + 100}px`);
    expect(body.hasAttribute('data-resizing')).toBe(true);

    pointer(handle, 'pointerup', 360);
    pointer(handle, 'pointermove', 500);
    await settleAll(el);
    expect(width(el)).toBe(`${defaultWidth + 100}px`);
    expect(body.hasAttribute('data-resizing')).toBe(false);
  });

  it("remembers the reader's width for every page of the same template", async () => {
    document.body.innerHTML = '<dpk-view-prototype storage-key="first"></dpk-view-prototype>';
    const first = document.querySelector('dpk-view-prototype') as DpkViewPrototype;
    await settleAll(first);
    press(edge(first) as HTMLElement, 'End');
    await settleAll(first);

    document.body.innerHTML = '<dpk-view-prototype storage-key="second"></dpk-view-prototype>';
    const second = document.querySelector('dpk-view-prototype') as DpkViewPrototype;
    await settleAll(second);
    expect(width(second)).toBe(`${SIDEBAR_WIDTH.max}px`);
  });

  it('puts the edge of a right-hand sidebar on its left, growing it as the edge moves left', async () => {
    const el = mountRightSidebar();
    await settleAll(el);
    const handle = edge(el) as HTMLElement;
    expect(handle.nextElementSibling).toBe(sidebar(el));
    const start = Number(handle.getAttribute('aria-valuenow'));

    press(handle, 'ArrowLeft');
    await settleAll(el);
    expect(width(el)).toBe(`${start + SIDEBAR_WIDTH.step}px`);
  });

  it('has no edge when the template shows no sidebar', async () => {
    document.body.innerHTML = '<dpk-view-usm storage="memory"></dpk-view-usm>';
    const el = document.querySelector('dpk-view-usm') as DpkViewPrototype;
    await settleAll(el);
    expect(sidebar(el).hidden).toBe(true);
    expect(edge(el)).toBeNull();
  });
});

describe('sidebar collapse', () => {
  const layout = (el: Element): DpkInternalLayoutSidebar =>
    el.shadowRoot?.querySelector('dpk-internal-layout-sidebar') as DpkInternalLayoutSidebar;
  const inner = (el: Element): ShadowRoot => layout(el).shadowRoot as ShadowRoot;
  const sidebar = (el: Element): HTMLElement => {
    const panes = Array.from(inner(el).querySelectorAll<HTMLElement>('.sidebar'));
    const filled = panes.find((pane) => (pane.querySelector('slot')?.assignedNodes().length ?? 0) > 0);
    return filled ?? (panes[0] as HTMLElement);
  };
  const toggle = (el: Element): HTMLButtonElement | null => inner(el).querySelector<HTMLButtonElement>('.toggle');
  const edge = (el: Element): HTMLElement | null => inner(el).querySelector('.resizer');
  const settleAll = async (el: DpkViewPrototype): Promise<void> => {
    await settle(el);
    await layout(el).updateComplete;
  };
  const messages = sidebarMessages('en');

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('folds the sidebar away with a labelled button and brings it back', async () => {
    const el = mount();
    await settleAll(el);
    const button = toggle(el) as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe(messages.collapseSidebar);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-controls')).toBe(sidebar(el).id);

    button.click();
    await settleAll(el);
    expect(sidebar(el).hidden).toBe(true);
    expect(edge(el)).toBeNull();
    const expand = toggle(el) as HTMLButtonElement;
    expect(expand.getAttribute('aria-label')).toBe(messages.expandSidebar);
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    // Folded, no strip is left where the sidebar was: the button floats on the main column's edge.
    expect(layout(el).shadowRoot?.querySelector('.strip')).toBeNull();
    expect(expand.dataset['float']).toBe('left');
    expect(inner(el).activeElement).toBe(expand);

    expand.click();
    await settleAll(el);
    expect(sidebar(el).hidden).toBe(false);
    expect(edge(el)).not.toBeNull();
    expect(toggle(el)?.getAttribute('aria-label')).toBe(messages.collapseSidebar);
  });

  it('keeps the resizable edge working once expanded again', async () => {
    const el = mount();
    await settleAll(el);
    (toggle(el) as HTMLButtonElement).click();
    await settleAll(el);
    (toggle(el) as HTMLButtonElement).click();
    await settleAll(el);
    (edge(el) as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await settleAll(el);
    expect(sidebar(el).style.getPropertyValue('--dpk-sidebar-width')).toBe(`${SIDEBAR_WIDTH.max}px`);
  });

  it("remembers the reader's choice for every page of the same template", async () => {
    document.body.innerHTML = '<dpk-view-prototype storage-key="first"></dpk-view-prototype>';
    const first = document.querySelector('dpk-view-prototype') as DpkViewPrototype;
    await settleAll(first);
    (toggle(first) as HTMLButtonElement).click();
    await settleAll(first);

    document.body.innerHTML = '<dpk-view-prototype storage-key="second"></dpk-view-prototype>';
    const second = document.querySelector('dpk-view-prototype') as DpkViewPrototype;
    await settleAll(second);
    expect(sidebar(second).hidden).toBe(true);

    (toggle(second) as HTMLButtonElement).click();
    await settleAll(second);
    expect(localStorage.getItem('dev-process-kit:sidebar-collapsed:prototype')).toBeNull();
  });

  it('keeps the choice to the page load with storage="memory"', async () => {
    const el = mount();
    await settleAll(el);
    (toggle(el) as HTMLButtonElement).click();
    await settleAll(el);
    expect(localStorage.getItem('dev-process-kit:sidebar-collapsed:prototype')).toBeNull();
  });

  it('folds a right-hand sidebar towards the right', async () => {
    const el = mountRightSidebar();
    await settleAll(el);
    const button = toggle(el) as HTMLButtonElement;
    expect(button.nextElementSibling).toBe(edge(el));
    button.click();
    await settleAll(el);
    expect(sidebar(el).hidden).toBe(true);
    expect((toggle(el) as HTMLElement).dataset['float']).toBe('right');
  });

  it("puts an aside on the side the template's sidebar leaves free, with its own fold", async () => {
    document.body.innerHTML = `<dpk-view-prototype storage="memory">
      <div slot="aside">Notes</div>
    </dpk-view-prototype>`;
    const el = document.querySelector('dpk-view-prototype') as DpkViewPrototype;
    await settleAll(el);
    const toggles = Array.from(inner(el).querySelectorAll<HTMLButtonElement>('.toggle'));
    expect(toggles.map((button) => button.dataset['side'])).toEqual(['left', 'right']);
    (toggles[1] as HTMLButtonElement).click();
    await settleAll(el);
    expect(inner(el).querySelector<HTMLElement>('.sidebar[data-side="right"]')?.hidden).toBe(true);
    expect(inner(el).querySelector<HTMLElement>('.sidebar[data-side="left"]')?.hidden).toBe(false);
    expect(inner(el).querySelector<HTMLElement>('.toggle[data-side="right"]')?.dataset['float']).toBe('right');
  });

  it('offers no fold button when the template shows no sidebar', async () => {
    document.body.innerHTML = '<dpk-view-usm storage="memory"></dpk-view-usm>';
    const usm = document.querySelector('dpk-view-usm') as DpkViewPrototype;
    await settleAll(usm);
    expect(toggle(usm)).toBeNull();
  });

  it('tells the main column how far a folded button reaches into it, and nothing while the sidebar is out', async () => {
    const el = mount();
    await settleAll(el);
    const clearance = (): string =>
      inner(el).querySelector<HTMLElement>('.main')?.style.getPropertyValue('--dpk-fold-clearance-left') ?? '';
    expect(clearance()).toBe('0px');

    (toggle(el) as HTMLButtonElement).click();
    await settleAll(el);
    expect(clearance()).toBe(`${FOLD_BUTTON.inset + FOLD_BUTTON.size}px`);

    (toggle(el) as HTMLButtonElement).click();
    await settleAll(el);
    expect(clearance()).toBe('0px');
  });
});

describe('language', () => {
  /** The language select of the header, which is where the reader picks the page's language. */
  const trigger = (el: DpkViewPrototype): HTMLButtonElement =>
    el.shadowRoot?.querySelector('.dpk-header-tools .dpk-lang-select') as HTMLButtonElement;
  const currentLocale = async (el: DpkViewPrototype): Promise<string> => {
    trigger(el).click();
    await settle(el);
    const selected = el.shadowRoot?.querySelector<HTMLElement>(
      '[data-dpk-select] [role="option"][aria-selected="true"]',
    );
    const value = selected?.getAttribute('data-value') ?? '';
    trigger(el).click();
    await settle(el);
    return value;
  };
  const pick = async (el: DpkViewPrototype, locale: string): Promise<void> => {
    trigger(el).click();
    await settle(el);
    el.shadowRoot?.querySelector<HTMLElement>(`[role="option"][data-value="${locale}"]`)?.click();
    await settle(el);
  };
  const railText = async (el: DpkViewPrototype): Promise<string> => {
    const panel = el.shadowRoot?.querySelector('dpk-comment-panel') as DpkCommentPanel;
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
    el.shadowRoot?.querySelector<HTMLElement>('.dpk-review-toggle[data-section="changes"]')?.click();
    await settle(el);
    expect(await currentLocale(el)).toBe('ja');
    expect(await railText(el)).toContain(prototypeMessages('ja').renameStep);

    await pick(el, 'en');
    expect(el.getAttribute('lang')).toBe('en');
    expect(await currentLocale(el)).toBe('en');
    const rail = await railText(el);
    expect(rail).toContain(panelMessages('en').copy);
    expect(rail).toContain(prototypeMessages('en').renameStep);
    expect(el.api.actions).toHaveLength(1);
  });

  it("gives the author's own lang back when the reader picks the page language again", async () => {
    const el = mount('', 'lang="ja-JP"');
    await settle(el);
    expect(await currentLocale(el)).toBe('ja');

    await pick(el, 'en');
    expect(el.getAttribute('lang')).toBe('en');

    await pick(el, 'ja');
    expect(el.getAttribute('lang')).toBe('ja-JP');
    expect(await railText(el)).toContain(panelMessages('ja').copy);
  });
});

describe('send to Claude', () => {
  const sendButton = (el: DpkViewPrototype): HTMLButtonElement | undefined => {
    const panel = el.shadowRoot?.querySelector('dpk-comment-panel') as DpkCommentPanel;
    return Array.from(panel.shadowRoot?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent?.trim() === panelMessages('en').sendToClaude,
    );
  };
  const flush = async (el: DpkViewPrototype): Promise<void> => {
    for (let i = 0; i < 4; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await settle(el);
      const panel = el.shadowRoot?.querySelector('dpk-comment-panel') as DpkCommentPanel | null;
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
    expect(el.notesOpen).toBe(false);
  });
});
