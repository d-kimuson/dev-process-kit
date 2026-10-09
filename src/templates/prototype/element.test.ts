// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkComponentInlineEdit } from '../../components/inline-edit';
import type { DpkTemplatePrototype } from './element';

import '../../index';
import { prototypeAction } from './actions';
import { prototypeMessages } from './messages';

const m = prototypeMessages('en');

const base = {
  title: 'Demo',
  apps: [
    {
      id: 'app',
      name: 'App',
      screens: [
        {
          id: 'landing',
          title: 'Welcome',
          previews: [
            { id: 'landing-mobile', kind: 'browser', viewport: 'mobile' },
            { id: 'landing-desktop', kind: 'browser', viewport: 'desktop' },
          ],
        },
        {
          id: 'mail',
          title: 'Mail',
          previews: [{ id: 'mail-inbox', kind: 'mail', mail: { from: 'Demo <hi@demo.example>', subject: 'Welcome' } }],
        },
        { id: 'desk', title: 'Desk', previews: [{ id: 'desk-screen', viewport: 'desktop' }] },
      ],
    },
  ],
  activities: [
    {
      id: 'onboarding',
      name: 'Onboarding',
      actor: 'Visitor',
      stories: [
        {
          id: 'account',
          name: 'Account',
          steps: [
            { id: 'landing', name: 'Landing', screen: 'landing' },
            { id: 'auth', name: 'Auth', materials: [{ id: 'auth-native', kind: 'native', viewport: 'mobile' }] },
            {
              id: 'memo',
              name: 'Memo',
              situation: 'The clerk receives a FAX.\nIt is 8 am.',
              materials: [{ id: 'memo-plain', kind: 'plain' }],
            },
            { id: 'mail', name: 'Mail', screen: 'mail' },
            {
              id: 'desk',
              name: 'Desk',
              screen: 'desk',
              materials: [{ id: 'desk-memo', kind: 'plain', label: 'Memo in hand' }],
            },
          ],
        },
        { id: 'billing', name: 'Billing', steps: [{ id: 'invoice', name: 'Invoice' }] },
        { id: 'tasks', name: 'Check every task', description: 'All open tasks on one list' },
      ],
    },
  ],
};

