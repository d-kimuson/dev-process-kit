// @vitest-environment jsdom
// `attachInternals()` exists only in jsdom among the project's test DOMs
// (happy-dom has no form-association support at all); jsdom's own
// ElementInternals is itself a stub with no `setFormValue`/`setValidity`, so
// this suite verifies the element's own value/reset/restore contract, which
// does not depend on those methods, and leaves real form submission to
// browser QA (see the class doc on `DpkSelect`).
import { afterEach, describe, expect, it } from 'vitest';

import { DpkSelect } from './element';
import { defineSelect } from './index';

defineSelect();

const raw = {
  options: [
    { value: 'todo', label: 'To do' },
    { value: 'doing', label: 'In progress' },
    { value: 'done', label: 'Done' },
  ],
  value: 'todo',
};

afterEach(() => {
  document.body.replaceChildren();
});

const settle = async (element: DpkSelect): Promise<void> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
};

const mount = async (data: unknown = raw): Promise<DpkSelect> => {
  const element = document.createElement('dpk-select');
  if (!(element instanceof DpkSelect)) throw new Error('did not upgrade');
  element.setAttribute('aria-label', 'Status');
  element.innerHTML = `<script type="application/json">${JSON.stringify(data)}</script>`;
  document.body.append(element);
  await settle(element);
  return element;
};

describe('DpkSelect form association', () => {
  it('declares itself form-associated', () => {
    expect(DpkSelect.formAssociated).toBe(true);
  });

  it('reflects required as a boolean attribute', async () => {
    const element = await mount();
    expect(element.required).toBe(false);
    element.required = true;
    await settle(element);
    expect(element.hasAttribute('required')).toBe(true);
  });

  it('picking an option fires dpk-select-change and updates value', async () => {
    const element = await mount();
    const changes: string[] = [];
    element.addEventListener('dpk-select-change', (event) => {
      changes.push((event as CustomEvent<{ value: string }>).detail.value);
    });
    const trigger = element.renderRoot.querySelector<HTMLButtonElement>('.dpk-rich-select');
    if (!trigger) throw new Error('no trigger');
    trigger.click();
    await settle(element);
    const option = element.renderRoot.querySelector<HTMLElement>('[role="option"][data-value="doing"]');
    if (!option) throw new Error('no doing option');
    option.click();
    await settle(element);
    expect(element.value).toBe('doing');
    expect(changes).toEqual(['doing']);
  });

  it('formResetCallback restores the value the JSON child first named, without firing a change', async () => {
    const element = await mount();
    const changes: string[] = [];
    element.addEventListener('dpk-select-change', (event) => {
      changes.push((event as CustomEvent<{ value: string }>).detail.value);
    });
    element.value = 'done';
    expect(element.value).toBe('done');
    element.formResetCallback();
    expect(element.value).toBe('todo');
    expect(changes).toEqual([]);
  });

  it('formStateRestoreCallback restores a string state (bfcache/autofill)', async () => {
    const element = await mount();
    element.formStateRestoreCallback('done', 'restore');
    expect(element.value).toBe('done');
    element.formStateRestoreCallback(null, 'restore');
    expect(element.value).toBe('done');
  });
});
