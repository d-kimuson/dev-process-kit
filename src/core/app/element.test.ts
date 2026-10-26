// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { queryAllDeep } from '../../lib/dom/deep';
import { AppElement } from './element';
import { SWITCHER_ID } from './switcher';
import '../../index';

const BASE = '<script type="application/json">{"title":"Screens","activities":[]}</script>';

type Board = HTMLElement & {
  readonly api: {
    readonly actions: readonly { type: string; target: unknown }[];
    readonly ready: Promise<void>;
    comment(target: string, body: string): unknown;
    navigate(patch: Readonly<Record<string, string | null | undefined>>): void;
  };
};

const isBoard = (element: Element | null): element is Board => element instanceof HTMLElement && 'api' in element;

const mount = async () => {
  const page = document.createElement('dpk-app');
  if (!(page instanceof AppElement)) throw new Error('not upgraded');
  page.storage = 'memory';
  page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
    <dpk-page name="before" label="Before"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>
    <dpk-page name="after" label="After"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>`;
  document.body.append(page);
  await page.api.ready;
  await page.updateComplete;
  const pageOf = (id: string): HTMLElement => {
    const element = page.querySelector(`dpk-page[name="${id}"]`);
    if (!(element instanceof HTMLElement)) throw new Error(`no page ${id}`);
    return element;
  };
  const board = (id: string): Board => {
    const element = pageOf(id).firstElementChild;
    if (!isBoard(element)) throw new Error(`no content for page ${id}`);
    return element;
  };
  const shadow = (selector: string): HTMLElement => {
    const element = page.renderRoot.querySelector(selector);
    if (!(element instanceof HTMLElement)) throw new Error(`no ${selector}`);
    return element;
  };
  /** Lets the pages the app made upgrade, read their base and render. */
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.updateComplete;
    await Promise.all(
      Array.from(page.querySelectorAll<HTMLElement & { ready: Promise<void> }>('dpk-page')).map((child) => child.ready),
    );
    await page.updateComplete;
  };
  return { page, pageOf, before: board('before'), after: board('after'), board, shadow, settle };
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
    const { page, pageOf } = await mount();
    expect(page.api.navigation).toMatchObject({ page: 'before' });
    expect([pageOf('before').hidden, pageOf('after').hidden]).toEqual([false, true]);
    page.api.navigate({ page: 'after' });
    await page.updateComplete;
    expect([pageOf('before').hidden, pageOf('after').hidden]).toEqual([true, false]);
  });

  it('fires dpk-navigate on the board whose own navigation changed (#17)', async () => {
    const page = document.createElement('dpk-app');
    if (!(page instanceof AppElement)) throw new Error('not upgraded');
    page.storage = 'memory';
    page.innerHTML = `<script type="application/json">{"title":"Doc"}</script>
      <dpk-page name="first" label="First"><dpk-view-plain><script type="application/json">{"title":"First"}</script></dpk-view-plain></dpk-page>
      <dpk-page name="second" label="Second"><dpk-view-plain><script type="application/json">{"title":"Second"}</script></dpk-view-plain></dpk-page>`;
    document.body.append(page);
    await page.api.ready;
    await page.updateComplete;
    const first = page.querySelector('dpk-page[name="first"] > *');
    const second = page.querySelector('dpk-page[name="second"] > *');
    if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) throw new Error('no boards');
    const seen = (element: HTMLElement): unknown[] => {
      const events: unknown[] = [];
      element.addEventListener('dpk-navigate', (event) => events.push((event as CustomEvent).detail));
      return events;
    };
    const firstEvents = seen(first);
    const secondEvents = seen(second);

    page.api.navigate({ 'first.note': 'paid' });
    expect(firstEvents).toEqual([{ navigation: { note: 'paid' } }]);
    expect(secondEvents).toEqual([]);
  });

  it('relays a board-initiated navigation back to the board (#17)', async () => {
    const page = document.createElement('dpk-app');
    if (!(page instanceof AppElement)) throw new Error('not upgraded');
    page.storage = 'memory';
    page.innerHTML = `<script type="application/json">{"title":"Doc"}</script>
      <dpk-page name="only" label="Only"><dpk-view-plain><script type="application/json">{"title":"Only"}</script></dpk-view-plain></dpk-page>`;
    document.body.append(page);
    await page.api.ready;
    await page.updateComplete;
    const board = page.querySelector('dpk-page[name="only"] > *');
    if (!(board instanceof HTMLElement) || !('api' in board)) throw new Error('no board');
    const events: unknown[] = [];
    board.addEventListener('dpk-navigate', (event) => events.push((event as CustomEvent).detail));

    (board as Board).api.navigate({ note: 'paid' });
    expect(events).toEqual([{ navigation: { note: 'paid' } }]);
  });

  it('reports the work on a board that is taken away as stale', async () => {
    const { page, pageOf, after } = await mount();
    after.api.comment('page:prototype', 'gone soon');
    pageOf('after').remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.updateComplete;
    expect(page.api.stale.map((entry) => entry.action.target)).toEqual([{ type: 'page', id: 'prototype@after' }]);
  });

  const trigger = (page: AppElement): HTMLElement => {
    const element = page.renderRoot.querySelector('.dpk-page-switcher-trigger');
    if (!(element instanceof HTMLElement)) throw new Error('no switcher trigger');
    return element;
  };
  const rowLabels = (page: AppElement): string[] =>
    Array.from(page.renderRoot.querySelectorAll('.dpk-page-switcher-option'), (row) => row.textContent?.trim() ?? '');
  const popover = (page: AppElement): Element | null => page.renderRoot.querySelector(`#${SWITCHER_ID}`);
  const removeButton = (page: AppElement, label: string): HTMLElement => {
    const element = Array.from(page.renderRoot.querySelectorAll<HTMLElement>('.dpk-page-switcher-remove')).find(
      (candidate) => candidate.getAttribute('aria-label') === label,
    );
    if (!element) throw new Error(`no remove button for ${label}`);
    return element;
  };
  /** The crumb's own text lives in `<dpk-inline-edit>`'s shadow root, not as a light-DOM text node. */
  const crumbLabel = (page: AppElement): string => {
    const edit = page.renderRoot.querySelector('.dpk-page-crumb dpk-inline-edit');
    const field = edit?.shadowRoot?.querySelector<HTMLTextAreaElement>('.field');
    return field?.value.trim() ?? '';
  };

  it('adds a board from the switcher as a change of the draft', async () => {
    const { page, pageOf, board, settle } = await mount();
    trigger(page).click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="content:view:usm"]')?.click();
    await settle();
    expect(page.api.actions.map((action) => [action.type, action.target])).toEqual([
      ['ADD_PAGE', { type: 'app', id: 'app' }],
    ]);
    expect(page.api.navigation).toMatchObject({ page: 'usm' });
    const added = board('usm');
    expect(added.localName).toBe('dpk-view-usm');
    expect(pageOf('usm').hidden).toBe(false);
    // Never the template's own name: a board not yet explicitly renamed falls back to an ordinal.
    expect(crumbLabel(page)).toBe('Page 3');
  });

  it('offers Whiteboard, Example Mapping and Kanban, and adds the picked board as a page', async () => {
    const { page, board, settle } = await mount();
    trigger(page).click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
    await page.updateComplete;
    for (const name of ['whiteboard', 'example-mapping', 'kanban']) {
      expect(page.renderRoot.querySelector(`[data-key="content:board:${name}"]`)).not.toBeNull();
    }
    page.renderRoot.querySelector<HTMLElement>('[data-key="content:board:whiteboard"]')?.click();
    await settle();
    expect(page.api.actions.map((action) => [action.type, action.target])).toEqual([
      ['ADD_PAGE', { type: 'app', id: 'app' }],
    ]);
    expect(board('whiteboard').localName).toBe('dpk-board-whiteboard');
    expect(page.api.navigation).toMatchObject({ page: 'whiteboard' });
  });

  it('keeps the add view open when the clicked "+" row loses focus as it is replaced (#86)', async () => {
    const { page } = await mount();
    trigger(page).click();
    await page.updateComplete;
    // A real click focuses the row it lands on; with two boards already shown, the board list
    // (2 rows + "+") is longer than the add view it switches to (2 addable templates), so the
    // "+" row's DOM position is one the add view drops instead of reusing for another row. A
    // browser fires `focusout` with no `relatedTarget` right there, mid-render, as that row is
    // removed; jsdom does not reproduce that removal-driven blur, so the test sends the same
    // signal the menu would otherwise receive, at the same point in the sequence (the click
    // already queued the view switch; its render has not resolved yet).
    const addRow = page.renderRoot.querySelector<HTMLElement>('[data-key="add"]');
    addRow?.focus();
    addRow?.click();
    const menu = page.renderRoot.querySelector(`#${SWITCHER_ID}`);
    menu?.dispatchEvent(new FocusEvent('focusout', { relatedTarget: null, bubbles: true }));
    await page.updateComplete;
    expect(page.renderRoot.querySelector('[data-key="content:view:usm"]')).not.toBeNull();
    // Losing focus this way must not read as a press outside the menu: past the close delay,
    // the add view must still be open, not dismissed.
    await new Promise((resolve) => setTimeout(resolve, 250));
    await page.updateComplete;
    expect(popover(page)).not.toBeNull();
    expect(page.renderRoot.querySelector('[data-key="content:view:usm"]')).not.toBeNull();
  });

  it('does not close the add view when the pointer leaves it while focus stays inside (#86)', async () => {
    const { page } = await mount();
    trigger(page).click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
    // `#focusFirstSwitcherRowAfterUpdate` moves focus onto the add view's first row once it
    // renders (the fix above, for the same #86). On a real click, the cursor stays exactly
    // where the "+" row used to be; since the add view has fewer rows, the popover shrinks to
    // fit underneath that stationary cursor, so the browser fires `pointerleave` on the menu
    // even though the user never moved their mouse. Flushing a macrotask here lets both the
    // pending render and the focus-after-update microtask settle before this is simulated.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.updateComplete;
    const focused = page.renderRoot.querySelector('[data-key="content:view:usm"]');
    expect((page.renderRoot as ShadowRoot).activeElement).toBe(focused);
    const menu = page.renderRoot.querySelector(`#${SWITCHER_ID}`);
    menu?.dispatchEvent(new Event('pointerleave'));
    // A stray `pointerleave` while the keyboard focus it just received is still inside must not
    // read as the pointer truly leaving the menu: past the close delay, the add view must still
    // be open and clickable, not dismissed.
    await new Promise((resolve) => setTimeout(resolve, 250));
    await page.updateComplete;
    expect(popover(page)).not.toBeNull();
    expect(page.renderRoot.querySelector('[data-key="content:view:usm"]')).not.toBeNull();
  });

  it('takes an added board back with everything the draft says about it', async () => {
    const { page, board, settle } = await mount();
    trigger(page).click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="content:view:usm"]')?.click();
    await settle();
    board('usm').api.comment('page:usm', 'scope first');
    await page.updateComplete;
    trigger(page).click();
    await page.updateComplete;
    removeButton(page, 'Remove page "Page 3"').click();
    await settle();
    expect(page.api.actions).toEqual([]);
    expect(page.querySelector('dpk-page[name="usm"]')).toBeNull();
    expect(page.api.navigation).toMatchObject({ page: 'before' });
  });

  it('removes a board of the page as a change of the draft', async () => {
    const { page, pageOf, settle } = await mount();
    trigger(page).click();
    await page.updateComplete;
    removeButton(page, 'Remove page "After"').click();
    await settle();
    expect(page.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['REMOVE_PAGE', { page: 'after' }],
    ]);
    expect(pageOf('after').hidden).toBe(true);
    // The addable templates still offer a "+", even down to one board.
    expect(rowLabels(page)).toEqual(['Before', 'Add a page']);
  });

  it('names the board it shows in the shared header, the switcher trigger ahead of the crumb', async () => {
    const { page, shadow } = await mount();
    expect(crumbLabel(page)).toBe('Before');
    // No layout shift between boards or name lengths: the trigger always comes first.
    const heading = shadow('.dpk-page-heading');
    const headingTrigger = heading.querySelector('.dpk-page-switcher-trigger');
    const crumb = heading.querySelector('.dpk-page-crumb');
    expect(headingTrigger?.compareDocumentPosition(crumb as Node) ?? 0).toSatisfy(
      (mask: number) => (mask & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    );
    page.api.navigate({ page: 'after' });
    await page.updateComplete;
    expect(crumbLabel(page)).toBe('After');
  });

  it('reads as the template alone with one board: the switcher still shows, but no crumb', async () => {
    const page = document.createElement('dpk-app');
    if (!(page instanceof AppElement)) throw new Error('not upgraded');
    page.storage = 'memory';
    page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
      <dpk-page name="only" label="Only"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>`;
    document.body.append(page);
    await page.api.ready;
    await page.updateComplete;
    expect(page.renderRoot.querySelector('.dpk-page-switcher-trigger')).not.toBeNull();
    expect(page.renderRoot.querySelector('.dpk-page-crumb')).toBeNull();
    trigger(page).click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="content:view:usm"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.updateComplete;
    expect(page.api.navigation).toMatchObject({ page: 'usm' });
  });

  it('carries a direct child with slot="header" (not a board) into the page\'s own fixed header', async () => {
    const page = document.createElement('dpk-app');
    if (!(page instanceof AppElement)) throw new Error('not upgraded');
    page.storage = 'memory';
    page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
      <a slot="header" id="repo-link" href="https://example.com">repo</a>
      <dpk-page name="only" label="Only"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>`;
    document.body.append(page);
    await page.api.ready;
    await page.updateComplete;
    const link = page.querySelector('#repo-link');
    expect(link).not.toBeNull();
    const slot = page.renderRoot.querySelector<HTMLSlotElement>('.dpk-header-slot slot[name="header"]');
    expect(slot).not.toBeNull();
    expect(slot?.assignedElements()).toEqual([link]);
    // Not read as a board: the page's only board is still the template, and the
    // link is never offered in the switcher or counted in its layout.
    expect(page.api.state.layout.map((entry) => entry.id)).toEqual(['only']);
  });

  describe("header switcher (the page's default board nav)", () => {
    const mountHeaderNav = async (markup: string, pageNav?: string): Promise<AppElement> => {
      const page = document.createElement('dpk-app');
      if (!(page instanceof AppElement)) throw new Error('not upgraded');
      page.storage = 'memory';
      if (pageNav !== undefined) page.pageNav = pageNav;
      page.innerHTML = markup;
      document.body.append(page);
      await page.api.ready;
      await page.updateComplete;
      return page;
    };

    it("opens a popover of the page's boards on hover, with no page-nav attribute needed", async () => {
      const page = await mountHeaderNav(
        `<script type="application/json">{"title":"Checkout"}</script>
        <dpk-page name="only"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>`,
      );
      // One board only: no name stands beside the trigger.
      expect(page.renderRoot.querySelector('.dpk-page-crumb')).toBeNull();
      expect(popover(page)).toBeNull();
      trigger(page).dispatchEvent(new Event('pointerenter'));
      await page.updateComplete;
      expect(popover(page)).not.toBeNull();
      // The only board falls back to the page's title, never the template's own name, then "+" last.
      expect(rowLabels(page)).toEqual(['Checkout', 'Add a page']);
      // One board is nothing to switch between, so no count shows next to the icon
      // (the accessible name still carries it, for anyone who needs the detail).
      expect(trigger(page).querySelector('.dpk-page-switcher-count')).toBeNull();
      expect(trigger(page).getAttribute('aria-label')).toBe('Switch page (1 available)');
      trigger(page).dispatchEvent(new Event('pointerleave'));
      await new Promise((resolve) => setTimeout(resolve, 250));
      await page.updateComplete;
      expect(popover(page)).toBeNull();
    });

    it('also opens on click and keyboard focus; its "+" row adds a board and the active one\'s name then shows', async () => {
      const page = await mountHeaderNav(
        `<script type="application/json">{"title":"Checkout"}</script>
        <dpk-page name="only"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>`,
      );
      trigger(page).click();
      await page.updateComplete;
      expect(popover(page)).not.toBeNull();
      // Past "+" the popover offers the addable templates, never one of the user's exclusions.
      page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
      await page.updateComplete;
      expect(page.renderRoot.querySelector('[data-key="content:view:task-board"]')).toBeNull();
      page.renderRoot.querySelector<HTMLElement>('[data-key="content:view:usm"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await page.updateComplete;
      expect(page.api.navigation).toMatchObject({ page: 'usm' });
      expect(popover(page)).toBeNull();

      trigger(page).dispatchEvent(new Event('focus'));
      await page.updateComplete;
      expect(popover(page)).not.toBeNull();
      // Two boards now: the active one's name shows beside the trigger, and the list offers both.
      expect(crumbLabel(page)).toContain('Page 2');
      expect(rowLabels(page)).toEqual(['Checkout', 'Page 2', 'Add a page']);
      // Two boards now: a quiet inline count shows, never the notification-style corner badge.
      expect(trigger(page).querySelector('.dpk-icon-badge')).toBeNull();
      expect(trigger(page).querySelector('.dpk-page-switcher-count')?.textContent?.trim()).toBe('2');
    });

    it('still works the same with page-nav="header" set explicitly (a harmless, now-redundant value)', async () => {
      const page = await mountHeaderNav(
        `<script type="application/json">{"title":"Checkout"}</script>
        <dpk-page name="only"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>`,
        'header',
      );
      trigger(page).click();
      await page.updateComplete;
      expect(popover(page)).not.toBeNull();
    });
  });

  describe('rename the board in place from the header crumb', () => {
    const crumbEdit = (page: AppElement): Element => {
      const element = page.renderRoot.querySelector('.dpk-page-crumb dpk-inline-edit');
      if (!element) throw new Error('no crumb inline edit');
      return element;
    };
    const startEditing = (page: AppElement): void => {
      const edit = crumbEdit(page);
      const resting = edit.shadowRoot?.querySelector<HTMLElement>('.field');
      if (!resting) throw new Error('no crumb field');
      resting.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true }));
      resting.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    };
    const field = (page: AppElement): HTMLTextAreaElement => {
      const edit = crumbEdit(page);
      const input = edit.shadowRoot?.querySelector<HTMLTextAreaElement>('.field');
      if (!input) throw new Error('no crumb field');
      return input;
    };

    it('keeps a board added just before: renaming it must not drop its ADD_PAGE', async () => {
      const { page, pageOf, settle } = await mount();
      trigger(page).click();
      await page.updateComplete;
      page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
      await page.updateComplete;
      page.renderRoot.querySelector<HTMLElement>('[data-key="content:view:usm"]')?.click();
      await settle();
      startEditing(page);
      await page.updateComplete;
      const input = field(page);
      input.value = 'Roadmap';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await settle();
      expect(page.api.actions.map((action) => action.type)).toEqual(['ADD_PAGE', 'RENAME_PAGE']);
      expect(pageOf('usm').hidden).toBe(false);
    });

    it('commits a rename on Enter, recorded in the draft and undoable', async () => {
      const { page } = await mount();
      startEditing(page);
      await page.updateComplete;
      const input = field(page);
      input.value = 'Checkout flow';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await page.updateComplete;
      expect(crumbLabel(page)).toBe('Checkout flow');
      expect(page.api.actions.map((action) => [action.type, action.payload])).toEqual([
        ['RENAME_PAGE', { page: 'before', label: 'Checkout flow' }],
      ]);
      expect(page.controller.undo()).toBe(true);
      await page.updateComplete;
      expect(crumbLabel(page)).toBe('Before');
    });

    it('commits a rename on blur', async () => {
      const { page } = await mount();
      startEditing(page);
      await page.updateComplete;
      const input = field(page);
      input.value = 'Renamed on blur';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new FocusEvent('blur'));
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
      await page.updateComplete;
      expect(crumbLabel(page)).toBe('Renamed on blur');
      expect(page.api.actions.map((action) => action.type)).toEqual(['RENAME_PAGE']);
    });

    it('cancels on Escape, leaving the draft untouched', async () => {
      const { page } = await mount();
      startEditing(page);
      await page.updateComplete;
      const input = field(page);
      input.value = 'Should not stick';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await page.updateComplete;
      expect(crumbLabel(page)).toBe('Before');
      expect(page.api.actions).toEqual([]);
    });
  });

  describe('page-nav="none"', () => {
    it('draws no switcher or "+", keeping the page\'s own header', async () => {
      const page = document.createElement('dpk-app');
      if (!(page instanceof AppElement)) throw new Error('not upgraded');
      page.storage = 'memory';
      page.pageNav = 'none';
      page.innerHTML = `<script type="application/json">{"title":"Catalog"}</script>
        <dpk-page name="catalog"><dpk-view-plain><script type="application/json">{"title":"Catalog"}</script></dpk-view-plain></dpk-page>`;
      document.body.append(page);
      await page.api.ready;
      await page.updateComplete;
      expect(page.renderRoot.querySelector('.dpk-page-switcher-trigger')).toBeNull();
      expect(page.renderRoot.querySelector('.dpk-page-add')).toBeNull();
      // The page's own shared header still shows (title, version badge, notice bell, …).
      expect(page.renderRoot.querySelector('.dpk-header')).not.toBeNull();
      expect(page.renderRoot.querySelector('.dpk-title h1')?.textContent).toBe('Catalog');
    });
  });

  describe('hash="off"', () => {
    it('leaves location.hash untouched; boards still switch in memory', async () => {
      window.location.hash = '#foo=bar';
      const page = document.createElement('dpk-app');
      if (!(page instanceof AppElement)) throw new Error('not upgraded');
      page.storage = 'memory';
      page.hash = 'off';
      page.innerHTML = `<dpk-page name="before" label="Before"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>
        <dpk-page name="after" label="After"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>`;
      document.body.append(page);
      await page.api.ready;
      await page.updateComplete;
      expect(window.location.hash).toBe('#foo=bar');
      expect(page.api.navigation).toMatchObject({ page: 'before' });
      page.api.navigate({ page: 'after' });
      await page.updateComplete;
      expect(page.api.navigation).toMatchObject({ page: 'after' });
      expect(window.location.hash).toBe('#foo=bar');
    });
  });

  describe('questions a board asks', () => {
    const grillOf = (questions: unknown): string =>
      `<script type="application/json" data-dpk-grill>${JSON.stringify(questions)}</script>`;
    const mountAsking = async () => {
      const page = document.createElement('dpk-app');
      if (!(page instanceof AppElement)) throw new Error('not upgraded');
      page.storage = 'memory';
      page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
        ${grillOf({ questions: [{ id: 'release', title: 'Which release?' }] })}
        <dpk-page name="before" label="Before"><dpk-view-plain>
          <script type="application/json">{"title":"Before"}</script>
          ${grillOf({
            questions: [
              { id: 'retry', title: 'Retry twice?', options: [{ id: 'key', label: 'Idempotency key' }] },
              { id: 'notify', title: 'Who hears of it?' },
            ],
          })}
          <section slot="main"><p data-grill-questions="Q1 Q2">Payment</p></section>
        </dpk-view-plain></dpk-page>
        <dpk-page name="after" label="After"><dpk-view-plain>
          <script type="application/json">{"title":"After"}</script>
          ${grillOf({ questions: [{ id: 'retry', title: 'Retry after the change?' }] })}
          <section slot="main"><p data-grill-questions="Q1">Payment</p></section>
        </dpk-view-plain></dpk-page>`;
      document.body.append(page);
      await page.api.ready;
      await page.updateComplete;
      await page.updateComplete;
      return page;
    };
    const toggle = (page: AppElement) =>
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
      const badges = queryAllDeep(page, '.dpk-grill-badge').map((badge) => badge.textContent?.trim());
      expect(badges).toEqual(['Q1@before', 'Q2@before', 'Q1@after']);
    });

    it('lays a badge on a card a board renders from its data', async () => {
      const page = document.createElement('dpk-app');
      if (!(page instanceof AppElement)) throw new Error('not upgraded');
      page.storage = 'memory';
      const board = {
        columns: [{ id: 'todo', label: 'Todo', cards: [{ id: 'stock', title: 'Only in stock', questions: 'Q1' }] }],
      };
      page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
        <dpk-page name="rules" label="Rules"><dpk-board-kanban>
          <script type="application/json">${JSON.stringify(board)}</script>
          ${grillOf({ questions: [{ id: 'reserve', title: 'Hold stock?' }] })}
        </dpk-board-kanban></dpk-page>`;
      document.body.append(page);
      await page.api.ready;
      for (let i = 0; i < 4; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await page.updateComplete;
      }
      const badges = queryAllDeep(page, '.dpk-grill-badge').map((badge) => badge.textContent?.trim());
      expect(badges).toEqual(['Q1@rules']);
    });

    it('stops asking the questions of a board the draft removes', async () => {
      const page = await mountAsking();
      page.api.dispatch({ type: 'REMOVE_PAGE', target: { type: 'app', id: 'app' }, payload: { page: 'after' } });
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
      const before = page.querySelector('dpk-page[name="before"] > *');
      expect(isBoard(before) ? before.api.actions : null).toEqual([]);
      const brief = page.api.exportBrief();
      expect(brief).toContain('`grill:retry@before`');
      expect(page.api.comment('grill:notify@before', 'Ask the seller too')).toMatchObject({ ok: true });
      expect(page.api.stale).toEqual([]);
      expect(page.api.exportBrief()).toContain('grill:notify@before');
      expect(brief).toContain('A question `grill:<id>@<page>` comes from the `data-dpk-grill` block of that page');
    });
  });

  describe('a comment on a target a board’s own component registers (#99)', () => {
    it('stops reading it as target-missing once that component’s commentTargets catch up', async () => {
      const page = document.createElement('dpk-app');
      if (!(page instanceof AppElement)) throw new Error('not upgraded');
      page.storage = 'memory';
      page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
        <dpk-page name="catalog"><dpk-view-plain>
          <script type="application/json">{"title":"Catalog"}</script>
          <dpk-commentable slot="main">
            <p data-dpk-item="risk:timeout">Timeout risk</p>
          </dpk-commentable>
        </dpk-view-plain></dpk-page>`;
      document.body.append(page);
      await page.api.ready;
      await page.updateComplete;
      const commentable = page.querySelector('dpk-commentable');
      if (commentable === null) throw new Error('no commentable');
      // `<dpk-commentable>` reports no targets until it has an `id` (its own gate), so a comment
      // on the ref it will eventually own reads as target-missing right after mount.
      expect(page.api.comment('element:risks/risk/timeout@catalog', 'check this')).toMatchObject({ ok: true });
      await page.updateComplete;
      expect(page.api.stale.map((entry) => entry.action.target)).toEqual([
        { type: 'element', id: 'risks/risk/timeout@catalog' },
      ]);
      // The component registers its target late, well after the page (and its board) first settled.
      commentable.id = 'risks';
      await (commentable as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      await page.updateComplete;
      expect(page.api.stale).toEqual([]);
    });
  });
});
