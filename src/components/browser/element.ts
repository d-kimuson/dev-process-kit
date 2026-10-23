import { LitElement, css, html, type CSSResultGroup, type PropertyValues } from 'lit';

import { LocaleController } from '../../core/locale-controller';
import { tokens } from '../../core/theme';
import { typedAddress } from './address';
import {
  renderBrowserBody,
  renderBrowserBottom,
  renderBrowserTop,
  type BrowserChrome,
  type BrowserCommand,
} from './chrome';
import { browserMessages, type BrowserMessages } from './messages';
import { pageAt, presentSite, siteShortcuts, type BrowserAddress, type BrowserSitePage } from './model';
import {
  activeEntry,
  reduceBrowser,
  startBrowser,
  type BrowserEntry,
  type BrowserIntent,
  type BrowserSim,
} from './sim';
import { browserStyles } from './styles';

const PAGE_SELECTOR = ':scope > [data-url]';

/** How long a reload takes, so the reader sees it happen. */
const RELOAD_MS = 360;

/** Where a relative address goes when no page is on screen. */
const FALLBACK_ORIGIN = 'https://page.example.com/';

type BrowserViewport = 'desktop' | 'mobile';

/**
 * `<dpk-browser>` — a browser to click through a web mock in: tabs,
 * back / forward / reload, an address bar, a new tab page, and on
 * `viewport="mobile"` a phone browser with its controls under the page.
 *
 * - Each direct child with a `data-url` is a page at that address; its
 *   `data-title` (or first heading) is the tab's title. The first page opens,
 *   or the one `url` names.
 * - A link of a page to another page's address goes there; `target="_blank"`,
 *   a Ctrl / Cmd click or a middle click opens it in a tab. An address no page
 *   has shows the browser's own "can't be reached" page.
 * - `profile` names whose window it is (a guest by default).
 * - Reload resets the page's forms, closes its dialogs, scrolls it to the top
 *   and fires `dpk-reload` on it, for the mock to reset whatever else it keeps.
 *
 * Events: `dpk-browser-navigate` with `{ url }` whenever the page on screen
 * changes (`url` is empty on the new tab page).
 *
 * The tabs and their history are reader state: they are never recorded in the
 * draft. Pages are assigned to the slot by hand, so the author's markup is
 * never rewritten and a hidden page keeps its comment targets.
 */
