// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DpkTemplatePrototype } from './element';

import '../../index';
import { prototypeMessages } from './messages';

const m = prototypeMessages('en');

const base = {
  title: 'Demo',
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
            {
              id: 'landing',
              name: 'Landing',
              title: 'Welcome',
              previews: [
                { id: 'landing-mobile', kind: 'browser', viewport: 'mobile' },
                { id: 'landing-desktop', kind: 'browser', viewport: 'desktop' },
              ],
            },
            { id: 'auth', name: 'Auth', previews: [{ id: 'auth-native', kind: 'native', viewport: 'mobile' }] },
          ],
        },
        { id: 'billing', name: 'Billing', steps: [{ id: 'invoice', name: 'Invoice', previews: [] }] },
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
    expect([...selects[1]!.options].map((o) => o.value)).toEqual(['account', 'billing']);
    expect(root.querySelectorAll('.step-row')).toHaveLength(2);
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
    // every other preview keeps a parked slot
    const parked = [...root.querySelectorAll('.parked slot')].map((slot) => slot.getAttribute('name'));
    expect(parked).toEqual(['preview:landing-desktop', 'preview:auth-native']);
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
    // without a title the step name heads the page
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
});
