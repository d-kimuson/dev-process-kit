/**
 * The map's statuses, labels and members, as the settings dialog shows them:
 * one self-styled element per dialog section.
 *
 * The dialog is drawn by the element that owns the page's chrome — `<dpk-app>`
 * for a page inside it — in *that* element's shadow root, where this view's own
 * page CSS does not reach (the dialog only puts a `.dpk-dialog-section` frame
 * around whatever a section renders). So a section renders inside an element
 * that carries its own shadow root, its own copy of the overview CSS and its own
 * popup state: that is what makes it look and behave the same in the app's
 * dialog and in this view's own (see `SettingsSection` in
 * `core/shell/contracts.ts`).
 *
 * Internal to the USM view: registered by the `usm` entry, not exported from
 * `components.js` — a page's settings section is not a public component.
 */
import { css, LitElement, nothing, type CSSResultGroup, type PropertyDeclarations, type TemplateResult } from 'lit';

import type { Locale } from '../../../core/i18n';
import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { UsmState } from '../model';

import { controlAtom } from '../../../components/atoms/controls';
import { PopoverController } from '../../../core/popover-controller';
import { popoverSurface, tokens } from '../../../core/theme';
import { presentLabelOverview } from '../label-overview';
import { presentMemberOverview } from '../member-overview';
import { usmMessages } from '../messages';
import { renderLabelOverview } from '../render/label-overview';
import { renderMemberOverview } from '../render/member-overview';
import { renderStatusOverview, type IconMenu } from '../render/status-overview';
import { statusStyles } from '../render/tone';
import { presentStatusOverview } from '../status-overview';

/** The three overviews the map's settings show, each its own section of the dialog. */
export type UsmSettingsSectionKind = 'statuses' | 'labels' | 'members';

const ICON_MENU_SIZE = { width: 228, height: 116 };

/**
 * The overview's own look, which used to live in the view's page CSS and is
 * re-homed here because the section is rendered outside that page's shadow
 * root. The rows wrap rather than using the page's one line of columns: the
 * panel is narrower than the page, and scrolling the dialog sideways would be
 * the wrong answer.
 */
export const settingsSectionStyles = css`
  :host {
    display: block;
  }

  .st-overview {
    display: grid;
    gap: 20px;
    max-width: none;
    padding: 0;
  }

  /* The panel already is a frame: the list itself draws none. */
  .st-list {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 0;
    background: none;
    box-shadow: none;
  }

  .st-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 10px 0;
  }

  .st-row + .st-row {
    border-top: 1px solid var(--dpk-rule);
  }

  .st-name {
    flex: 1 1 120px;
    min-width: 0;
    font-size: 14px;
    font-weight: 650;
  }

  .st-share {
    flex: 1 1 140px;
    display: grid;
    gap: 5px;
  }

  .st-share-text {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .st-meter {
    height: 5px;
    border-radius: 3px;
    background: var(--dpk-paper-sunken);
    overflow: hidden;
  }

  .st-meter > span {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--usm-tone);
  }

  .st-done {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--dpk-ink-faint);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition: color 140ms var(--dpk-ease);
  }

  .st-done:hover,
  .st-done:has(:checked) {
    color: var(--dpk-ink);
  }

  .st-done input {
    margin: 0;
    accent-color: var(--usm-tone);
    cursor: inherit;
  }

  .st-tones {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .st-tone {
    width: 18px;
    height: 18px;
    padding: 0;
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 50%;
    background: var(--usm-tone);
    box-shadow: 0 0 0 1px var(--dpk-rule-strong);
    cursor: pointer;
    transition: box-shadow 150ms ease;
  }

  .st-tone:hover {
    box-shadow: 0 0 0 1px var(--usm-tone);
  }

  .st-tone[aria-checked='true'] {
    box-shadow: 0 0 0 2px var(--usm-tone);
  }

  .st-tone:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  /* A status's own icon opens the menu of icons. */
  .st-icon-trigger {
    display: inline-grid;
    place-items: center;
    width: 30px;
    height: 30px;
    margin: -7px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    cursor: pointer;
    transition:
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }

  .st-icon-trigger:hover,
  .st-icon-trigger[aria-expanded='true'] {
    border-color: var(--dpk-rule-strong);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
  }

  .st-icon-trigger:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .comment-pop.icon-menu {
    grid-template-columns: repeat(5, 36px);
    gap: 4px;
    padding: 8px;
  }

  .icon-option {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    cursor: pointer;
  }

  .icon-option .status-icon {
    width: 18px;
    height: 18px;
  }

  .icon-option:hover,
  .icon-option:focus-visible {
    outline: none;
    background: var(--dpk-paper-inset);
  }

  .icon-option[aria-checked='true'] {
    border-color: color-mix(in oklab, var(--usm-tone) 55%, transparent);
    background: color-mix(in oklab, var(--usm-tone) 12%, transparent);
  }

  /* A label's color, where a status shows its icon. */
  .label-swatch {
    width: 12px;
    height: 12px;
    border-radius: 4px;
    background: var(--usm-tone);
  }

  /* A member's initial in their color, where a label shows its swatch. */
  .member-avatar {
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--usm-tone);
    color: var(--dpk-paper-raised);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
  }

  /* The tools stay at the end of whatever line the row's content ends on. */
  .st-tools {
    display: inline-flex;
    gap: 2px;
    margin-left: auto;
  }

  .st-tools .dpk-icon-btn {
    width: 26px;
    height: 26px;
    font-size: 13px;
  }

  /* The same empty state the map's pages use, repeated here because a section
     does not inherit the page's CSS (see the file header). */
  .empty {
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    padding: 28px 24px;
    background: var(--dpk-dots), var(--dpk-paper-sunken);
    max-width: 620px;
    display: grid;
    gap: 10px;
  }
`;