const mount = (hash = '', lang = ''): DpkTemplatePrototype => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-template-prototype storage="memory"${lang === '' ? '' : ` lang="${lang}"`}>
      <script type="application/json">${JSON.stringify(base)}</script>
      <div slot="preview" data-preview-id="landing-mobile">mobile</div>
    </dpk-template-prototype>`;
  return document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
};

const settle = async (el: DpkTemplatePrototype): Promise<void> => {
  await el.api.ready;
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
};

describe('<dpk-template-prototype> layout', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('renders the navigation from the render function', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    const selects = root.querySelectorAll<HTMLSelectElement>('.nav select');
    expect(selects).toHaveLength(2);
    expect([...selects[1]!.options].map((o) => o.value)).toEqual(['account', 'billing', 'tasks']);
    expect(root.querySelectorAll('.step-row')).toHaveLength(5);
    expect(root.querySelector('.step-row[data-current="true"] .step-name')?.textContent).toBe('Landing');
    expect(root.querySelectorAll('.detail dpk-component-inline-edit')).toHaveLength(2);
  });

  it('renders the stage: tabs, frame, placeholder and parked slots', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    expect(root.querySelectorAll('.tabs .tab')).toHaveLength(2);
    const frame = root.querySelector('figure.frame')!;
    expect(frame.getAttribute('data-viewport')).toBe('mobile');
    expect(frame.querySelector('slot')?.getAttribute('name')).toBe('preview:landing-mobile');
    // light DOM exists for the active preview, so no placeholder
    expect(frame.querySelector('.frame-placeholder')).toBeNull();
    // every other preview keeps a parked slot: every screen's renditions first, then every step's materials
    const parked = [...root.querySelectorAll('.parked slot')].map((slot) => slot.getAttribute('name'));
    expect(parked).toEqual([
      'preview:landing-desktop',
      'preview:mail-inbox',
      'preview:desk-screen',
      'preview:auth-native',
      'preview:memo-plain',
      'preview:desk-memo',
    ]);
    // the step without previews says so instead of rendering an empty frame
    el.api.navigate({ story: 'billing', step: 'invoice' });
    await settle(el);
    expect(root.querySelector('figure.frame')).toBeNull();
    expect(root.querySelector('.stage .dpk-label')?.textContent).toBe(m.noPreviewMetadata);
  });

  it('heads the stage with who uses the page and its title', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    const head = root.querySelector('.stage .page-head')!;
    expect(head.querySelector('.page-actor')?.textContent?.trim()).toBe('Visitor');
    expect(head.querySelector('.page-actor')?.getAttribute('aria-label')).toBe(m.pageActor('Visitor'));
    expect(head.querySelector('.page-title')?.textContent?.trim()).toBe('Welcome');
    // away from the product, the step name heads the page
    el.api.navigate({ step: 'auth' });
    await settle(el);
    expect(root.querySelector('.page-head .page-title')?.textContent?.trim()).toBe('Auth');
  });

  it('shows a placeholder and the native status bar when the preview has no markup', async () => {
    const el = mount('#step=auth');
    await settle(el);
    const root = el.shadowRoot!;
    const frame = root.querySelector('figure.frame')!;
    expect(frame.getAttribute('data-kind')).toBe('native');
    expect(frame.querySelector('.status-bar')).not.toBeNull();
    expect(frame.querySelector('.frame-placeholder')?.textContent).toContain('auth-native');
    expect(root.querySelector('.tabs')).toBeNull();
  });

  it('draws a mail preview as a message: subject and envelope above the body', async () => {
    const el = mount('#step=mail');
    await settle(el);
    const frame = el.shadowRoot!.querySelector('figure.frame')!;
    expect(frame.getAttribute('data-kind')).toBe('mail');
    expect(frame.querySelector('.chrome .url')).toBeNull();
    expect(frame.querySelector('.mail-subject')?.textContent?.trim()).toBe('Welcome');
    expect([...frame.querySelectorAll('.mail-meta dt')].map((dt) => dt.textContent?.trim())).toEqual([m.mailFrom]);
    expect(frame.querySelector('.mail-meta dd')?.textContent?.trim()).toBe('Demo <hi@demo.example>');
    expect(frame.querySelector('.viewport slot')?.getAttribute('name')).toBe('preview:mail-inbox');
  });

  it('describes the situation of the scene just above the preview', async () => {
    const el = mount('#step=memo');
    await settle(el);
    const root = el.shadowRoot!;
    const situation = root.querySelector('.stage .situation')!;
    expect(situation.querySelector('.situation-label')?.textContent?.trim()).toBe(m.situation);
    expect(situation.querySelector('.situation-text')?.textContent).toBe('The clerk receives a FAX.\nIt is 8 am.');
    // between the page head and the canvas
    expect(situation.previousElementSibling?.classList.contains('stage-bar')).toBe(true);
    expect(situation.nextElementSibling?.classList.contains('canvas')).toBe(true);
    // a step without one has no empty box
    el.api.navigate({ step: 'landing' });
    await settle(el);
    expect(root.querySelector('.stage .situation')).toBeNull();
  });

  it('lays the materials of a step out beside its screen', async () => {
    const el = mount('#step=desk');
    await settle(el);
    const root = el.shadowRoot!;
    expect(root.querySelector('.tabs')).toBeNull();
    const panes = [...root.querySelectorAll('.canvas .pane')];
    expect(panes.map((pane) => pane.querySelector('figure.frame slot')?.getAttribute('name'))).toEqual([
      'preview:desk-memo',
      'preview:desk-screen',
    ]);
    expect(root.querySelector('.canvas')?.getAttribute('data-layout')).toBe('side-by-side');
    // a label captions its pane; a pane without one has no caption
    expect(panes[0]?.querySelector('.pane-label')?.textContent?.trim()).toBe('Memo in hand');
    expect(panes[1]?.querySelector('.pane-label')).toBeNull();
    // nothing on screen is parked
    const parked = [...root.querySelectorAll('.parked slot')].map((slot) => slot.getAttribute('name'));
    expect(parked).not.toContain('preview:desk-memo');
    expect(parked).not.toContain('preview:desk-screen');
  });

  it('draws a plain preview without any device chrome', async () => {
    const el = mount('#step=memo');
    await settle(el);
    const frame = el.shadowRoot!.querySelector('figure.frame')!;
    expect(frame.getAttribute('data-kind')).toBe('plain');
    expect(frame.querySelector('.chrome')).toBeNull();
    expect(frame.querySelector('.status-bar')).toBeNull();
    expect(frame.querySelector('slot')?.getAttribute('name')).toBe('preview:memo-plain');
  });

  it('navigates through the selects and adds a step', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot!;
    const storySelect = root.querySelectorAll<HTMLSelectElement>('.nav select')[1]!;
    storySelect.value = 'billing';
    storySelect.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(el);
    expect(location.hash).toContain('story=billing');
    expect(root.querySelectorAll('.step-row')).toHaveLength(1);
    expect(root.querySelector('.step-row[data-current="true"] .step-name')?.textContent).toBe('Invoice');
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(m.addStepButton))!.click();
    await settle(el);
    expect(el.api.actions.some((a) => a.type === 'ADD_STEP')).toBe(true);
    expect(root.querySelectorAll('.step-row')).toHaveLength(2);
    expect(location.hash).toContain('step=new-step');
  });

  it('takes a `data-dpk-navigate` story link inside a preview to that story', async () => {
    const el = mount('#step=landing');
    await settle(el);
    const trigger = document.createElement('a');
    trigger.setAttribute('data-dpk-navigate', 'story=billing');
    el.querySelector('[data-preview-id="landing-mobile"]')?.append(trigger);
    trigger.click();
    await settle(el);
    expect(el.api.navigation).toMatchObject({ story: 'billing', step: 'invoice' });
    expect(el.shadowRoot!.querySelector('.step-row[data-current="true"] .step-name')?.textContent).toBe('Invoice');
  });

  it('shows a story that has no steps yet as the story itself', async () => {
    const el = mount('#step=landing');
    await settle(el);
    el.api.navigate({ story: 'tasks' });
    await settle(el);
    const root = el.shadowRoot!;
    expect(el.api.navigation).toEqual({ activity: 'onboarding', story: 'tasks' });
    expect(root.querySelectorAll<HTMLSelectElement>('.nav select')[1]!.value).toBe('tasks');
    expect(root.querySelectorAll('.step-row')).toHaveLength(0);
    const story = root.querySelector('.stage .stage-story')!;
    expect(story.querySelector('.page-title')?.textContent?.trim()).toBe('Check every task');
    expect(story.textContent).toContain('All open tasks on one list');
    expect(story.textContent).toContain(m.storyWithoutSteps);
    expect(root.querySelector('figure.frame')).toBeNull();
  });

  it('formats the descriptions as Markdown, and edits a step description as its source', async () => {
    const el = mount('#step=landing');
    await settle(el);
    el.api.dispatch(
      prototypeAction.setStepDescription('onboarding.account.landing', '**Sign up** first\n- name\n- mail'),
    );
    await settle(el);
    const root = el.shadowRoot!;
    const editor = root.querySelectorAll<DpkComponentInlineEdit>('.detail dpk-component-inline-edit')[1]!;
    expect(editor.markdown).toBe(true);
    await editor.updateComplete;
    const view = editor.shadowRoot!.querySelector('.view')!;
    expect(view.querySelector('strong')?.textContent).toBe('Sign up');
    expect(view.querySelectorAll('li')).toHaveLength(2);

    el.api.dispatch(prototypeAction.setStoryDescription('onboarding.tasks', 'All open tasks\n\n- **today**\n- later'));
    el.api.navigate({ story: 'tasks' });
    await settle(el);
    const story = root.querySelector('.stage .story-description')!;
    expect(story.querySelector('strong')?.textContent).toBe('today');
    expect(story.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders the ja dictionary text under lang="ja", and en without one', async () => {
    const english = mount();
    await settle(english);
    english.api.navigate({ story: 'billing', step: 'invoice' });
    await settle(english);
    expect(english.shadowRoot!.querySelector('.stage .dpk-label')?.textContent).toBe(m.noPreviewMetadata);

    const japanese = mount('', 'ja');
    await settle(japanese);
    expect(japanese.locale).toBe('ja');
    japanese.api.navigate({ story: 'billing', step: 'invoice' });
    await settle(japanese);
    expect(japanese.shadowRoot!.querySelector('.stage .dpk-label')?.textContent).toBe(
      prototypeMessages('ja').noPreviewMetadata,
    );
  });

  it('warns once on the console about links in the previews that lead nowhere', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.location.hash = '';
    document.body.innerHTML = `
      <dpk-template-prototype storage="memory">
        <script type="application/json">${JSON.stringify(base)}</script>
        <div slot="preview" data-preview-id="landing-mobile">
          <a href="#">Home</a><a data-dpk-navigate="step=nope">Next</a><a data-dpk-navigate="story=billing">Billing</a>
        </div>
      </dpk-template-prototype>`;
    const el = document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
    await settle(el);
    el.api.navigate({ step: 'auth' });
    await settle(el);
    const warnings = warn.mock.calls.map((call) => String(call[0])).filter((text) => text.includes('lead nowhere'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('2 link(s)');
    expect(warnings[0]).toContain('landing-mobile: <a> "Home" → # (no-destination)');
    expect(warnings[0]).toContain('landing-mobile: <a> "Next" → step=nope (unknown-target)');
    warn.mockRestore();
  });

  describe('comment on UI', () => {
    const withMock = async (): Promise<DpkTemplatePrototype> => {
      const el = mount('#step=landing');
      await settle(el);
      el.querySelector('[data-preview-id="landing-mobile"]')!.innerHTML =
        '<nav><a href="#story=billing" data-dpk-navigate="story=billing"><span>Billing</span></a></nav><button class="pay">Pay now</button>';
      return el;
    };
    const toggle = (el: DpkTemplatePrototype): HTMLButtonElement =>
      el.shadowRoot!.querySelector<HTMLButtonElement>('.ui-comment-toggle')!;

    it('turns the mode on and off from the stage tools, with a hint while it is on', async () => {
      const el = await withMock();
      const root = el.shadowRoot!;
      expect(toggle(el).getAttribute('aria-pressed')).toBe('false');
      expect(root.querySelector('.ui-comment-hint')).toBeNull();
      toggle(el).click();
      await settle(el);
      expect(toggle(el).getAttribute('aria-pressed')).toBe('true');
      expect(root.querySelector('.stage')?.getAttribute('data-ui-comment')).toBe('picking');
      expect(root.querySelector('.ui-comment-hint')?.textContent).toContain(m.uiCommentHint);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle(el);
      expect(root.querySelector('.stage')?.getAttribute('data-ui-comment')).toBe('off');
    });

    it('takes a click on the mock as a pick: the link does not navigate and a comment lands on the element', async () => {
      const el = await withMock();
      toggle(el).click();
      await settle(el);
      el.querySelector<HTMLElement>('nav a span')!.click();
      await settle(el);
      // the mock's own link did not run
      expect(el.api.navigation['step']).toBe('landing');
      const root = el.shadowRoot!;
      const composer = root.querySelector('.comment-pop')!;
      expect(composer.querySelector('.comment-target')?.textContent).toBe('landing-mobile › "Billing"');
      const textarea = composer.querySelector('textarea')!;
      textarea.value = 'Should say Invoices';
      textarea.dispatchEvent(new Event('input'));
      await settle(el);
      root.querySelector<HTMLButtonElement>('.comment-pop .dpk-btn--accent')!.click();
      await settle(el);
      expect(el.api.comments.map((action) => [action.target, action.payload])).toEqual([
        [{ type: 'ui', id: 'landing-mobile/a "Billing"' }, { body: 'Should say Invoices' }],
      ]);
      // still picking, composer closed, and a pin marks the element
      expect(root.querySelector('.comment-pop')).toBeNull();
      expect(root.querySelector('.stage')?.getAttribute('data-ui-comment')).toBe('picking');
      expect(root.querySelector('.ui-pin')?.textContent?.trim()).toBe('1');
      expect(root.querySelector('.ui-pin')?.getAttribute('data-selector')).toBe('a');
      // the step counts it
      expect(root.querySelector('.step-row[data-current="true"] .step-note')?.textContent).toBe('1');
      // the review names the element
      expect(el.api.exportBrief()).toContain('**UI · landing-mobile › "Billing"** — `ui:landing-mobile/a "Billing"`');
    });

    it('leaves the mock working while the mode is off', async () => {
      const el = await withMock();
      el.querySelector<HTMLElement>('nav a span')!.click();
      await settle(el);
      expect(el.api.navigation).toMatchObject({ story: 'billing' });
      expect(el.shadowRoot!.querySelector('.comment-pop')).toBeNull();
    });
  });

  describe('maximize', () => {
    let shown: Element[] = [];
    let hidden: Element[] = [];

    beforeEach(() => {
      shown = [];
      hidden = [];
      HTMLElement.prototype.showPopover = function (this: HTMLElement) {
        shown.push(this);
      };
      HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
        hidden.push(this);
      };
    });

    afterEach(() => {
      Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
      Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
    });

    const escape = (): void => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    };

    it('fills the tab with the stage and restores it from the same button', async () => {
      const el = mount();
      await settle(el);
      const root = el.shadowRoot!;
      const button = (): HTMLButtonElement => root.querySelector<HTMLButtonElement>('.stage-bar .stage-maximize')!;
      expect(button().textContent).toContain(m.maximize);
      expect(button().getAttribute('aria-pressed')).toBe('false');

      button().click();
      await settle(el);
      const stage = root.querySelector<HTMLElement>('.stage')!;
      expect(stage.classList.contains('is-maximized')).toBe(true);
      // Lifted into the top layer, so no ancestor of the page can clip it.
      expect(stage.getAttribute('popover')).toBe('manual');
      expect(shown).toEqual([stage]);
      // The page keeps the room the stage took, so nothing behind it reflows.
      expect(root.querySelector('.stage-placeholder')).not.toBeNull();
      expect(button().textContent).toContain(m.restore);
      expect(button().getAttribute('aria-pressed')).toBe('true');

      button().click();
      await settle(el);
      expect(root.querySelector('.stage')!.classList.contains('is-maximized')).toBe(false);
      expect(root.querySelector('.stage')!.hasAttribute('popover')).toBe(false);
      expect(root.querySelector('.stage-placeholder')).toBeNull();
    });

    it('restores on Esc', async () => {
      const el = mount();
      await settle(el);
      const root = el.shadowRoot!;
      root.querySelector<HTMLButtonElement>('.stage-maximize')!.click();
      await settle(el);
      escape();
      await settle(el);
      expect(root.querySelector('.stage')!.classList.contains('is-maximized')).toBe(false);
    });

    it('lets Esc end commenting on the UI before it restores', async () => {
      const el = mount('#step=landing');
      await settle(el);
      const root = el.shadowRoot!;
      root.querySelector<HTMLButtonElement>('.stage-maximize')!.click();
      await settle(el);
      root.querySelector<HTMLButtonElement>('.ui-comment-toggle')!.click();
      await settle(el);
      expect(root.querySelector('.stage')?.getAttribute('data-ui-comment')).toBe('picking');

      escape();
      await settle(el);
      expect(root.querySelector('.stage')?.getAttribute('data-ui-comment')).toBe('off');
      expect(root.querySelector('.stage')!.classList.contains('is-maximized')).toBe(true);

      escape();
      await settle(el);
      expect(root.querySelector('.stage')!.classList.contains('is-maximized')).toBe(false);
    });

    it('opens the composer above the maximized stage', async () => {
      const el = mount('#step=landing');
      await settle(el);
      el.querySelector('[data-preview-id="landing-mobile"]')!.innerHTML = '<button class="pay">Pay now</button>';
      const root = el.shadowRoot!;
      root.querySelector<HTMLButtonElement>('.stage-maximize')!.click();
      await settle(el);
      root.querySelector<HTMLButtonElement>('.ui-comment-toggle')!.click();
      await settle(el);
      el.querySelector<HTMLElement>('.pay')!.click();
      await settle(el);
      const composer = root.querySelector('.comment-pop')!;
      // The top layer stacks in the order things entered it: the stage first, the composer over it.
      expect(shown).toEqual([root.querySelector('.stage'), composer]);
      expect(root.activeElement).toBe(composer.querySelector('textarea'));
    });

    it('raises a composer opened before the stage was maximized above it', async () => {
      const el = mount('#step=landing');
      await settle(el);
      el.querySelector('[data-preview-id="landing-mobile"]')!.innerHTML = '<button class="pay">Pay now</button>';
      const root = el.shadowRoot!;
      root.querySelector<HTMLButtonElement>('.ui-comment-toggle')!.click();
      await settle(el);
      el.querySelector<HTMLElement>('.pay')!.click();
      await settle(el);
      const composer = root.querySelector('.comment-pop')!;
      expect(shown).toEqual([composer]);

      root.querySelector<HTMLButtonElement>('.stage-maximize')!.click();
      await settle(el);

      expect(hidden).toEqual([composer]);
      expect(shown).toEqual([composer, root.querySelector('.stage'), composer]);
      expect(root.activeElement).toBe(composer.querySelector('textarea'));
    });

    it('offers no maximize for a step without a preview', async () => {
      const el = mount('#story=billing&step=invoice');
      await settle(el);
      expect(el.shadowRoot!.querySelector('.stage-maximize')).toBeNull();
    });
  });
});
