/**
 * The page's settings in the shell header: a gear among the header actions
 * and, while it is open, the menu of the template's switches. What the
 * switches are is the template's (`TemplateDefinition.settings`); flipping one
 * dispatches the change it names, so the agent sees it in the draft.
 */
import { html, nothing, type TemplateResult } from 'lit';

import type { CoreMessages } from '../messages';
import type { ActionInput, TemplateSetting, TemplateSettings } from '../types';

import { iconCheck, iconSettings } from '../icons';

export const SETTINGS_ID = 'dpk-settings';

/** As wide as a switch's hint reads in two or three lines. */
export const SETTINGS_SIZE = { width: 320, height: 420 } as const;

export type SettingsIntents = {
  readonly toggle: () => void;
  readonly flip: (input: ActionInput) => void;
};

export const renderSettingsTrigger = (open: boolean, m: CoreMessages, on: SettingsIntents): TemplateResult =>
  html`<button
    class="dpk-header-action dpk-settings-trigger"
    type="button"
    aria-controls=${SETTINGS_ID}
    aria-haspopup="menu"
    aria-expanded=${open ? 'true' : 'false'}
    aria-label=${m.settings}
    data-tooltip=${m.settings}
    @click=${on.toggle}
  >
    ${iconSettings()}
  </button>`;

/** Rendered only while open; it stays open for the next switch. */
export const renderSettingsMenu = (settings: TemplateSettings, m: CoreMessages, on: SettingsIntents): TemplateResult =>
  html`<div id=${SETTINGS_ID} class="dpk-settings" popover="manual" role="menu" aria-label=${m.settings}>
    ${settings.items.map((item) => renderOption(item, on))}
    ${settings.note === undefined ? nothing : html`<p class="dpk-settings-note">${settings.note}</p>`}
  </div>`;

const renderOption = (item: TemplateSetting, on: SettingsIntents): TemplateResult =>
  html`<button
    class="dpk-settings-option"
    type="button"
    role="menuitemcheckbox"
    data-setting=${item.key}
    aria-checked=${item.on ? 'true' : 'false'}
    @click=${() => on.flip(item.toggle)}
  >
    <span class="dpk-settings-check" aria-hidden="true">${item.on ? iconCheck() : nothing}</span>
    <span class="dpk-settings-text">
      <span class="dpk-settings-name">${item.label}</span>
      ${item.hint === undefined ? nothing : html`<span class="dpk-settings-hint">${item.hint}</span>`}
    </span>
  </button>`;
