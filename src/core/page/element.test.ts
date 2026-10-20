// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { PageElement } from './element';
import '../../index';

const BASE = '<script type="application/json">{"title":"Screens","activities":[]}</script>';

type Board = HTMLElement & {
  readonly api: {
    readonly actions: readonly { type: string; target: unknown }[];
    readonly ready: Promise<void>;
    comment(target: string, body: string): unknown;
  };
};

const isBoard = (element: Element | null): element is Board => element instanceof HTMLElement && 'api' in element;

const mount = async () => {
  const page = document.createElement('dpk-page');
  if (!(page instanceof PageElement)) throw new Error('not upgraded');
  page.storage = 'memory';
  page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
    <dpk-template-prototype board="before" label="Before">${BASE}</dpk-template-prototype>
    <dpk-template-prototype board="after" label="After">${BASE}</dpk-template-prototype>`;
  document.body.append(page);
  await page.api.ready;
  await page.updateComplete;
  const board = (id: string): Board => {
    const element = page.querySelector(`[board="${id}"]`);
    if (!isBoard(element)) throw new Error(`no board ${id}`);
    return element;
  };
  const shadow = (selector: string): HTMLElement => {
    const element = page.renderRoot.querySelector(selector);
    if (!(element instanceof HTMLElement)) throw new Error(`no ${selector}`);
    return element;
  };
  /** Lets the boards the page made upgrade, read their base and render. */
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.updateComplete;
    await Promise.all(
      Array.from(page.children)
        .filter(isBoard)
        .map((child) => child.api.ready),
    );
    await page.updateComplete;
  };
  return { page, before: board('before'), after: board('after'), board, shadow, settle };
};

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
});

describe('<dpk-page>', () => {
  it('keeps one draft for every board and gives each board its own part', async () => {
    const { page, before, after } = await mount();
    expect(before.api.comment('page:prototype', 'too many steps')).toMatchObject({ ok: true });
    expect(after.api.comment('page:prototype@before', 'compare with this')).toMatchObject({ ok: true });
    await page.updateComplete;
    expect(page.api.actions.map((action) => action.target)).toEqual([
      { type: 'page', id: 'prototype@before' },
      { type: 'page', id: 'prototype@before' },
    ]);
    expect(before.api.actions.map((action) => action.target)).toEqual([
      { type: 'page', id: 'prototype' },
      { type: 'page', id: 'prototype' },
    ]);
    expect(after.api.actions).toEqual([]);
  });

  it('shows only the board the hash names', async () => {
    const { page, before, after } = await mount();
    expect(page.api.navigation).toMatchObject({ board: 'before' });
    expect([before.hidden, after.hidden]).toEqual([false, true]);
    page.api.navigate({ board: 'after' });
    await page.updateComplete;
    expect([before.hidden, after.hidden]).toEqual([true, false]);
  });

  it('reports the work on a board that is taken away as stale', async () => {
    const { page, after } = await mount();
    after.api.comment('page:prototype', 'gone soon');
    after.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.updateComplete;
    expect(page.api.stale.map((entry) => entry.action.target)).toEqual([{ type: 'page', id: 'prototype@after' }]);
  });

  it('adds a board from the rail as a change of the draft', async () => {
    const { page, board, shadow, settle } = await mount();
    shadow('.dpk-page-add').click();
    await page.updateComplete;
    shadow('.dpk-page-add-option[data-template="usm"]').click();
    await settle();
    expect(page.api.actions.map((action) => [action.type, action.target])).toEqual([
      ['ADD_BOARD', { type: 'page', id: 'page' }],
    ]);
    expect(page.api.navigation).toMatchObject({ board: 'usm' });
    const added = board('usm');
    expect(added.localName).toBe('dpk-template-usm');
    expect(added.hidden).toBe(false);
    expect(Array.from(page.renderRoot.querySelectorAll('.dpk-page-tab'), (tab) => tab.textContent?.trim())).toEqual([
      'Before',
      'After',
      'User Story Mapping',
    ]);
  });

  it('takes an added board back with everything the draft says about it', async () => {
    const { page, board, shadow, settle } = await mount();
    shadow('.dpk-page-add').click();
    await page.updateComplete;
    shadow('.dpk-page-add-option[data-template="usm"]').click();
    await settle();
    board('usm').api.comment('page:usm', 'scope first');
    await page.updateComplete;
    shadow('.dpk-page-tab-remove[data-board="usm"]').click();
    await settle();
    expect(page.api.actions).toEqual([]);
    expect(page.querySelector('[board="usm"]')).toBeNull();
    expect(page.api.navigation).toMatchObject({ board: 'before' });
  });

  it('removes a board of the page as a change of the draft', async () => {
    const { page, after, shadow, settle } = await mount();
    shadow('.dpk-page-tab-remove[data-board="after"]').click();
    await settle();
    expect(page.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['REMOVE_BOARD', { board: 'after' }],
    ]);
    expect(after.hidden).toBe(true);
    expect(page.renderRoot.querySelector('.dpk-page-tab[data-board="after"]')).toBeNull();
  });

  it('names the board it shows in the shared header', async () => {
    const { page, shadow } = await mount();
    expect(shadow('.dpk-template-mark').textContent?.trim()).toBe('UX Prototype');
    expect(shadow('.dpk-page-crumb').textContent?.trim()).toBe('Before');
    page.api.navigate({ board: 'after' });
    await page.updateComplete;
    expect(shadow('.dpk-page-crumb').textContent?.trim()).toBe('After');
  });
});
