// @vitest-environment jsdom
import { html } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';

import type { PageElement } from '../page/element';

import { queryAllDeep } from '../../lib/dom/deep';
import { DpkViewPlain } from '../../views/plain';
import { contextMenuStyles } from '../context-menu/styles';
import { coreMessages } from '../messages';
import { floatingMenuStyles } from '../shell/floating-menu-view';
import { settingsDialogStyles } from '../shell/settings-dialog';
import { chromeStyles } from '../shell/styles';
import { AppElement, type PageContent } from './element';
import { SWITCHER_ID } from './switcher';
import '../../index';

const BASE = '<script type="application/json">{"title":"Screens","activities":[]}</script>';

/** An app offering one board whose entry nothing has loaded, to check the menu still offers it. */
class AddsUnloadedBoard extends AppElement {
  protected override pageContents(): readonly PageContent[] {
    return [{ kind: 'board', name: 'unloaded-board', label: 'Unloaded board', icon: () => html`<span></span>` }];
  }
}

if (!customElements.get('dpk-app-unloaded-board')) {
  customElements.define('dpk-app-unloaded-board', AddsUnloadedBoard);
}

/** Mounts an app from markup, without building it through a string of `innerHTML`. */
const mountMarkup = async (markup: string): Promise<AppElement> => {
  const page = document.createElement('dpk-app');
  if (!(page instanceof AppElement)) throw new Error('not upgraded');
  page.storage = 'memory';
  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  page.append(...Array.from(parsed.body.childNodes, (node) => node.cloneNode(true)));
  document.body.append(page);
  await page.api.ready;
  await page.updateComplete;
  return page;
};

