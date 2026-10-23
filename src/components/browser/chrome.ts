import { html, nothing, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { ArrowLeft, ArrowRight, Globe, Lock, RotateCw } from 'lucide';

import type { BrowserEntry } from './sim';

import { iconClose, iconPlus, lucide } from '../../core/icons';

/**
 * The chrome of a simulated browser, drawn from what the host makes of its
 * simulation (see `sim.ts`): the tab strip, the toolbar with back / forward /
 * reload, the address bar and the profile, the new tab page, the page for an
 * address nothing answers, and a phone browser's bottom bar and tab overview.
 *
 * The host owns the window around it and the page itself: it renders
 * `renderBrowserTop`, then its page area with `renderBrowserBody` inside, then
 * `renderBrowserBottom`, in an element of class `browser` (with
 * `data-viewport="mobile"` for a phone browser and `data-loading` during a
 * reload) that adopts `browserStyles`.
 */

/** What the reader does with the browser; the host turns it into history and navigation. */
export type BrowserCommand<P extends object> =
  | { readonly kind: 'back' }
  | { readonly kind: 'forward' }
  | { readonly kind: 'reload' }
  | { readonly kind: 'new-tab' }
  /** `focus`: the reader moved there from the keyboard, so the focus follows. */
  | { readonly kind: 'activate'; readonly id: string; readonly focus?: boolean }
  | { readonly kind: 'close-tab'; readonly id: string }
  | { readonly kind: 'address'; readonly input: string }
  | { readonly kind: 'visit'; readonly page: P }
  /** A phone browser's tab overview, which the tab count opens and closes. */
  | { readonly kind: 'switcher'; readonly open: boolean };

export type BrowserTabView = {
  readonly id: string;
  readonly title: string;
  /** The tab's address; empty on the new tab page. */
  readonly url: string;
  readonly active: boolean;
};

export type BrowserView<P extends object> = {
  readonly tabs: readonly BrowserTabView[];
  /** What the active tab shows. */
  readonly entry: BrowserEntry<P> | undefined;
  /** The address of the active tab; empty on the new tab page. */
  readonly url: string;
  readonly canBack: boolean;
  readonly canForward: boolean;
  /** Who the window belongs to; absent for a guest. */
  readonly profile?: string;
};

/** A page the new tab page offers. */
export type BrowserShortcut<P extends object> = {
  readonly title: string;
  /** The address without its scheme, as a browser's shortcut tile shows it. */
  readonly url: string;
  /** Where the tile links to when it is opened outside the simulation. */
  readonly href: string;
  readonly page: P;
};

export type BrowserLabels = {
  readonly back: string;
  readonly forward: string;
  readonly reload: string;
  readonly address: string;
  readonly tabs: string;
  readonly newTab: string;
  readonly closeTab: string;
  readonly profile: (name: string) => string;
  readonly guest: string;
  readonly shortcuts: string;
  readonly unreachableTitle: string;
  readonly unreachableBody: string;
};

export type BrowserChrome<P extends object> = {
  readonly view: BrowserView<P>;
  /** A phone browser: the address on top, the controls and the tab count at the bottom. */
  readonly phone: boolean;
  /** Whether a phone browser shows its tab overview over the page. */
  readonly switcher: boolean;
  /** The pages offered on the new tab page. */
  readonly shortcuts: readonly BrowserShortcut<P>[];
  readonly labels: BrowserLabels;
  /** Drawn at the free end of a desktop browser's tab strip, like window controls. */
  readonly extra?: TemplateResult;
  readonly send: (command: BrowserCommand<P>) => void;
};

const iconBack = lucide(ArrowLeft);
const iconForward = lucide(ArrowRight);
const iconReload = lucide(RotateCw);
const iconLock = lucide(Lock);
const iconGlobe = lucide(Globe);

/** The tab a key moves to in the tab strip: arrows go round, Home and End go to either end. */
const tabFor = (key: string, tabs: readonly BrowserTabView[], index: number): BrowserTabView | undefined => {
  const last = tabs.length - 1;
  if (key === 'ArrowRight') return tabs[index === last ? 0 : index + 1];
  if (key === 'ArrowLeft') return tabs[index === 0 ? last : index - 1];
  if (key === 'Home') return tabs[0];
  if (key === 'End') return tabs[last];
  return undefined;
};

const renderTabs = <P extends object>(chrome: BrowserChrome<P>): TemplateResult => {
  const { view, send, labels } = chrome;
  const onTabKey = (index: number) => (event: KeyboardEvent) => {
    const tab = view.tabs[index];
    const target = event.key === 'Enter' || event.key === ' ' ? tab : tabFor(event.key, view.tabs, index);
    if (target === undefined) return;
    event.preventDefault();
    send({ kind: 'activate', id: target.id, focus: true });
  };
  return html`<div class="browser-tabs">
    <div class="browser-tab-list" role="tablist" aria-label=${labels.tabs}>
      ${view.tabs.map(
        (tab, index) =>
          html`<div
            class="browser-tab"
            role="tab"
            tabindex=${tab.active ? '0' : '-1'}
            aria-selected=${tab.active ? 'true' : 'false'}
            title=${tab.title}
            @click=${() => send({ kind: 'activate', id: tab.id })}
            @keydown=${onTabKey(index)}
          >
            <span class="browser-favicon">${iconGlobe()}</span>
            <span class="browser-tab-title">${tab.title}</span>
            ${renderCloseTab(chrome, tab.id)}
          </div>`,
      )}
    </div>
    <button
      class="browser-new-tab"
      type="button"
      aria-label=${labels.newTab}
      title=${labels.newTab}
      @click=${() => send({ kind: 'new-tab' })}
    >
      ${iconPlus()}
    </button>
    ${chrome.extra ?? nothing}
  </div>`;
};

/** Every tab closes, the last one too: the window then stays on a new tab page. */
const renderCloseTab = <P extends object>(chrome: BrowserChrome<P>, id: string): TemplateResult =>
  html`<button
    class="browser-tab-close"
    type="button"
    aria-label=${chrome.labels.closeTab}
    title=${chrome.labels.closeTab}
    @click=${(event: Event) => {
      event.stopPropagation();
      chrome.send({ kind: 'close-tab', id });
    }}
  >
    ${iconClose()}
  </button>`;

type NavKind = 'back' | 'forward' | 'reload';

const NAV_ICONS: Record<NavKind, () => TemplateResult> = { back: iconBack, forward: iconForward, reload: iconReload };

const renderNav = <P extends object>(chrome: BrowserChrome<P>, kind: NavKind): TemplateResult => {
  const { view, send, labels } = chrome;
  const label = labels[kind];
  const disabled = { back: !view.canBack, forward: !view.canForward, reload: view.entry?.kind !== 'page' }[kind];
  return html`<button
    class=${`browser-nav browser-${kind}`}
    type="button"
    aria-label=${label}
    title=${label}
    ?disabled=${disabled}
    @click=${() => send({ kind })}
  >
    ${NAV_ICONS[kind]()}
  </button>`;
};

const renderToolbar = <P extends object>(chrome: BrowserChrome<P>): TemplateResult => {
  const { view, send, labels, phone } = chrome;
  const profile = view.profile ?? labels.guest;
  return html`<div class="browser-toolbar">
    ${phone ? nothing : html`${renderNav(chrome, 'back')} ${renderNav(chrome, 'forward')} ${renderNav(chrome, 'reload')}`}
    <div class="browser-address-form">
      <span class="browser-lock">${view.entry?.kind === 'page' ? iconLock() : iconGlobe()}</span>
      <input
        class="browser-address"
        type="text"
        enterkeyhint="go"
        aria-label=${labels.address}
        spellcheck="false"
        autocomplete="off"
        .value=${live(view.url)}
        @focus=${(event: FocusEvent) => {
          if (event.currentTarget instanceof HTMLInputElement) event.currentTarget.select();
        }}
        @keydown=${(event: KeyboardEvent) => {
          const input = event.currentTarget;
          if (!(input instanceof HTMLInputElement) || event.isComposing) return;
          if (event.key === 'Enter') {
            event.preventDefault();
            if (input.value.trim() === '') return;
            input.blur();
            send({ kind: 'address', input: input.value });
            return;
          }
          if (event.key !== 'Escape') return;
          // Escape puts the address back, like a browser; whatever holds the browser stays as it is.
          event.preventDefault();
          input.value = view.url;
          input.blur();
        }}
      />
    </div>
    <span class="browser-profile" title=${labels.profile(profile)}>
      <span class="browser-avatar" aria-hidden="true">${Array.from(profile)[0] ?? ''}</span>
      ${phone ? nothing : html`<span class="browser-profile-name">${profile}</span>`}
    </span>
  </div>`;
};

/** The tab strip (not on a phone), the toolbar and the bar a reload draws. */
export const renderBrowserTop = <P extends object>(chrome: BrowserChrome<P>): TemplateResult =>
  html`${chrome.phone ? nothing : renderTabs(chrome)} ${renderToolbar(chrome)}
    <div class="browser-progress" aria-hidden="true"></div>`;

/** A phone browser keeps its controls under the page, in reach of the thumb. */
export const renderBrowserBottom = <P extends object>(chrome: BrowserChrome<P>): TemplateResult | typeof nothing => {
  if (!chrome.phone) return nothing;
  const { view, send, labels } = chrome;
  return html`<div class="browser-bottom">
    ${renderNav(chrome, 'back')} ${renderNav(chrome, 'forward')}
    <button
      class="browser-nav browser-new-tab"
      type="button"
      aria-label=${labels.newTab}
      title=${labels.newTab}
      @click=${() => send({ kind: 'new-tab' })}
    >
      ${iconPlus()}
    </button>
    <button
      class="browser-nav browser-tab-count"
      type="button"
      aria-label=${labels.tabs}
      title=${labels.tabs}
      aria-expanded=${chrome.switcher ? 'true' : 'false'}
      @click=${() => send({ kind: 'switcher', open: !chrome.switcher })}
    >
      <span class="browser-tab-count-box">${view.tabs.length}</span>
    </button>
    ${renderNav(chrome, 'reload')}
  </div>`;
};

/** A phone browser's tabs: one card each, over the page, until the reader picks one. */
const renderSwitcher = <P extends object>(chrome: BrowserChrome<P>): TemplateResult => {
  const { view, send, labels } = chrome;
  return html`<div class="browser-switcher" role="dialog" aria-label=${labels.tabs}>
    ${view.tabs.map(
      (tab) =>
        html`<div class="browser-card" aria-current=${tab.active ? 'true' : nothing}>
          <button class="browser-card-open" type="button" @click=${() => send({ kind: 'activate', id: tab.id })}>
            <span class="browser-favicon">${iconGlobe()}</span>
            <span class="browser-card-title">${tab.title}</span>
            <span class="browser-card-url">${tab.url}</span>
          </button>
          ${renderCloseTab(chrome, tab.id)}
        </div>`,
    )}
  </div>`;
};

const renderNewTabPage = <P extends object>(chrome: BrowserChrome<P>): TemplateResult => {
  return html`<div class="browser-newtab">
    <p class="browser-newtab-label">${chrome.labels.shortcuts}</p>
    <div class="browser-shortcuts">
      ${chrome.shortcuts.map(
        (shortcut) =>
          html`<a
            class="browser-shortcut"
            href=${shortcut.href}
            @click=${(event: MouseEvent) => {
              event.preventDefault();
              chrome.send({ kind: 'visit', page: shortcut.page });
            }}
          >
            <span class="browser-shortcut-icon" aria-hidden="true">${Array.from(shortcut.title)[0] ?? ''}</span>
            <span class="browser-shortcut-title">${shortcut.title}</span>
            <span class="browser-shortcut-url">${shortcut.url}</span>
          </a>`,
      )}
    </div>
  </div>`;
};

const renderUnreachable = (labels: BrowserLabels, url: string): TemplateResult => {
  return html`<div class="browser-unreachable" role="alert">
    <h3>${labels.unreachableTitle}</h3>
    <p>${labels.unreachableBody}</p>
    <code>${url}</code>
  </div>`;
};

/**
 * What the page area shows: the page for an address nothing answers, else
 * `page`, or the new tab page when there is none, under a phone browser's tab
 * overview when it is open.
 */
export const renderBrowserBody = <P extends object>(chrome: BrowserChrome<P>, page?: unknown): TemplateResult => {
  const entry = chrome.view.entry;
  return html`${chrome.phone && chrome.switcher ? renderSwitcher(chrome) : nothing}
  ${
    entry?.kind === 'unreachable'
      ? renderUnreachable(chrome.labels, entry.url)
      : page === undefined
        ? renderNewTabPage(chrome)
        : page
  }`;
};
