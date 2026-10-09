// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DpkComponentInlineEdit } from '../components/inline-edit';
import type { DpkTemplatePrototype } from '../templates/prototype/element';

import {
  forgetUnsentText,
  recordUnsentText,
  textToRestore,
  unsentTextId,
  UNSENT_TEXT_LIMIT,
  type UnsentTexts,
} from './text-recovery';
import '../index';

describe('unsent text records', () => {
  const field = { hosts: ['dpk-component-inline-edit'], name: 'Step name', base: 'Landing' };

  it('files a field by where it sits and what it started from, unless it is keyed', () => {
    expect(unsentTextId(field)).not.toBe(unsentTextId({ ...field, base: 'Checkout' }));
    expect(unsentTextId({ ...field, key: 'step:a' })).toBe(unsentTextId({ ...field, key: 'step:a', base: 'other' }));
    expect(unsentTextId({ ...field, key: 'step:a' })).not.toBe(unsentTextId({ ...field, key: 'step:b' }));
  });

  it('forgets a field typed back to where it started', () => {
    const typed = recordUnsentText({}, 'a', { base: 'x', value: 'xy' });
    expect(typed).toEqual({ a: { base: 'x', value: 'xy' } });
    expect(recordUnsentText(typed, 'a', { base: 'x', value: 'x' })).toEqual({});
    expect(forgetUnsentText(typed, 'a')).toEqual({});
  });

  it('keeps the most recently typed fields when there are too many', () => {
    let texts: UnsentTexts = {};
    for (let index = 0; index <= UNSENT_TEXT_LIMIT; index += 1)
      texts = recordUnsentText(texts, `f${index}`, { base: '', value: `text ${index}` });
    texts = recordUnsentText(texts, 'f1', { base: '', value: 'typed again' });
    expect(Object.keys(texts)).toHaveLength(UNSENT_TEXT_LIMIT);
    expect(texts['f0']).toBeUndefined();
    expect(Object.keys(texts).at(-1)).toBe('f1');
  });

  it('restores only into a field that opens where the reader left it', () => {
    const texts = { a: { base: '', value: 'half written' } };
    expect(textToRestore(texts, 'a', '')).toBe('half written');
    // The field already holds newer text of its own.
    expect(textToRestore(texts, 'a', 'something else')).toBeNull();
    expect(textToRestore(texts, 'missing', '')).toBeNull();
  });
});

describe('keeping unsent text through a reload', () => {
  const base = {
    title: 'Demo',
    apps: [
      { id: 'web', name: 'Web', screens: [{ id: 'landing', title: 'Landing', previews: [{ id: 'landing-mobile' }] }] },
    ],
    activities: [
      {
        id: 'onboarding',
        name: 'Onboarding',
        stories: [
          {
            id: 'account',
            name: 'Account',
            steps: [{ id: 'landing', name: 'Landing', panes: [{ screen: 'landing' }] }],
          },
        ],
      },
    ],
  };

  const mount = (): DpkTemplatePrototype => {
    document.body.innerHTML = `
      <dpk-template-prototype storage-key="unsent-test" notes="on">
        <script type="application/json">${JSON.stringify(base)}</script>
        <div slot="preview" data-preview-id="landing-mobile"><input id="mock-field" /></div>
      </dpk-template-prototype>`;
    return document.querySelector('dpk-template-prototype') as DpkTemplatePrototype;
  };

  const settle = async (el: DpkTemplatePrototype): Promise<void> => {
    await el.api.ready;
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
  };

  /** Opens the step name editor and returns its field, focused as a click would. */
  const openStepName = async (el: DpkTemplatePrototype): Promise<HTMLInputElement> => {
    const editor = el.shadowRoot?.querySelector<DpkComponentInlineEdit>('.detail dpk-component-inline-edit');
    if (!editor) throw new Error('no step name editor');
    editor.startEditing();
    await editor.updateComplete;
    const field = editor.shadowRoot?.querySelector('input');
    if (!field) throw new Error('no field');
    await editor.updateComplete;
    return field;
  };

  const type = (field: HTMLInputElement | HTMLTextAreaElement, value: string): void => {
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  };

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    localStorage.clear();
    sessionStorage.clear();
  });

  it('gives a half-edited name back when the same editor opens after a reload', async () => {
    const el = mount();
    await settle(el);
    type(await openStepName(el), 'Land on the page');

    const reloaded = mount();
    await settle(reloaded);
    const field = await openStepName(reloaded);
    expect(field.value).toBe('Land on the page');
  });

  it('forgets the text once it is committed into the draft', async () => {
    const el = mount();
    await settle(el);
    const field = await openStepName(el);
    type(field, 'Land on the page');
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle(el);
    expect(el.api.state.activities[0]?.stories[0]?.steps[0]?.name).toBe('Land on the page');
    expect(sessionStorage.getItem('unsent-test:unsent-text')).toBeNull();
  });

  it('keeps a review comment through a reload until it is sent', async () => {
    const composer = async (el: DpkTemplatePrototype): Promise<HTMLTextAreaElement> => {
      const panel = el.shadowRoot?.querySelector('dpk-component-comment-panel');
      await (panel as DpkComponentInlineEdit | null)?.updateComplete;
      const area = panel?.shadowRoot?.querySelector<HTMLTextAreaElement>('.composer textarea');
      if (!area) throw new Error('no composer');
      return area;
    };
    const el = mount();
    await settle(el);
    const first = await composer(el);
    first.focus();
    type(first, 'Is this the right first step?');

    const reloaded = mount();
    await settle(reloaded);
    const area = await composer(reloaded);
    area.focus();
    await Promise.resolve();
    expect(area.value).toBe('Is this the right first step?');
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
    await settle(reloaded);
    expect(reloaded.api.comments).toMatchObject([{ payload: { body: 'Is this the right first step?' } }]);
    expect(sessionStorage.getItem('unsent-test:unsent-text')).toBeNull();
  });

  it('leaves the fields of the author mock alone', async () => {
    const el = mount();
    await settle(el);
    const mock = el.querySelector<HTMLInputElement>('#mock-field');
    if (!mock) throw new Error('no mock field');
    mock.focus();
    type(mock, 'typed into the mock');
    expect(sessionStorage.getItem('unsent-test:unsent-text')).toBeNull();
  });
});