type Board = HTMLElement & {
  readonly api: {
    readonly actions: readonly { type: string; target: unknown }[];
    readonly ready: Promise<void>;
    readonly state: unknown;
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

/**
 * Two plain pages with nothing of their own to navigate, so a patch is the
 * only change either page's navigation sees.
 */
const mountTwoPages = async () => {
  const page = document.createElement('dpk-app');
  if (!(page instanceof AppElement)) throw new Error('not upgraded');
  page.storage = 'memory';
  page.innerHTML = `<script type="application/json">{"title":"Doc"}</script>
    <dpk-page name="first" label="First"><dpk-view-plain><script type="application/json">{"title":"First"}</script></dpk-view-plain></dpk-page>
    <dpk-page name="second" label="Second"><dpk-view-plain><script type="application/json">{"title":"Second"}</script></dpk-view-plain></dpk-page>`;
  document.body.append(page);
  await page.api.ready;
  await page.updateComplete;
  const contentOf = (id: string): HTMLElement => {
    const element = page.querySelector(`dpk-page[name="${id}"] > *`);
    if (!(element instanceof HTMLElement)) throw new Error(`no content for page ${id}`);
    return element;
  };
  const seen = (element: HTMLElement): unknown[] => {
    const events: unknown[] = [];
    element.addEventListener('dpk-navigate', (event) => events.push((event as CustomEvent).detail));
    return events;
  };
  return { page, first: contentOf('first'), second: contentOf('second'), seen };
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
    const { page, first, second, seen } = await mountTwoPages();
    const firstEvents = seen(first);
    const secondEvents = seen(second);

    page.api.navigate({ 'first.note': 'paid' });
    expect(firstEvents).toEqual([{ navigation: { note: 'paid' } }]);
    expect(secondEvents).toEqual([]);
  });

  it('relays a board-initiated navigation back to the board (#17)', async () => {
    const { first, seen } = await mountTwoPages();
    const events = seen(first);

    (first as Board).api.navigate({ note: 'paid' });
    expect(events).toEqual([{ navigation: { note: 'paid' } }]);
  });

  it('relays a patch that moves this page while another one is shown (#17)', async () => {
    const { page, first, second, seen } = await mountTwoPages();
    const firstEvents = seen(first);
    const secondEvents = seen(second);

    page.api.navigate({ page: 'second', 'first.note': 'paid' });
    expect(firstEvents).toEqual([{ navigation: { note: 'paid' } }]);
    expect(secondEvents).toEqual([]);
  });

  it('relays a hash change to the page content it moves (#17)', async () => {
    const { first, second, seen } = await mountTwoPages();
    const firstEvents = seen(first);
    const secondEvents = seen(second);

    window.history.replaceState(null, '', '#page=first&first.note=refund');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(firstEvents).toEqual([{ navigation: { note: 'refund' } }]);
    expect(secondEvents).toEqual([]);
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
  /** One row's name: the page shown now carries it in the inline edit it is renamed through. */
  const rowLabel = (row: Element): string => {
    const edit = row.querySelector('dpk-inline-edit');
    if (edit) return edit.shadowRoot?.querySelector<HTMLTextAreaElement>('.field')?.value.trim() ?? '';
    return row.textContent?.trim() ?? '';
  };
  const rowLabels = (page: AppElement): string[] =>
    Array.from(page.renderRoot.querySelectorAll('.dpk-page-switcher-option'), (row) => rowLabel(row));
  /** The row of the page shown now, which is the one named and renamed in the list. */
  const currentRow = (page: AppElement): Element => {
    const element = page.renderRoot.querySelector('.dpk-page-switcher-option[data-current]');
    if (!element) throw new Error('no current page row');
    return element;
  };
  const popover = (page: AppElement): Element | null => page.renderRoot.querySelector(`#${SWITCHER_ID}`);
  const removeButton = (page: AppElement, label: string): HTMLElement => {
    const element = Array.from(page.renderRoot.querySelectorAll<HTMLElement>('.dpk-page-switcher-remove')).find(
      (candidate) => candidate.getAttribute('aria-label') === label,
    );
    if (!element) throw new Error(`no remove button for ${label}`);
    return element;
  };
  /**
   * The page shown now, as the switcher's trigger names it: no second label
   * stands beside the icon, so the trigger's own label carries it (and the
   * list marks it, with the name it is renamed through).
   */
  const shownPage = (page: AppElement): string => {
    const label = trigger(page).getAttribute('aria-label') ?? '';
    return label.split(' · ')[0] ?? '';
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
    expect(shownPage(page)).toBe('Page 3');
  });

  it('offers the boards that stand on their own, and adds the picked board as a page', async () => {
    const { page, board, settle } = await mount();
    trigger(page).click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
    await page.updateComplete;
    for (const name of ['whiteboard', 'example-mapping', 'event-storming', 'kanban']) {
      expect(page.renderRoot.querySelector(`[data-key="content:board:${name}"]`)).not.toBeNull();
    }
    // A diagram that needs authored nodes is not an empty page anyone can start from.
    expect(page.renderRoot.querySelector('[data-key="content:board:er-diagram"]')).toBeNull();
    page.renderRoot.querySelector<HTMLElement>('[data-key="content:board:whiteboard"]')?.click();
    await settle();
    expect(page.api.actions.map((action) => [action.type, action.target])).toEqual([
      ['ADD_PAGE', { type: 'app', id: 'app' }],
    ]);
    expect(board('whiteboard').localName).toBe('dpk-board-whiteboard');
    expect(page.api.navigation).toMatchObject({ page: 'whiteboard' });
  });

  it('adds each hand-authorable board as a page of the app', async () => {
    const { page, board, settle } = await mount();
    for (const name of ['whiteboard', 'example-mapping', 'event-storming', 'kanban']) {
      trigger(page).click();
      await page.updateComplete;
      page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
      await page.updateComplete;
      page.renderRoot.querySelector<HTMLElement>(`[data-key="content:board:${name}"]`)?.click();
      await settle();
      expect(board(name).localName).toBe(`dpk-board-${name}`);
    }
    expect(page.api.state.layout.map((entry) => entry.id)).toEqual([
      'before',
      'after',
      'whiteboard',
      'example-mapping',
      'event-storming',
      'kanban',
    ]);
  });

  it('offers a board whose entry is not loaded, so the pick can load it', async () => {
    const page = document.createElement('dpk-app-unloaded-board');
    if (!(page instanceof AppElement)) throw new Error('not upgraded');
    page.storage = 'memory';
    const script = document.createElement('script');
    script.type = 'application/json';
    script.textContent = '{"title":"Doc"}';
    page.append(script);
    document.body.append(page);
    await page.api.ready;
    await page.updateComplete;
    trigger(page).click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
    await page.updateComplete;
    // Its element is undefined, but its entry is a sibling of the running one,
    // so the menu offers it and picking it loads `boards.js`.
    expect(page.renderRoot.querySelector('[data-key="content:board:unloaded-board"]')).not.toBeNull();
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

  it('starts a page the draft added from its empty base, without a base data error', async () => {
    const { page, board, settle } = await mount();
    trigger(page).click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="content:view:usm"]')?.click();
    await settle();
    // The draft page owns the mark; its content has no base JSON yet and must
    // not report the absence it was designed to start without.
    const usm = board('usm');
    expect(usm.shadowRoot?.querySelector('.dpk-banner')).toBeNull();
    expect(usm.api.state).toMatchObject({ activities: [] });
  });

  it('starts even when a page holds no view or board, and says why there', async () => {
    const page = await mountMarkup(`<script type="application/json">{"title":"Doc"}</script>
      <dpk-page name="empty" label="Empty"></dpk-page>
      <dpk-page name="ok" label="OK"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>`);
    const empty = page.querySelector<PageElement>('dpk-page[name="empty"]');
    if (empty === null) throw new Error('no page');
    expect(page.api.state.layout.map((entry) => entry.id)).toEqual(['empty', 'ok']);
    expect(empty.shadowRoot?.querySelector('.dpk-page-notice')?.textContent).toContain(coreMessages('en').pageEmpty);
  });

  it('starts even when a page names a tag nothing defines, and recovers when it arrives', async () => {
    const tag = 'dpk-view-late-plain';
    const page = await mountMarkup(`<script type="application/json">{"title":"Doc"}</script>
      <dpk-page name="late" label="Late"><dpk-view-late-plain><script type="application/json">{"title":"Late","sections":[]}</script></dpk-view-late-plain></dpk-page>
      <dpk-page name="ok" label="OK"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>`);
    const late = page.querySelector<PageElement>('dpk-page[name="late"]');
    if (late === null) throw new Error('no page');
    expect(late.shadowRoot?.querySelector('.dpk-page-notice')?.textContent).toContain(
      coreMessages('en').pageUnavailableHint(tag),
    );
    // The page takes its place, but its content has no base until its entry loads.
    expect(page.api.state.layout.map((entry) => entry.id)).toEqual(['late', 'ok']);
    expect(page.api.state.pages['late']).toEqual({});
    customElements.define(tag, class extends DpkViewPlain {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.updateComplete;
    expect(late.contentState).toEqual({ status: 'ready' });
    expect(late.shadowRoot?.querySelector('.dpk-page-notice')).toBeNull();
    // The app read the base of a page that could not be read when it started.
    expect(page.api.state.pages['late']).toEqual({ title: 'Late', sections: [] });
  });

  it('opens the settings with the language and theme when a page has no settings of its own', async () => {
    const page = await mountMarkup(`<script type="application/json">{"title":"Doc"}</script>
      <dpk-page name="board" label="Board"><dpk-board-example-mapping></dpk-board-example-mapping></dpk-page>`);
    page.openSettings();
    await page.updateComplete;
    // One section: no nav, and not the empty panel a page without switches used to open.
    expect(page.renderRoot.querySelector('.dpk-dialog-nav')).toBeNull();
    expect(page.renderRoot.querySelectorAll('.dpk-settings-row')).toHaveLength(2);
    expect(page.renderRoot.querySelector('.dpk-settings-row .dpk-lang-select')).not.toBeNull();
    const dark = page.renderRoot.querySelector('[data-theme-choice="dark"]');
    if (!(dark instanceof HTMLElement)) throw new Error('no dark choice');
    dark.click();
    await page.updateComplete;
    expect(page.dataset['theme']).toBe('dark');
    expect(dark.getAttribute('aria-checked')).toBe('true');
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

  it("names the page it shows in the header's switcher, and marks it in the list", async () => {
    const { page } = await mount();
    expect(shownPage(page)).toBe('Before');
    // The switcher lives in the header; the header's title names the document, not the page.
    expect(page.renderRoot.querySelector('.dpk-header .dpk-page-switcher-trigger')).not.toBeNull();
    trigger(page).click();
    await page.updateComplete;
    expect(rowLabel(currentRow(page))).toBe('Before');
    page.api.navigate({ page: 'after' });
    await page.updateComplete;
    expect(shownPage(page)).toBe('After');
    expect(rowLabel(currentRow(page))).toBe('After');
  });

  it('reads as the template alone with one board: the switcher still shows, with no count', async () => {
    const page = document.createElement('dpk-app');
    if (!(page instanceof AppElement)) throw new Error('not upgraded');
    page.storage = 'memory';
    page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
      <dpk-page name="only" label="Only"><dpk-view-prototype>${BASE}</dpk-view-prototype></dpk-page>`;
    document.body.append(page);
    await page.api.ready;
    await page.updateComplete;
    expect(page.renderRoot.querySelector('.dpk-page-switcher-trigger')).not.toBeNull();
    // One page is nothing to count, and nothing to pick between.
    expect(page.renderRoot.querySelector('.dpk-page-switcher-count')).toBeNull();
    trigger(page).click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
    await page.updateComplete;
    page.renderRoot.querySelector<HTMLElement>('[data-key="content:view:usm"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.updateComplete;
    expect(page.api.navigation).toMatchObject({ page: 'usm' });
  });

  it("draws the screen's one header and one floating menu, its page content keeping only its own bar", async () => {
    const page = document.createElement('dpk-app');
    if (!(page instanceof AppElement)) throw new Error('not upgraded');
    page.storage = 'memory';
    page.innerHTML = `<script type="application/json">{"title":"Checkout"}</script>
      <dpk-page name="only" label="Only"><dpk-view-plain>
        <script type="application/json">{"title":"Only"}</script>
        <p slot="header" id="own-controls">own</p>
      </dpk-view-plain></dpk-page>`;
    document.body.append(page);
    await page.api.ready;
    await page.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.updateComplete;
    // One of each, drawn by the app: the page content inside it draws neither.
    expect(page.renderRoot.querySelectorAll('.dpk-header')).toHaveLength(1);
    expect(page.renderRoot.querySelectorAll('.dpk-floating-menu')).toHaveLength(1);
    expect(page.renderRoot.querySelector('.dpk-header .dpk-page-switcher-trigger')).not.toBeNull();
    // The header names the document.
    expect(page.renderRoot.querySelector('.dpk-header h1')?.textContent).toBe('Checkout');

    const content = page.querySelector('dpk-page[name="only"] dpk-view-plain');
    const shadow = (content as HTMLElement).shadowRoot;
    expect(shadow?.querySelector('.dpk-header')).toBeNull();
    expect(shadow?.querySelector('.dpk-floating-menu')).toBeNull();
    // Its own bar holds the template's controls, and no title of its own.
    const bar = shadow?.querySelector('.dpk-board-bar');
    expect(bar?.hasAttribute('hidden')).toBe(false);
    expect(bar?.querySelector('h1')).toBeNull();
    expect(bar?.querySelector<HTMLSlotElement>('slot[name="header"]')?.assignedElements()).toEqual([
      content?.querySelector('#own-controls'),
    ]);
  });

  it('carries a direct child with slot="header" (not a page) into the header', async () => {
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
      // One board only: nothing shows beside the trigger.
      expect(page.renderRoot.querySelector('.dpk-page-switcher-count')).toBeNull();
      expect(popover(page)).toBeNull();
      trigger(page).dispatchEvent(new Event('pointerenter'));
      await page.updateComplete;
      expect(popover(page)).not.toBeNull();
      // The only board falls back to the page's title, never the template's own name, then "+" last.
      expect(rowLabels(page)).toEqual(['Checkout', 'Add a page']);
      // One board is nothing to switch between, so no count shows next to the icon
      // (the accessible name still carries it, for anyone who needs the detail).
      expect(trigger(page).querySelector('.dpk-page-switcher-count')).toBeNull();
      // The label names the page shown, so no second label stands beside the icon.
      expect(trigger(page).getAttribute('aria-label')).toBe('Checkout · Switch page (1 available)');
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
      // Two boards now: the trigger's label names the one shown, and the list offers both.
      expect(shownPage(page)).toContain('Page 2');
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

  describe('rename the page in place from the switcher', () => {
    /** The page shown now is the row it is renamed on, so the open switcher is where renaming starts. */
    const openSwitcher = async (page: AppElement): Promise<void> => {
      trigger(page).click();
      await page.updateComplete;
    };
    const pageEdit = (page: AppElement): Element => {
      const element = currentRow(page).querySelector('dpk-inline-edit');
      if (!element) throw new Error('no page inline edit');
      return element;
    };
    const startEditing = (page: AppElement): void => {
      const edit = pageEdit(page);
      const resting = edit.shadowRoot?.querySelector<HTMLElement>('.field');
      if (!resting) throw new Error('no page field');
      resting.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true }));
      resting.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    };
    const field = (page: AppElement): HTMLTextAreaElement => {
      const edit = pageEdit(page);
      const input = edit.shadowRoot?.querySelector<HTMLTextAreaElement>('.field');
      if (!input) throw new Error('no page field');
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
      await openSwitcher(page);
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

    it('takes the rename back with the page it renamed', async () => {
      const { page, settle } = await mount();
      trigger(page).click();
      await page.updateComplete;
      page.renderRoot.querySelector<HTMLElement>('[data-key="add"]')?.click();
      await page.updateComplete;
      page.renderRoot.querySelector<HTMLElement>('[data-key="content:view:usm"]')?.click();
      await settle();
      await openSwitcher(page);
      startEditing(page);
      await page.updateComplete;
      const input = field(page);
      input.value = 'Roadmap';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await settle();
      expect(page.api.actions.map((action) => action.type)).toEqual(['ADD_PAGE', 'RENAME_PAGE']);
      await openSwitcher(page);
      removeButton(page, 'Remove page "Roadmap"').click();
      await settle();
      // Nothing about the page is left in the draft: not its own actions, and
      // not the rename that shared the app-wide target with every other page.
      expect(page.api.actions).toEqual([]);
    });

    it('commits a rename on Enter, recorded in the draft and undoable', async () => {
      const { page } = await mount();
      await openSwitcher(page);
      startEditing(page);
      await page.updateComplete;
      const input = field(page);
      input.value = 'Checkout flow';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await page.updateComplete;
      expect(shownPage(page)).toBe('Checkout flow');
      expect(page.api.actions.map((action) => [action.type, action.payload])).toEqual([
        ['RENAME_PAGE', { page: 'before', label: 'Checkout flow' }],
      ]);
      expect(page.controller.undo()).toBe(true);
      await page.updateComplete;
      expect(shownPage(page)).toBe('Before');
    });

    it('commits a rename on blur', async () => {
      const { page } = await mount();
      await openSwitcher(page);
      startEditing(page);
      await page.updateComplete;
      const input = field(page);
      input.value = 'Renamed on blur';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new FocusEvent('blur'));
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
      await page.updateComplete;
      expect(shownPage(page)).toBe('Renamed on blur');
      expect(page.api.actions.map((action) => action.type)).toEqual(['RENAME_PAGE']);
    });

    it('cancels on Escape, leaving the draft untouched', async () => {
      const { page } = await mount();
      await openSwitcher(page);
      startEditing(page);
      await page.updateComplete;
      const input = field(page);
      input.value = 'Should not stick';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await page.updateComplete;
      expect(shownPage(page)).toBe('Before');
      expect(page.api.actions).toEqual([]);
    });
  });

  describe("settings dialog shows a page's own sections", () => {
    const USM_BASE = `<script type="application/json">${JSON.stringify({
      activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
      statuses: [
        { id: 'idea', name: 'Idea' },
        { id: 'done', name: 'Done', tone: 'green' },
      ],
      stories: [{ id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1', statusId: 'done' }],
    })}</script>`;

    const mountUsm = async () => {
      const page = document.createElement('dpk-app');
      if (!(page instanceof AppElement)) throw new Error('not upgraded');
      page.storage = 'memory';
      page.innerHTML = `<dpk-page name="map" label="Map"><dpk-view-usm>${USM_BASE}</dpk-view-usm></dpk-page>`;
      document.body.append(page);
      await page.api.ready;
      await page.updateComplete;
      const view = page.querySelector('dpk-view-usm');
      if (!(view instanceof HTMLElement)) throw new Error('no usm');
      /** The element the statuses section renders itself into, inside the app's dialog. */
      const sectionHost = async (): Promise<HTMLElement> => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await page.updateComplete;
        const found = page.renderRoot.querySelector('dpk-internal-usm-settings-section');
        if (!(found instanceof HTMLElement)) throw new Error('no settings section element');
        return found;
      };
      const section = async (): Promise<HTMLElement> => {
        const found = (await sectionHost()).shadowRoot?.querySelector('[data-testid="usm-statuses"]');
        if (!(found instanceof HTMLElement)) throw new Error('no statuses section');
        return found;
      };
      return { page, view: view as HTMLElement & { openSettings(id?: string): void }, section, sectionHost };
    };

    const rows = (section: HTMLElement): (string | null)[] =>
      [...section.querySelectorAll('[data-status]')].map((row) => row.getAttribute('data-status'));

    // The app draws the dialog, so its body is built from the page's part of the
    // state — which the page only takes in after the app's render (`#syncPages`).
    // Without a second render an edit made inside the open dialog showed up only
    // after closing and reopening it.
    it('redraws the section when a status is added from inside the open dialog', async () => {
      const { page, view, section } = await mountUsm();
      view.openSettings('statuses');
      await page.updateComplete;
      const shown = await section();
      expect(rows(shown)).toEqual(['idea', 'done']);
      const add = [...shown.querySelectorAll('button')].at(-1);
      if (add === undefined) throw new Error('no add button');
      add.click();
      expect(page.api.actions.map((action) => action.type)).toEqual(['ADD_STATUS']);
      // No reopen: the same dialog, the same section, one more row.
      await page.updateComplete;
      expect(rows(await section())).toHaveLength(3);
      expect((page.renderRoot.querySelector('dialog') as HTMLDialogElement).open).toBe(true);
    });

    // The section's markup is rendered by the page but drawn in the app's dialog,
    // so it is put in an element that owns its shadow root and its CSS: otherwise
    // it renders unstyled, since the app's root has none of the page's styles.
    it('puts the section markup in its own element, not in the app root', async () => {
      const { page, view, sectionHost } = await mountUsm();
      view.openSettings('statuses');
      await page.updateComplete;
      const host = await sectionHost();
      expect(page.renderRoot.querySelector('[data-testid="usm-statuses"]')).toBeNull();
      expect(host.shadowRoot?.querySelector('[data-testid="usm-statuses"]')).not.toBeNull();
    });

    it("opens a status's icon menu in the dialog the app draws", async () => {
      const { page, view, section, sectionHost } = await mountUsm();
      view.openSettings('statuses');
      await page.updateComplete;
      const shown = await section();
      const trigger = shown.querySelector('[data-status="idea"] [data-icon-trigger]');
      if (!(trigger instanceof HTMLElement)) throw new Error('no icon trigger');
      trigger.click();
      await page.updateComplete;
      // The menu belongs to the section element that drew the icon.
      expect((await sectionHost()).shadowRoot?.querySelector('#icon-menu')).not.toBeNull();
      expect(
        (await section()).querySelector('[data-status="idea"] [data-icon-trigger]')?.getAttribute('aria-expanded'),
      ).toBe('true');
    });

    it('redraws the section when a status is renamed from inside the open dialog', async () => {
      const { page, view, section } = await mountUsm();
      view.openSettings('statuses');
      await page.updateComplete;
      const shown = await section();
      const name = shown.querySelector('[data-status="idea"] dpk-inline-edit');
      if (!(name instanceof HTMLElement)) throw new Error('no name editor');
      name.dispatchEvent(
        new CustomEvent('dpk-commit', { detail: { value: 'Exploring' }, bubbles: true, composed: true }),
      );
      await page.updateComplete;
      expect(page.api.actions.map((action) => action.type)).toEqual(['SET_STATUS_NAME']);
      const renamed = (await section()).querySelector('[data-status="idea"] dpk-inline-edit');
      expect((renamed as (HTMLElement & { value: string }) | null)?.value).toBe('Exploring');
    });
  });

  describe('page-nav="none"', () => {
    it('draws no switcher or "+", keeping the page\'s own title bar', async () => {
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
      // The page's own title bar still shows (title, settings, notice bell, …).
      expect(page.renderRoot.querySelector('.dpk-header')).not.toBeNull();
      expect(page.renderRoot.querySelector('.dpk-header h1')?.textContent).toBe('Catalog');
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

describe('AppElement styles', () => {
  const flatten = (styles: unknown): unknown[] => (Array.isArray(styles) ? styles.flatMap(flatten) : [styles]);

  it('adopts the context-menu styles, so a divider is a rule and not a stray dot', () => {
    expect(flatten(AppElement.styles)).toContain(contextMenuStyles);
  });

  // The app draws the screen's floating menu and its settings dialog itself, and
  // `static styles` replaces the inherited set: without these it renders them
  // unstyled — the menu a stack of rows at the bottom edge, the dialog bare.
  it.each([
    ['the floating menu', floatingMenuStyles, '.dpk-floating-menu'],
    ['the settings dialog', settingsDialogStyles, '.dpk-settings-list'],
  ])('adopts the styles for %s, which it draws itself', (_label, styles, selector) => {
    expect(flatten(AppElement.styles)).toContain(styles);
    const cssText = (styles as unknown as { cssText: string }).cssText;
    expect(cssText).toContain(`${selector} {`);
  });

  // The header row is the shell's, and the app owns it on every page: without the
  // chrome styles' own sheet it draws unstyled next to the page content.
  it('adopts the chrome styles, which the header row it owns is drawn with', () => {
    const cssText = (styles: unknown): string => (styles as { cssText?: string }).cssText ?? '';
    const shellSheet = flatten(chromeStyles).find((sheet) => cssText(sheet).includes('.dpk-header {'));
    expect(shellSheet).toBeDefined();
    expect(flatten(AppElement.styles)).toContain(shellSheet);
  });
});
