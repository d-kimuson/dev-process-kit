/**
 * The page's settings: a gear at the end of the header row and, behind it, the
 * side panel's `settings` section holding everything the reader can adjust
 * about the page — the template's own switches (`ViewDefinition.settings`),
 * the reader's language, theme and text-submit key, and any section the
 * template renders itself (`ViewElement.renderSettingsSections`).
 *
 * The section is drawn in the panel's shadow root, where the chrome's styles
 * do not reach, so `<dpk-internal-layout-settings>` (`../layouts/settings`)
 * carries its own: the element that owns the chrome hands it what to show and
 * what each control changes.
 *
 * The general section (id `appearance`) is always there, so a page whose
 * content has no switches of its own still opens something real; the
 * template's display section exists only when the template has switches.
 */
import { html, type TemplateResult } from 'lit';

import type { ColorScheme } from '../color-scheme';
import type { Locale } from '../i18n';
import type { CoreMessages } from '../messages';
import type { TextSubmitKey } from '../text-submit';
import type { ActionInput, ViewSettings } from '../types';

import { iconSettings } from '../icons';

/**
 * The kit's own section for the template's switches. Present only when the
 * template has switches, and then the one the settings open on.
 */
export const SETTINGS_DISPLAY_SECTION = 'display';
/**
 * The kit's own section for the reader's habits: language, light/dark and the
 * key that saves a multi-line text field. Shown as "General".
 */
export const SETTINGS_APPEARANCE_SECTION = 'appearance';

/** The template's switches, and the change that flips one, as the `display` section shows them. */
export type SettingsSwitches = {
  readonly settings: ViewSettings;
  readonly flip: (input: ActionInput) => void;
};

/** The reader's habits the `appearance` section shows, and what picking one does. */
export type SettingsAppearance = {
  readonly pickLocale: (locale: Locale) => void;
  readonly scheme: ColorScheme;
  readonly pickScheme: (scheme: ColorScheme) => void;
  readonly textSubmit: TextSubmitKey;
  readonly textSubmitKeys: readonly TextSubmitKey[];
  /** The key as the reader's keyboard names it. */
  readonly textSubmitLabel: (key: TextSubmitKey) => string;
  readonly pickTextSubmit: (key: TextSubmitKey) => void;
};

export type SettingsTriggerIntents = {
  /** Whether the panel shows the settings. */
  readonly open: boolean;
  readonly toggle: () => void;
};

/** The gear. Its `aria-expanded` follows the panel's settings section, wherever the gear is drawn. */
export const renderSettingsTrigger = (m: CoreMessages, on: SettingsTriggerIntents): TemplateResult =>
  html`<button
    class="dpk-chrome-action dpk-settings-trigger"
    type="button"
    aria-expanded=${on.open ? 'true' : 'false'}
    aria-label=${m.settings}
    data-tooltip=${m.settings}
    @click=${on.toggle}
  >
    ${iconSettings()}
  </button>`;
