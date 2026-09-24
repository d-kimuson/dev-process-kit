// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkComponentCommentPanel } from '../components/comment-panel';
import type { DpkTemplatePrototype } from '../templates/prototype/element';

import { prototypeDefinition } from '../templates/prototype/definition';
import '../index';

const base = {
  title: 'Demo',
  activities: [
    {
      id: 'onboarding',
      name: 'Onboarding',
      stories: [
        {
          id: 'account',
          name: 'Account',
          steps: [
            {
              id: 'landing',
              name: 'Landing',
              previews: [{ id: 'landing-mobile', kind: 'browser', viewport: 'mobile' }],
            },
            {
              id: 'google-auth',
              name: 'Google auth',
              previews: [
                { id: 'auth-mobile', kind: 'browser', viewport: 'mobile' },
                { id: 'auth-desktop', kind: 'browser', viewport: 'desktop' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const mount = (hash = ''): DpkTemplatePrototype => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-template-prototype storage="memory">
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
    expect(prototypeDefinition.name).toBe('prototype');
    expect(prototypeDefinition.label).toBe('UX Prototype');
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
    expect(toggle(el).getAttribute('aria-label')).toBe('ダークテーマにする');

    toggle(el).click();
    await settle(el);
    expect(el.dataset['theme']).toBe('dark');
    expect(toggle(el).getAttribute('aria-label')).toBe('ライトテーマにする');
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

describe('send to Claude', () => {
  const sendButton = (el: DpkTemplatePrototype): HTMLButtonElement | undefined => {
    const panel = el.shadowRoot?.querySelector('dpk-component-comment-panel') as DpkComponentCommentPanel;
    return Array.from(panel.shadowRoot?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent?.trim() === 'Claude に送る',
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
});