export class DpkBrowser extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override styles: CSSResultGroup = [
    tokens,
    browserStyles,
    css`
      :host {
        display: block;
        height: var(--dpk-browser-height, 460px);
        min-height: 240px;
        color: var(--dpk-ink);
        font-family: var(--dpk-body);
      }

      :host([viewport='mobile']) {
        max-width: var(--dpk-browser-phone-width, 390px);
        height: var(--dpk-browser-height, 720px);
      }

      .browser {
        box-sizing: border-box;
        height: 100%;
        border: 1px solid var(--dpk-rule);
        border-radius: var(--dpk-radius-lg);
        background: var(--dpk-paper-raised);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
        overflow: hidden;
      }

      /* The page is the product's own light surface, and scrolls under the chrome. */
      .browser-page {
        position: relative;
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        min-height: 0;
        overflow: auto;
        color-scheme: light;
        background: #fff;
        color: #1f2430;
      }

      ::slotted(*) {
        flex: 1 0 auto;
      }
    `,
  ];

  static override properties = {
    url: { type: String },
    viewport: { type: String, reflect: true },
    profile: { type: String },
  };

  /** The page to open on; setting it later visits that address in the active tab. */
  declare url: string | null;
  declare viewport: BrowserViewport;
  declare profile: string | null;

  readonly #i18n = new LocaleController(this);
  readonly #observer = new MutationObserver(() => {
    this.requestUpdate();
  });

  #sim: BrowserSim<BrowserAddress> | null = null;
  #switcher = false;
  #loading: ReturnType<typeof setTimeout> | null = null;
  #focusTab = false;
  #shownUrl: string | null = null;

  constructor() {
    super();
    this.url = null;
    this.viewport = 'desktop';
    this.profile = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, {
      childList: true,
      attributes: true,
      attributeFilter: ['data-url', 'data-title'],
    });
    this.addEventListener('click', this.#onLinkClick);
    this.addEventListener('auxclick', this.#onLinkClick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer.disconnect();
    this.removeEventListener('click', this.#onLinkClick);
    this.removeEventListener('auxclick', this.#onLinkClick);
    if (this.#loading !== null) clearTimeout(this.#loading);
    this.#loading = null;
  }

  get #m(): BrowserMessages {
    return browserMessages(this.#i18n.locale);
  }

  get #phone(): boolean {
    return this.viewport === 'mobile';
  }

  get #pageElements(): readonly HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(PAGE_SELECTOR)];
  }

  get #pages(): readonly BrowserSitePage[] {
    return this.#pageElements.map((element) => {
      const url = element.dataset['url'] ?? '';
      const heading = element.querySelector('h1, h2, h3')?.textContent?.trim();
      return { url, title: element.dataset['title'] ?? (heading || url) };
    });
  }

  /** The address the page on screen is at, for relative links and typed paths. */
  get #current(): string {
    const entry = this.#sim === null ? undefined : activeEntry(this.#sim);
    return entry?.kind === 'page' ? entry.page.url : (this.#pages[0]?.url ?? FALLBACK_ORIGIN);
  }

  /** The element of the page on screen, if it has one. */
  #shownPage(entry: BrowserEntry<BrowserAddress> | undefined): HTMLElement | undefined {
    if (entry?.kind !== 'page') return undefined;
    const page = pageAt(this.#pages, entry.page.url, entry.page.url);
    return page === undefined ? undefined : this.#pageElements.find((element) => element.dataset['url'] === page.url);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (this.#sim === null) {
      const pages = this.#pages;
      const first = (this.url === null ? undefined : pageAt(pages, this.url, FALLBACK_ORIGIN)) ?? pages[0];
      if (first !== undefined) this.#sim = startBrowser({ url: first.url });
      return;
    }
    if (changed.has('url') && this.url !== null) this.#openAddress(this.url, false);
  }

  protected override render(): unknown {
    const sim = this.#sim;
    if (sim === null) return html`<slot hidden></slot>`;
    const m = this.#m;
    const pages = this.#pages;
    const view = presentSite(pages, sim, m.newTab, this.profile);
    const chrome: BrowserChrome<BrowserAddress> = {
      view,
      phone: this.#phone,
      switcher: this.#switcher,
      shortcuts: view.entry?.kind === 'new-tab' ? siteShortcuts(pages) : [],
      labels: m,
      send: (command) => {
        this.#onCommand(command);
      },
    };
    const shown = this.#shownPage(view.entry);
    return html`<div
      class="browser"
      data-viewport=${this.#phone ? 'mobile' : 'desktop'}
      ?data-loading=${this.#loading !== null}
    >
      ${renderBrowserTop(chrome)}
      <div class="browser-page">
        ${renderBrowserBody(chrome, shown === undefined ? undefined : html`<slot></slot>`)}
      </div>
      ${renderBrowserBottom(chrome)}
    </div>`;
  }

  protected override updated(): void {
    const entry = this.#sim === null ? undefined : activeEntry(this.#sim);
    const shown = this.#shownPage(entry);
    this.renderRoot.querySelector('slot')?.assign(...(shown === undefined ? [] : [shown]));
    if (this.#focusTab) {
      this.#focusTab = false;
      this.renderRoot.querySelector<HTMLElement>('.browser-tab[aria-selected="true"]')?.focus();
    }
    const url =
      entry === undefined || entry.kind === 'new-tab' ? '' : entry.kind === 'page' ? entry.page.url : entry.url;
    if (url === this.#shownUrl) return;
    const first = this.#shownUrl === null;
    this.#shownUrl = url;
    if (!first)
      this.dispatchEvent(new CustomEvent('dpk-browser-navigate', { detail: { url }, bubbles: true, composed: true }));
  }

  #send(intent: BrowserIntent<BrowserAddress>): void {
    if (this.#sim === null) return;
    const next = reduceBrowser(this.#sim, intent);
    if (next === this.#sim) return;
    this.#sim = next;
    this.#stopReload();
    this.renderRoot.querySelector('.browser-page')?.scrollTo?.({ top: 0 });
    this.requestUpdate();
  }

  #onCommand(command: BrowserCommand<BrowserAddress>): void {
    switch (command.kind) {
      case 'reload':
        this.#reload();
        return;
      case 'address':
        this.#openAddress(command.input, false);
        return;
      case 'back':
      case 'forward':
      case 'new-tab':
        this.#switcher = false;
        this.#send({ kind: command.kind });
        this.requestUpdate();
        return;
      case 'switcher':
        this.#switcher = command.open;
        this.requestUpdate();
        return;
      case 'activate':
        // Picking a tab on the overview goes back to the page.
        this.#switcher = false;
        this.#focusTab = command.focus === true;
        this.#send({ kind: 'activate', id: command.id });
        this.requestUpdate();
        return;
      case 'close-tab':
        this.#send({ kind: 'close-tab', id: command.id });
        return;
      case 'visit':
        this.#send({ kind: 'visit', page: command.page });
        return;
      default:
        return;
    }
  }

  /** Goes to an address: the page there, or the unreachable page; `tab` opens it in a new tab. */
  #openAddress(input: string, tab: false | { readonly background: boolean }): void {
    const current = this.#current;
    const page = pageAt(this.#pages, input, current);
    const entry: BrowserEntry<BrowserAddress> =
      page === undefined
        ? { kind: 'unreachable', url: typedAddress(input, current) }
        : { kind: 'page', page: { url: page.url } };
    if (tab !== false) this.#send({ kind: 'open-tab', entry, background: tab.background });
    else if (entry.kind === 'page') this.#send({ kind: 'visit', page: entry.page });
    else this.#send({ kind: 'unreachable', url: entry.url });
  }

  /**
   * Reloads the page on screen: a moment of loading, then its forms start
   * over, its dialogs close, it scrolls back to the top, and it hears a
   * `dpk-reload` event to reset whatever else it keeps.
   */
  #reload(): void {
    if (this.#loading !== null || this.#sim === null) return;
    const page = this.#shownPage(activeEntry(this.#sim));
    this.#loading = setTimeout(() => {
      this.#loading = null;
      if (page !== undefined) {
        for (const form of page.querySelectorAll('form')) form.reset();
        for (const dialog of page.querySelectorAll('dialog')) dialog.close();
        page.scrollTop = 0;
        page.dispatchEvent(new CustomEvent('dpk-reload', { bubbles: true }));
      }
      this.renderRoot.querySelector('.browser-page')?.scrollTo?.({ top: 0 });
      this.requestUpdate();
    }, RELOAD_MS);
    this.requestUpdate();
  }

  #stopReload(): void {
    if (this.#loading === null) return;
    clearTimeout(this.#loading);
    this.#loading = null;
  }

  /**
   * A link of a page: to another address it goes there in the browser, in a
   * new tab for `target="_blank"`, a Ctrl / Cmd click or a middle click (a
   * background tab). A link within the page (`#…`) is the page's own.
   */
  #onLinkClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || this.#sim === null) return;
    if (event.type === 'auxclick' && event.button !== 1) return;
    const link = event
      .composedPath()
      .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement && this.contains(node));
    const href = link?.getAttribute('href');
    if (link === undefined || href === null || href === undefined || href.startsWith('#')) return;
    event.preventDefault();
    const background = event.metaKey || event.ctrlKey || event.button === 1;
    const blank = link.target === '_blank';
    const target = new URL(href, this.#current).href;
    this.#openAddress(target, blank || background ? { background } : false);
  };
}
