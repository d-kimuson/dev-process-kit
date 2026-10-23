import { css } from 'lit';

/**
 * The simulated browser's chrome (see `chrome.ts`), for the shadow root that
 * draws it: the root is `.browser`, its page area `.browser-page`. The pages a
 * browser draws itself (the new tab page, an unreachable address) are product
 * screens, so they stay light in a dark theme.
 */
export const browserStyles = css`
  /*
   * A tab strip on a darker band, the active tab merged into the toolbar below
   * it, round navigation buttons, a pill address bar and the profile of the
   * user the window belongs to.
   */
  .browser {
    display: flex;
    flex-direction: column;
    --browser-band: var(--dpk-paper-inset);
    --browser-bar: var(--dpk-paper-raised);
  }

  .browser-tabs {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    min-width: 0;
    padding: 7px 10px 0;
    background: var(--browser-band);
  }

  .browser-tab-list {
    display: flex;
    flex: 0 1 auto;
    align-items: flex-end;
    gap: 2px;
    min-width: 0;
  }

  .browser-tab {
    position: relative;
    display: flex;
    flex: 0 1 220px;
    align-items: center;
    gap: 8px;
    min-width: 64px;
    height: 32px;
    padding: 0 8px 0 12px;
    border-radius: 9px 9px 0 0;
    color: var(--dpk-ink-soft);
    font-size: 12px;
    cursor: default;
    user-select: none;
    transition: background 140ms var(--dpk-ease);
  }

  .browser-tab:not([aria-selected='true']):hover {
    background: color-mix(in srgb, var(--browser-bar) 55%, transparent);
  }

  /* A thin rule between two inactive tabs, as in Chrome. */
  .browser-tab:not([aria-selected='true']) + .browser-tab:not([aria-selected='true'])::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 9px;
    bottom: 9px;
    width: 1px;
    background: var(--dpk-rule-strong);
  }

  .browser-tab[aria-selected='true'] {
    background: var(--browser-bar);
    color: var(--dpk-ink);
    box-shadow: 0 -1px 0 var(--dpk-rule);
  }

  .browser-tab:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .browser-favicon {
    display: inline-flex;
    flex: none;
    color: var(--dpk-ink-faint);
  }

  .browser-favicon svg {
    width: 14px;
    height: 14px;
  }

  .browser-tab-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .browser-tab-close,
  .browser-new-tab,
  .browser-nav {
    display: inline-grid;
    flex: none;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--dpk-ink-soft);
    cursor: pointer;
    transition:
      background 140ms var(--dpk-ease),
      color 140ms var(--dpk-ease);
  }

  .browser-tab-close {
    width: 18px;
    height: 18px;
  }

  .browser-tab-close svg {
    width: 10px;
    height: 10px;
  }

  .browser-new-tab {
    width: 26px;
    height: 26px;
    margin-bottom: 3px;
  }

  .browser-new-tab svg {
    width: 14px;
    height: 14px;
  }

  .browser-tab-close:hover,
  .browser-new-tab:hover,
  .browser-nav:not(:disabled):hover {
    background: color-mix(in srgb, var(--dpk-ink) 9%, transparent);
    color: var(--dpk-ink);
  }

  .browser-tab-close:focus-visible,
  .browser-new-tab:focus-visible,
  .browser-nav:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .browser-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 6px 10px;
    background: var(--browser-bar);
    border-bottom: 1px solid var(--dpk-rule);
  }

  .browser-nav {
    width: 30px;
    height: 30px;
  }

  .browser-nav svg {
    width: 15px;
    height: 15px;
  }

  .browser-nav:disabled {
    color: var(--dpk-ink-faint);
    opacity: 0.5;
    cursor: default;
  }

  .browser-address-form {
    position: relative;
    display: flex;
    flex: 1;
    align-items: center;
    min-width: 0;
    margin: 0 4px;
  }

  .browser-lock {
    position: absolute;
    left: 12px;
    display: inline-flex;
    color: var(--dpk-ink-faint);
    pointer-events: none;
  }

  .browser-lock svg {
    width: 13px;
    height: 13px;
  }

  .browser-address {
    width: 100%;
    min-width: 0;
    height: 30px;
    padding: 0 14px 0 33px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
    font: 13px/1 var(--dpk-body);
    text-overflow: ellipsis;
    transition:
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }

  .browser-address:hover {
    background: var(--dpk-paper-inset);
  }

  .browser-address:focus {
    outline: none;
    border-color: var(--dpk-blue);
    background: var(--browser-bar);
    box-shadow: 0 0 0 1px var(--dpk-blue);
  }

  .browser-profile {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 6px;
    max-width: 160px;
    height: 28px;
    padding: 0 10px 0 3px;
    border-radius: 999px;
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue-strong, var(--dpk-blue));
    font-size: 12px;
    font-weight: 600;
  }

  .browser-avatar {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--dpk-blue);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }

  .browser-profile-name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* The bar a reload draws under the toolbar while the page comes back. */
  .browser-progress {
    position: relative;
    height: 2px;
    margin-top: -2px;
    overflow: hidden;
    pointer-events: none;
  }

  .browser[data-loading] .browser-progress::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--dpk-blue);
    transform-origin: left;
    animation: dpk-browser-load 360ms var(--dpk-ease) forwards;
  }

  @keyframes dpk-browser-load {
    from {
      transform: scaleX(0.08);
    }
    to {
      transform: scaleX(1);
    }
  }

  .browser-page {
    transition: opacity 160ms var(--dpk-ease);
  }

  .browser[data-loading] .browser-page {
    opacity: 0.45;
  }

  /* The new tab page: the pages of the app the reader is in, as tiles. */
  .browser-newtab {
    display: grid;
    flex: 1;
    align-content: start;
    justify-items: center;
    gap: 18px;
    padding: 72px 24px 40px;
    background: #f8f9fb;
    color: #3c4250;
  }

  .browser-newtab-label {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #6b7282;
  }

  .browser-shortcuts {
    display: grid;
    grid-template-columns: repeat(auto-fill, 112px);
    justify-content: center;
    gap: 8px;
    width: min(100%, 600px);
  }

  .browser-shortcut {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 14px 8px 12px;
    border-radius: 12px;
    color: inherit;
    text-align: center;
    text-decoration: none;
    transition: background 140ms var(--dpk-ease);
  }

  .browser-shortcut:hover,
  .browser-shortcut:focus-visible {
    outline: none;
    background: #eceef2;
  }

  .browser-shortcut-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #e3e7ee;
    color: #3563d9;
    font-size: 17px;
    font-weight: 700;
  }

  .browser-shortcut-title,
  .browser-shortcut-url {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .browser-shortcut-title {
    font-size: 12.5px;
    font-weight: 600;
  }

  .browser-shortcut-url {
    font-size: 10.5px;
    color: #8a91a0;
  }

  .browser-unreachable {
    display: grid;
    flex: 1;
    align-content: start;
    gap: 10px;
    padding: 88px max(24px, 12%) 40px;
    background: #fff;
    color: #3c4250;
  }

  .browser-unreachable::before {
    content: '';
    width: 40px;
    height: 40px;
    margin-bottom: 8px;
    border-radius: 10px;
    background:
      linear-gradient(135deg, transparent 46%, #9aa1ae 46% 54%, transparent 54%),
      linear-gradient(45deg, transparent 46%, #9aa1ae 46% 54%, transparent 54%), #eceef2;
  }

  .browser-unreachable h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1f2430;
  }

  .browser-unreachable p {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.6;
  }

  .browser-unreachable code {
    justify-self: start;
    max-width: 100%;
    overflow-wrap: anywhere;
    font-family: var(--dpk-mono);
    font-size: 12px;
    color: #6b7282;
  }

  /*
   * A phone browser: the address and the avatar on top, the controls and the
   * tab count in a bar under the page, the tabs as cards over the page.
   */
  .browser[data-viewport='mobile'] .browser-toolbar {
    gap: 8px;
    padding: 8px 10px;
  }

  .browser[data-viewport='mobile'] .browser-profile {
    padding-right: 3px;
  }

  .browser[data-viewport='mobile'] .browser-shortcuts {
    grid-template-columns: repeat(auto-fill, 96px);
  }

  .browser-bottom {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 6px 8px 10px;
    border-top: 1px solid var(--dpk-rule);
    background: var(--browser-bar);
  }

  .browser-bottom .browser-new-tab {
    width: 30px;
    height: 30px;
    margin: 0;
  }

  .browser-tab-count-box {
    display: inline-grid;
    place-items: center;
    min-width: 17px;
    height: 17px;
    padding: 0 3px;
    border: 1.5px solid currentColor;
    border-radius: 4px;
    font: 700 10px/1 var(--dpk-body);
  }

  .browser-tab-count[aria-expanded='true'] {
    background: color-mix(in srgb, var(--dpk-ink) 9%, transparent);
    color: var(--dpk-ink);
  }

  .browser-switcher {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-content: start;
    gap: 10px;
    padding: 12px;
    color-scheme: normal;
    background: var(--browser-band);
    overflow: auto;
  }

  .browser-card {
    position: relative;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 12px;
    background: var(--browser-bar);
    box-shadow: var(--dpk-shadow);
  }

  .browser-card[aria-current='true'] {
    border-color: var(--dpk-blue);
    box-shadow: 0 0 0 1px var(--dpk-blue);
  }

  .browser-card-open {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 4px 6px;
    width: 100%;
    min-height: 84px;
    padding: 10px 30px 10px 10px;
    border: 0;
    border-radius: inherit;
    background: transparent;
    color: var(--dpk-ink);
    font: 600 12px/1.3 var(--dpk-body);
    text-align: left;
    align-content: start;
    cursor: pointer;
  }

  .browser-card-open:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .browser-card-title,
  .browser-card-url {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .browser-card-url {
    grid-column: 1 / -1;
    color: var(--dpk-ink-faint);
    font: 400 11px/1.3 var(--dpk-mono);
  }

  .browser-card .browser-tab-close {
    position: absolute;
    top: 8px;
    right: 8px;
  }
`;
