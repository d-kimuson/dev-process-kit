// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { PageElement } from './element';
import '../../index';

const BASE = '<script type="application/json">{"title":"Screens","activities":[]}</script>';
const STEPS = `<script type="application/json">${JSON.stringify({
  title: 'Screens',
  activities: [
    {
      id: 'a',
      name: 'A',
      stories: [
        {
          id: 's',
          name: 'S',
          steps: [
            { id: 's1', name: 'One', panes: [] },
            { id: 's2', name: 'Two', panes: [] },
          ],
        },
      ],
    },
  ],
})}</script>`;

type Board = HTMLElement & {
  readonly api: {
    readonly actions: readonly { type: string; target: unknown }[];
    readonly ready: Promise<void>;
    readonly navigation: Record<string, string>;
    navigate(patch: Record<string, string>): void;
    subscribe(listener: (snapshot: { readonly navigation: unknown }) => void): () => void;
    comment(target: string, body: string): unknown;
  };
};

const isBoard = (element: Element | null): element is Board => element instanceof HTMLElement && 'api' in element;

const mount = async (base = BASE) => {
  const page = document.createElement('dpk-page');
  if (!(page instanceof PageElement)) throw new Error('not upgraded');
  page.storage = 'memory';
  page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
    <dpk-template-prototype board="before" label="Before">${base}</dpk-template-prototype>
    <dpk-template-prototype board="after" label="After">${base}</dpk-template-prototype>`;
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

  describe('navigation a board announces', () => {
    const record = (target: EventTarget) => {
      const seen: unknown[] = [];
      target.addEventListener('dpk-navigate', (event) => {
        if (event instanceof CustomEvent && event.target === target) seen.push(event.detail);
      });
      return seen;
    };

    it('fires dpk-navigate on the board with its own navigation when it navigates', async () => {
      const { page, before } = await mount(STEPS);
      const seen = record(before);
      const changes: unknown[] = [];
      before.api.subscribe((snapshot) => changes.push(snapshot.navigation));
      before.api.navigate({ step: 's2' });
      await page.updateComplete;
      expect(seen).toEqual([{ navigation: before.api.navigation }]);
      expect(before.api.navigation).toMatchObject({ step: 's2' });
      expect(changes).toEqual([before.api.navigation]);
    });

    it('fires it on a board the page or another board moves, and on no board that stays', async () => {
      const { page, before, after } = await mount(STEPS);
      const [onBefore, onAfter] = [record(before), record(after)];
      page.api.navigate({ board: 'after', 'after.step': 's2' });
      await page.updateComplete;
      expect(onBefore).toEqual([]);
      expect(onAfter).toEqual([{ navigation: after.api.navigation }]);
      expect(after.api.navigation).toMatchObject({ step: 's2' });
    });

    it('fires it on a board the hash moves', async () => {
      const { page, before } = await mount(STEPS);
      const seen = record(before);
      window.location.hash = 'board=before&before.step=s2';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await page.updateComplete;
      expect(seen).toEqual([{ navigation: before.api.navigation }]);
      expect(before.api.navigation).toMatchObject({ step: 's2' });
    });

    it('keeps the board’s event off the page, whose own event stays page-qualified', async () => {
      const { page, before } = await mount(STEPS);
      const targets: EventTarget[] = [];
      page.addEventListener('dpk-navigate', (event) => targets.push(event.target ?? page));
      before.api.navigate({ step: 's2' });
      await page.updateComplete;
      expect(targets).toEqual([page]);
    });
  });

  describe('draft changes a board announces', () => {
    const record = (target: EventTarget) => {
      const seen: unknown[] = [];
      target.addEventListener('dpk-change', (event) => {
        if (event instanceof CustomEvent && event.target === target) seen.push(event.detail);
      });
      return seen;
    };
    const targetsOf = (snapshots: readonly unknown[]) =>
      snapshots.map((snapshot) =>
        typeof snapshot === 'object' && snapshot !== null && 'actions' in snapshot && Array.isArray(snapshot.actions)
          ? snapshot.actions.map((action: { target: unknown }) => action.target)
          : snapshot,
      );

    it('fires dpk-change on the board whose part of the draft changed, in its own targets', async () => {
      const { page, before, after } = await mount();
      const [onBefore, onAfter] = [record(before), record(after)];
      after.api.comment('page:prototype@before', 'compare with this');
      await page.updateComplete;
      expect(targetsOf(onBefore)).toEqual([[{ type: 'page', id: 'prototype' }]]);
      expect(onAfter).toEqual([]);
    });

    it('keeps the board’s event off the page, whose own snapshot stays page-qualified', async () => {
      const { page, before } = await mount();
      const targets: EventTarget[] = [];
      const snapshots: unknown[] = [];
      page.addEventListener('dpk-change', (event) => {
        targets.push(event.target ?? page);
        if (event instanceof CustomEvent) snapshots.push(event.detail);
      });
      before.api.comment('page:prototype', 'too many steps');
      await page.updateComplete;
      expect(targets).toEqual([page]);
      expect(targetsOf(snapshots)).toEqual([[{ type: 'page', id: 'prototype@before' }]]);
    });
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

  describe('questions a board asks', () => {
    const grillOf = (questions: unknown): string =>
      `<script type="application/json" data-dpk-grill>${JSON.stringify(questions)}</script>`;
    const mountAsking = async () => {
      const page = document.createElement('dpk-page');
      if (!(page instanceof PageElement)) throw new Error('not upgraded');
      page.storage = 'memory';
      page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
        ${grillOf({ questions: [{ id: 'release', title: 'Which release?' }] })}
        <dpk-template-plain board="before" label="Before">
          <script type="application/json">{"title":"Before"}</script>
          ${grillOf({
            questions: [
              { id: 'retry', title: 'Retry twice?', options: [{ id: 'key', label: 'Idempotency key' }] },
              { id: 'notify', title: 'Who hears of it?' },
            ],
          })}
          <section slot="main"><p data-grill-questions="Q1 Q2">Payment</p></section>
        </dpk-template-plain>
        <dpk-template-plain board="after" label="After">
          <script type="application/json">{"title":"After"}</script>
          ${grillOf({ questions: [{ id: 'retry', title: 'Retry after the change?' }] })}
          <section slot="main"><p data-grill-questions="Q1">Payment</p></section>
        </dpk-template-plain>`;
      document.body.append(page);
      await page.api.ready;
      await page.updateComplete;
      await page.updateComplete;
      return page;
    };
    const toggle = (page: PageElement) =>
      page.renderRoot.querySelector('.dpk-review-toggle[data-section="questions"] .dpk-review-badge');

    it('asks every board’s questions with the page’s own, qualified by board', async () => {
      const page = await mountAsking();
      expect(page.api.snapshot().grill.questions.map((question) => [question.id, question.ref])).toEqual([
        ['release', 'Q1'],
        ['retry@before', 'Q1@before'],
        ['notify@before', 'Q2@before'],
        ['retry@after', 'Q1@after'],
      ]);
      expect(toggle(page)?.textContent).toBe('0/4');
    });

    it('reads a mark inside a board as that board’s question', async () => {
      const page = await mountAsking();
      const badges = Array.from(page.renderRoot.querySelectorAll('.dpk-grill-badge'), (badge) =>
        badge.textContent?.trim(),
      );
      expect(badges).toEqual(['Q1@before', 'Q2@before', 'Q1@after']);
    });

    it('lays a badge on a card a board renders from its data', async () => {
      const page = document.createElement('dpk-page');
      if (!(page instanceof PageElement)) throw new Error('not upgraded');
      page.storage = 'memory';
      const mapping = {
        stories: [{ id: 'order', name: 'Order' }],
        rules: [{ id: 'stock', storyId: 'order', name: 'Only in stock', questions: 'Q1' }],
      };
      page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
        <dpk-template-example-mapping board="rules" label="Rules">
          <script type="application/json">${JSON.stringify(mapping)}</script>
          ${grillOf({ questions: [{ id: 'reserve', title: 'Hold stock?' }] })}
        </dpk-template-example-mapping>`;
      document.body.append(page);
      await page.api.ready;
      for (let i = 0; i < 4; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await page.updateComplete;
      }
      const badges = Array.from(page.renderRoot.querySelectorAll('.dpk-grill-badge'), (badge) =>
        badge.textContent?.trim(),
      );
      expect(badges).toEqual(['Q1@rules']);
    });

    it('stops asking the questions of a board the draft removes', async () => {
      const page = await mountAsking();
      page.api.dispatch({ type: 'REMOVE_BOARD', target: { type: 'page', id: 'page' }, payload: { board: 'after' } });
      await page.updateComplete;
      await page.updateComplete;
      expect(page.api.snapshot().grill.questions.map((question) => question.id)).toEqual([
        'release',
        'retry@before',
        'notify@before',
      ]);
      expect(toggle(page)?.textContent).toBe('0/3');
    });

    it('records an answer on the page, and keeps it out of the board’s part', async () => {
      const page = await mountAsking();
      expect(
        page.api.dispatch({
          type: 'answer',
          target: { type: 'grill', id: 'retry@before' },
          payload: { kind: 'option', optionId: 'key' },
        }),
      ).toMatchObject({ ok: true });
      await page.updateComplete;
      expect(page.api.snapshot().answers).toEqual({ 'retry@before': { kind: 'option', optionId: 'key' } });
      expect(toggle(page)?.textContent).toBe('1/4');
      const before = page.querySelector('[board="before"]');
      expect(isBoard(before) ? before.api.actions : null).toEqual([]);
      const brief = page.api.exportBrief();
      expect(brief).toContain('`grill:retry@before`');
      expect(page.api.comment('grill:notify@before', 'Ask the seller too')).toMatchObject({ ok: true });
      expect(page.api.stale).toEqual([]);
      expect(page.api.exportBrief()).toContain('grill:notify@before');
      expect(brief).toContain('A question `grill:<id>@<board>` comes from the `data-dpk-grill` block of that board');
    });
  });
});