/**
 * One section of the map's settings. `context` is the view's render context of
 * the moment (it dispatches the section's edits into the page's draft), so the
 * element is re-pointed on every render of the host rather than growing state
 * of its own about the map.
 */
export class DpkInternalUsmSettingsSection extends LitElement {
  static override styles: CSSResultGroup = [tokens, controlAtom, statusStyles, popoverSurface, settingsSectionStyles];

  static override properties: PropertyDeclarations = {
    kind: { type: String },
    locale: { type: String },
    context: { attribute: false },
  };

  declare kind: UsmSettingsSectionKind | null;
  declare locale: Locale | null;
  declare context: ViewRenderContext<UsmState> | null;
  /** The status whose icon menu is open: this section's own viewing state. */
  #openIcon: string | null = null;
  readonly #popovers = new PopoverController(this);

  protected override render(): TemplateResult | typeof nothing {
    const context = this.context;
    if (context === null) return nothing;
    const m = usmMessages(this.locale ?? 'ja');
    const state = context.state;
    if (this.kind === 'labels') return renderLabelOverview(m, context, presentLabelOverview(state));
    if (this.kind === 'members') return renderMemberOverview(m, context, presentMemberOverview(state));
    const iconMenu: IconMenu = {
      openFor: this.#openIcon,
      toggle: (statusId) => {
        this.#openIcon = this.#openIcon === statusId ? null : statusId;
        this.requestUpdate();
      },
      close: () => {
        this.#openIcon = null;
        this.requestUpdate();
      },
    };
    return renderStatusOverview(m, context, presentStatusOverview(state), iconMenu);
  }

  /** The icon menu is a popover hung off the icon that opened it, inside this section. */
  protected override updated(): void {
    const menu = this.renderRoot.querySelector<HTMLElement>('#icon-menu');
    const trigger =
      this.#openIcon === null
        ? null
        : this.renderRoot.querySelector(`[data-icon-trigger="${CSS.escape(this.#openIcon)}"]`);
    if (menu === null || trigger === null) return;
    this.#popovers.open(menu, trigger, ICON_MENU_SIZE);
  }
}

export const defineInternalUsmSettingsSection = (): void => {
  if (!customElements.get('dpk-internal-usm-settings-section'))
    customElements.define('dpk-internal-usm-settings-section', DpkInternalUsmSettingsSection);
};
