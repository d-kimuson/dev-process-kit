import { html, nothing, svg, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { BrowserPage } from '../browser-sim';
import type { BrowserView, NewTabShortcut } from '../browser-view';
import type { PrototypeMessages } from '../messages';
import type { PrototypePreview, PrototypeState } from '../model';

import { iconClose, iconPlus } from '../../../core/icons';
import { VIEWPORT_MIN_HEIGHT, VIEWPORT_WIDTH } from './frame-size';

/** What the reader does with the browser; the element turns it into history and navigation. */
export type BrowserCommand =
  | { readonly kind: 'back' }
  | { readonly kind: 'forward' }
  | { readonly kind: 'reload' }
  | { readonly kind: 'new-tab' }
  /** `focus`: the reader moved there from the keyboard, so the focus follows. */
  | { readonly kind: 'activate'; readonly id: string; readonly focus?: boolean }
  | { readonly kind: 'close-tab'; readonly id: string }
  | { readonly kind: 'address'; readonly input: string }
  | { readonly kind: 'visit'; readonly page: BrowserPage }
  /** A phone browser's tab overview, which the tab count opens and closes. */
  | { readonly kind: 'switcher'; readonly open: boolean };

export type BrowserFrame = {
  readonly view: BrowserView;
  /** The web preview of the page on screen; absent on the new tab page or an unreachable address. */
  readonly preview?: PrototypePreview;
  readonly hasContent: boolean;
  /** The window's size: the page's, or on a page of its own (new tab, unreachable) the page it covers. */
  readonly viewport: PrototypePreview['viewport'];
  /** The pages offered on the new tab page. */
  readonly shortcuts: readonly NewTabShortcut[];
  /** Set for the moment a reload takes. */
  readonly loading: boolean;
  /** Whether a phone browser shows its tab overview over the page. */
  readonly switcher: boolean;
  /** Ends the demo; set only while one runs, so the way out sits in the window itself. */
  readonly onExitDemo?: () => void;
  readonly send: (command: BrowserCommand) => void;
};

const ICON = (body: TemplateResult): TemplateResult =>
  html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    ${body}
  </svg>`;

const iconBack = (): TemplateResult => ICON(svg`<path d="M13 8H3.5M7.5 3.5 3 8l4.5 4.5" />`);
const iconForward = (): TemplateResult => ICON(svg`<path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" />`);
const iconReload = (): TemplateResult => ICON(svg`<path d="M13 8a5 5 0 1 1-1.6-3.7" /><path d="M13 2.8v2.7h-2.7" />`);
const iconLock = (): TemplateResult =>
  ICON(svg`<rect x="4" y="7" width="8" height="6" rx="1.4" /><path d="M5.8 7V5.3a2.2 2.2 0 0 1 4.4 0V7" />`);
const iconGlobe = (): TemplateResult =>
  ICON(
    svg`<circle cx="8" cy="8" r="5.5" /><path d="M2.5 8h11M8 2.5c1.6 1.6 2.3 3.5 2.3 5.5S9.6 11.9 8 13.5M8 2.5C6.4 4.1 5.7 6 5.7 8s.7 3.9 2.3 5.5" />`,
  );

/** The tab a key moves to in the tab strip: arrows go round, Home and End go to either end. */
const tabFor = (key: string, tabs: BrowserView['tabs'], index: number): BrowserView['tabs'][number] | undefined => {
  const last = tabs.length - 1;
  if (key === 'ArrowRight') return tabs[index === last ? 0 : index + 1];
  if (key === 'ArrowLeft') return tabs[index === 0 ? last : index - 1];
  if (key === 'Home') return tabs[0];
  if (key === 'End') return tabs[last];
  return undefined;
};

const renderTabs = (m: PrototypeMessages, frame: BrowserFrame): TemplateResult => {
  const { view, send } = frame;
  const onTabKey = (index: number) => (event: KeyboardEvent) => {
    const tab = view.tabs[index];
    const target = event.key === 'Enter' || event.key === ' ' ? tab : tabFor(event.key, view.tabs, index);
    if (target === undefined) return;
    event.preventDefault();
    send({ kind: 'activate', id: target.id, focus: true });
  };
  return html`<div class="browser-tabs">
    <div class="browser-tab-list" role="tablist" aria-label=${m.browserTabs}>
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
            ${renderCloseTab(m, frame, tab.id)}
          </div>`,
      )}
    </div>
    <button
      class="browser-new-tab"
      type="button"
      aria-label=${m.newTab}
      title=${m.newTab}
      @click=${() => send({ kind: 'new-tab' })}
    >
      ${iconPlus()}
    </button>
    ${
      frame.onExitDemo === undefined
        ? nothing
        : html`<button class="demo-exit" type="button" title=${m.exitDemo} @click=${frame.onExitDemo}>
            ${iconClose()} ${m.exitDemo} <kbd>Esc</kbd>
          </button>`
    }
  </div>`;
};

/** Every tab closes, the last one too: the window then stays on a new tab page. */
const renderCloseTab = (m: PrototypeMessages, frame: BrowserFrame, id: string): TemplateResult =>
  html`<button
    class="browser-tab-close"
    type="button"
    aria-label=${m.closeTab}
    title=${m.closeTab}
    @click=${(event: Event) => {
      event.stopPropagation();
      frame.send({ kind: 'close-tab', id });
    }}
  >
    ${iconClose()}
  </button>`;

type NavKind = 'back' | 'forward' | 'reload';

const NAV_ICONS: Record<NavKind, () => TemplateResult> = { back: iconBack, forward: iconForward, reload: iconReload };

const renderNav = (m: PrototypeMessages, frame: BrowserFrame, kind: NavKind): TemplateResult => {
  const { view, send } = frame;
  const label = { back: m.browserBack, forward: m.browserForward, reload: m.browserReload }[kind];
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

const renderToolbar = (m: PrototypeMessages, frame: BrowserFrame, phone: boolean): TemplateResult => {
  const { view, send } = frame;
  const profile = view.profile ?? m.browserGuest;
  return html`<div class="browser-toolbar">
    ${phone ? nothing : html`${renderNav(m, frame, 'back')} ${renderNav(m, frame, 'forward')} ${renderNav(m, frame, 'reload')}`}
    <form
      class="browser-address-form"
      @submit=${(event: SubmitEvent) => {
        event.preventDefault();
        const form = event.currentTarget;
        const input = form instanceof HTMLFormElement ? form.querySelector('input') : null;
        if (!input || input.value.trim() === '') return;
        input.blur();
        send({ kind: 'address', input: input.value });
      }}
    >
      <span class="browser-lock">${view.entry?.kind === 'page' ? iconLock() : iconGlobe()}</span>
      <input
        class="browser-address"
        type="text"
        aria-label=${m.browserAddress}
        spellcheck="false"
        autocomplete="off"
        .value=${live(view.url)}
        @focus=${(event: FocusEvent) => {
          if (event.currentTarget instanceof HTMLInputElement) event.currentTarget.select();
        }}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key !== 'Escape') return;
          // Escape puts the address back, like a browser; the demo stays on.
          event.preventDefault();
          const input = event.currentTarget;
          if (!(input instanceof HTMLInputElement)) return;
          input.value = view.url;
          input.blur();
        }}
      />
    </form>
    <span class="browser-profile" title=${m.browserProfile(profile)}>
      <span class="browser-avatar" aria-hidden="true">${Array.from(profile)[0] ?? ''}</span>
      ${phone ? nothing : html`<span class="browser-profile-name">${profile}</span>`}
    </span>
  </div>`;
};

/** A phone browser keeps its controls under the page, in reach of the thumb. */
const renderBottomBar = (m: PrototypeMessages, frame: BrowserFrame): TemplateResult => {
  const { view, send } = frame;
  return html`<div class="browser-bottom">
    ${renderNav(m, frame, 'back')} ${renderNav(m, frame, 'forward')}
    <button
      class="browser-nav browser-new-tab"
      type="button"
      aria-label=${m.newTab}
      title=${m.newTab}
      @click=${() => send({ kind: 'new-tab' })}
    >
      ${iconPlus()}
    </button>
    <button
      class="browser-nav browser-tab-count"
      type="button"
      aria-label=${m.browserTabs}
      title=${m.browserTabs}
      aria-expanded=${frame.switcher ? 'true' : 'false'}
      @click=${() => send({ kind: 'switcher', open: !frame.switcher })}
    >
      <span class="browser-tab-count-box">${view.tabs.length}</span>
    </button>
    ${renderNav(m, frame, 'reload')}
  </div>`;
};

/** A phone browser's tabs: one card each, over the page, until the reader picks one. */
const renderSwitcher = (m: PrototypeMessages, frame: BrowserFrame): TemplateResult => {
  const { view, send } = frame;
  return html`<div class="browser-switcher" role="dialog" aria-label=${m.browserTabs}>
    ${view.tabs.map(
      (tab) =>
        html`<div class="browser-card" aria-current=${tab.active ? 'true' : nothing}>
          <button class="browser-card-open" type="button" @click=${() => send({ kind: 'activate', id: tab.id })}>
            <span class="browser-favicon">${iconGlobe()}</span>
            <span class="browser-card-title">${tab.title}</span>
            <span class="browser-card-url">${tab.url}</span>
          </button>
          ${renderCloseTab(m, frame, tab.id)}
        </div>`,
    )}
  </div>`;
};

const renderNewTabPage = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  frame: BrowserFrame,
): TemplateResult => {
  return html`<div class="browser-newtab">
    <p class="browser-newtab-label">${m.newTabShortcuts}</p>
    <div class="browser-shortcuts">
      ${frame.shortcuts.map(
        (shortcut) =>
          html`<a
            class="browser-shortcut"
            href=${context.hashFor(shortcut.page)}
            @click=${(event: MouseEvent) => {
              event.preventDefault();
              frame.send({ kind: 'visit', page: shortcut.page });
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

const renderUnreachable = (m: PrototypeMessages, url: string): TemplateResult => {
  return html`<div class="browser-unreachable" role="alert">
    <h3>${m.unreachableTitle}</h3>
    <p>${m.unreachableBody}</p>
    <code>${url}</code>
  </div>`;
};

/**
 * A browser window around the app view's web pages: tabs, a toolbar with
 * back / forward / reload, the address bar and the profile of the user the
 * window belongs to. A phone-wide window is a phone browser instead: the
 * address on top, the controls and the tab count at the bottom. The page
 * itself is the author's markup in its slot.
 */
export const renderBrowser = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  frame: BrowserFrame,
): TemplateResult => {
  const { view, preview, viewport } = frame;
  const entry = view.entry;
  // A phone browser has no tab strip: its tabs are behind the count in the bottom bar.
  const phone = viewport === 'mobile';
  return html`<figure
    class="frame browser"
    data-kind="browser"
    data-viewport=${viewport}
    ?data-loading=${frame.loading}
    ?data-empty=${preview !== undefined && !frame.hasContent}
    style=${`--frame-width:${VIEWPORT_WIDTH[viewport]};--frame-min-height:${VIEWPORT_MIN_HEIGHT[viewport]}`}
  >
    ${phone ? nothing : renderTabs(m, frame)} ${renderToolbar(m, frame, phone)}
    <div class="browser-progress" aria-hidden="true"></div>
    <div class="viewport">
      ${phone && frame.switcher ? renderSwitcher(m, frame) : nothing}
      ${
        entry?.kind === 'unreachable'
          ? renderUnreachable(m, entry.url)
          : preview === undefined
            ? renderNewTabPage(context, m, frame)
            : html`<slot name=${`preview:${preview.id}`}></slot> ${
                  frame.hasContent
                    ? nothing
                    : html`<div class="frame-placeholder">
                        <span class="dpk-label">light dom preview</span>
                        <code>&lt;div slot="preview" data-preview-id="${preview.id}"&gt;</code>
                      </div>`
                }`
      }
    </div>
    ${phone ? renderBottomBar(m, frame) : nothing}
  </figure>`;
};
