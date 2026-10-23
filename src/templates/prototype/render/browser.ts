import { html, nothing, type TemplateResult } from 'lit';

import type * as Chrome from '../../../components/browser/chrome';
import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { BrowserPage } from '../browser-sim';
import type { BrowserView, NewTabShortcut } from '../browser-view';
import type { PrototypeMessages } from '../messages';
import type { PrototypePreview, PrototypeState } from '../model';

import { renderBrowserBody, renderBrowserBottom, renderBrowserTop } from '../../../components/browser/chrome';
import { renderDemoControls, type DemoControls } from './demo-controls';
import { frameStyle, type FrameWindow } from './frame-size';

/** What the reader does with the browser; the element turns it into history and navigation. */
export type BrowserCommand = Chrome.BrowserCommand<BrowserPage>;

export type BrowserFrame = {
  readonly view: BrowserView;
  /** The web preview of the page on screen; absent on the new tab page or an unreachable address. */
  readonly preview?: PrototypePreview;
  readonly hasContent: boolean;
  /** The window's size: the page's, or on a page of its own (new tab, unreachable) the page it covers. */
  readonly viewport: PrototypePreview['viewport'];
  /** The window the browser is: a device's size, or the whole demo. */
  readonly window: FrameWindow;
  /** The pages offered on the new tab page. */
  readonly shortcuts: readonly NewTabShortcut[];
  /** Set for the moment a reload takes. */
  readonly loading: boolean;
  /** Whether a phone browser shows its tab overview over the page. */
  readonly switcher: boolean;
  /** Set only while a demo runs, so its controls sit in the window itself. */
  readonly demo?: DemoControls;
  readonly send: (command: BrowserCommand) => void;
};

const browserLabels = (m: PrototypeMessages): Chrome.BrowserLabels => ({
  back: m.browserBack,
  forward: m.browserForward,
  reload: m.browserReload,
  address: m.browserAddress,
  tabs: m.browserTabs,
  newTab: m.newTab,
  closeTab: m.closeTab,
  profile: m.browserProfile,
  guest: m.browserGuest,
  shortcuts: m.newTabShortcuts,
  unreachableTitle: m.unreachableTitle,
  unreachableBody: m.unreachableBody,
});

const renderPage = (preview: PrototypePreview, hasContent: boolean): TemplateResult =>
  html`<slot name=${`preview:${preview.id}`}></slot> ${
      hasContent
        ? nothing
        : html`<div class="frame-placeholder">
            <span class="dpk-label">light dom preview</span>
            <code>&lt;div slot="preview" data-preview-id="${preview.id}"&gt;</code>
          </div>`
    }`;

/**
 * A browser window around the app view's web pages (the chrome is the shared
 * `components/browser/chrome.ts`): tabs, a toolbar with back / forward /
 * reload, the address bar and the profile of the user the window belongs to.
 * A phone-wide window is a phone browser instead. The page itself is the
 * author's markup in its slot.
 */
export const renderBrowser = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  frame: BrowserFrame,
): TemplateResult => {
  const { preview, viewport } = frame;
  const chrome: Chrome.BrowserChrome<BrowserPage> = {
    view: frame.view,
    // A phone browser has no tab strip: its tabs are behind the count in the bottom bar.
    phone: viewport === 'mobile',
    switcher: frame.switcher,
    shortcuts: frame.shortcuts.map((shortcut) => ({ ...shortcut, href: context.hashFor(shortcut.page) })),
    labels: browserLabels(m),
    ...(frame.demo === undefined ? {} : { extra: renderDemoControls(m, frame.demo) }),
    send: frame.send,
  };
  return html`<figure
    class="frame browser"
    data-kind="browser"
    data-viewport=${viewport}
    ?data-loading=${frame.loading}
    ?data-empty=${preview !== undefined && !frame.hasContent}
    data-window=${frame.window.kind}
    style=${frameStyle('browser', viewport, frame.window)}
  >
    ${renderBrowserTop(chrome)}
    <div class="viewport browser-page">
      ${renderBrowserBody(chrome, preview === undefined ? undefined : renderPage(preview, frame.hasContent))}
    </div>
    ${renderBrowserBottom(chrome)}
  </figure>`;
};
