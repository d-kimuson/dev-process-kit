/**
 * The page's settings: a gear at the end of the header row and, behind it, one
 * modal dialog holding everything the reader can adjust about the page — the
 * template's own switches (`ViewDefinition.settings`), the reader's language,
 * theme and text-submit key, and any section the template renders itself
 * (`ViewElement.renderSettingsSections`).
 *
 * The language and theme controls are the header's, repeated here on purpose:
 * a page whose content has no switches of its own would otherwise open an
 * empty dialog. The general section (id `appearance`) is therefore always
 * there; the template's display section exists only when the template has
 * switches.
 *
 * The trigger and the dialog are separate on purpose: where the gear sits is a
 * layout decision, and opening the dialog is `ViewElement.openSettings()`.
 * Nothing here depends on the trigger's placement.
 *
 * What the dialog itself draws (the `<dialog>`, its head, body and foot) is
 * `../dialog/render.ts`; this module only fills it.
 */
import { css, html, nothing, type TemplateResult } from 'lit';

import type { DialogController } from '../dialog/controller';
import type { CoreMessages } from '../messages';
import type { TextSubmitKey } from '../text-submit';
import type { ActionInput, ViewSetting, ViewSettings } from '../types';
import type { BoundSettingsSection } from './contracts';

import { renderDialogShell } from '../dialog/render';
import { iconCheck, iconSettings } from '../icons';

/** The `<dialog>`'s own id, so the gear can point `aria-controls` at it. */
export const SETTINGS_ID = 'dpk-settings';
/**
 * The kit's own section for the template's switches. Present only when the
 * template has switches, and then the one the dialog opens on.
 */
export const SETTINGS_DISPLAY_SECTION = 'display';
/**
 * The kit's own section for the reader's habits: language, light/dark and the
 * key that saves a multi-line text field. Shown as "General". It is always
 * there, so a page with nothing else to configure opens something real.
 */
export const SETTINGS_APPEARANCE_SECTION = 'appearance';

export type SettingsTriggerIntents = {
  readonly open: boolean;
  readonly toggle: () => void;
};

/** The gear. Its `aria-expanded` follows the dialog, wherever the gear is drawn. */
export const renderSettingsTrigger = (m: CoreMessages, on: SettingsTriggerIntents): TemplateResult =>
  html`<button
    class="dpk-chrome-action dpk-settings-trigger"
    type="button"
    aria-controls=${SETTINGS_ID}
    aria-haspopup="dialog"
    aria-expanded=${on.open ? 'true' : 'false'}
    aria-label=${m.settings}
    data-tooltip=${m.settings}
    @click=${on.toggle}
  >
    ${iconSettings()}
  </button>`;

/**
 * The dialog's secondary nav: one button per section, the shown one marked
 * `aria-current`. Drawn only for two sections or more, so a template without
 * any of its own keeps the single panel of settings it always had.
 */
export const renderSettingsNav = (
  sections: readonly BoundSettingsSection[],
  active: string,
  label: string,
  onPick: (id: string) => void,
): TemplateResult | typeof nothing =>
  sections.length < 2
    ? nothing
    : html`<nav class="dpk-dialog-nav" part="nav" aria-label=${label}>
        ${sections.map(
          (section) => html`<button
            class="dpk-dialog-nav-item"
            type="button"
            data-section=${section.id}
            aria-current=${section.id === active ? 'true' : 'false'}
            @click=${() => onPick(section.id)}
          >
            ${section.label}
          </button>`,
        )}
      </nav>`;

export type SettingsDialogOptions = {
  /** The `<dialog>`'s id, which the trigger points `aria-controls` at (`SETTINGS_ID`). */
  readonly id: string;
  /** Whether the dialog is open: the reader's viewing state, not a change of the draft. */
  readonly open: boolean;
  /** The dialog's accessible name and title (the kit's "Settings"). */
  readonly label: string;
  /** The close button's accessible name, in the page's language. */
  readonly closeLabel: string;
  /** The section nav's accessible name, in the page's language. */
  readonly sectionsLabel: string;
  /** Keeps the native `<dialog>` in step with `open`, and owns focus and dismissal. */
  readonly controller: DialogController;
  /**
   * The kit's `display` section first, then the template's own
   * (`ViewElement.renderSettingsSections`). One is shown at a time. Ids are
   * unique: the first section with a given id wins, so the kit's `display`
   * keeps its id even when a template uses it too.
   */
  readonly sections: readonly BoundSettingsSection[];
  /** The id of the section shown; one not in `sections` falls back to the first. */
  readonly activeSection: string;
  readonly onPick: (id: string) => void;
  /** The kit's display rows (the template's switches), built by the host that owns them. */
  readonly display: TemplateResult | typeof nothing;
  /** Drawn as a foot row; without it the panel has none. */
  readonly footer?: unknown;
};

/**
 * The settings panel: the shared dialog shell (`../dialog/render.ts`) filled
 * with one active section and the section nav. Only the shown section's
 * content is built, so an element that is never opened costs no more than the
 * closed dialog's frame.
 */
export const renderSettingsDialog = (options: SettingsDialogOptions): TemplateResult => {
  const sections = uniqueSections(options.sections);
  const shown = sections.find((section) => section.id === options.activeSection) ?? sections[0];
  const active = shown?.id ?? SETTINGS_DISPLAY_SECTION;
  const body = shown === undefined ? nothing : shown.id === SETTINGS_DISPLAY_SECTION ? options.display : shown.render();
  return renderDialogShell({
    id: options.id,
    size: 'md',
    // With more than one section the panel keeps one frame, so switching one never
    // resizes or moves it; with only one there is nothing to switch, and it fits
    // that one (an empty-looking tall panel is what it used to draw).
    fixedHeight: sections.length > 1,
    label: options.label,
    closeLabel: options.closeLabel,
    controller: options.controller,
    nav: renderSettingsNav(sections, active, options.sectionsLabel, options.onPick),
    content: options.open ? body : nothing,
    footer: options.open ? options.footer : undefined,
  });
};

/** The first section of each id, in the order given. */
const uniqueSections = (sections: readonly BoundSettingsSection[]): readonly BoundSettingsSection[] => {
  const seen = new Set<string>();
  const unique: BoundSettingsSection[] = [];
  for (const section of sections) {
    if (seen.has(section.id)) continue;
    seen.add(section.id);
    unique.push(section);
  }
  return unique;
};

/** The template's own switches, and its note under them. */
export const renderSettingsSwitches = (
  settings: ViewSettings,
  m: CoreMessages,
  flip: (input: ActionInput) => void,
): TemplateResult => html`
  <div class="dpk-settings-list" role="group" aria-label=${m.settings}>
    ${settings.items.map((item) => renderSwitch(item, flip))}
  </div>
  ${settings.note === undefined ? nothing : html`<p class="dpk-settings-note">${settings.note}</p>`}
`;

const renderSwitch = (item: ViewSetting, flip: (input: ActionInput) => void): TemplateResult =>
  html`<button
    class="dpk-settings-option"
    type="button"
    role="switch"
    data-setting=${item.key}
    aria-checked=${item.on ? 'true' : 'false'}
    @click=${() => flip(item.toggle)}
  >
    <span class="dpk-settings-check" aria-hidden="true">${item.on ? iconCheck() : nothing}</span>
    <span class="dpk-settings-text">
      <span class="dpk-settings-name">${item.label}</span>
      ${item.hint === undefined ? nothing : html`<span class="dpk-settings-hint">${item.hint}</span>`}
    </span>
  </button>`;

export type TextSubmitChoiceOptions = {
  readonly current: TextSubmitKey;
  readonly keys: readonly TextSubmitKey[];
  /** The key as the reader's keyboard names it. */
  readonly labelOf: (key: TextSubmitKey) => string;
  /** `focus` is set when the pick came from the arrow keys, so the picked option takes the focus. */
  readonly pick: (key: TextSubmitKey, focus: boolean) => void;
};

/** One row: a radio group of the keys that can save a multi-line text field, one choice for the whole page. */
export const renderSettingsTextSubmit = (m: CoreMessages, options: TextSubmitChoiceOptions): TemplateResult => {
  const { current, keys } = options;
  const step = (delta: number): TextSubmitKey => {
    const index = keys.indexOf(current);
    return keys[(index + delta + keys.length) % keys.length] ?? current;
  };
  return html`<div class="dpk-settings-row dpk-settings-row--wrap">
    <span class="dpk-settings-row-label">${m.settingsTextSubmit}</span>
    <div
      class="dpk-settings-segment"
      role="radiogroup"
      aria-label=${m.settingsTextSubmit}
      @keydown=${(event: KeyboardEvent) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        options.pick(step(event.key === 'ArrowRight' ? 1 : -1), true);
      }}
    >
      ${keys.map(
        (key) => html`<button
          type="button"
          role="radio"
          aria-checked=${key === current ? 'true' : 'false'}
          tabindex=${key === current ? '0' : '-1'}
          data-text-submit-choice=${key}
          @click=${() => options.pick(key, false)}
        >
          ${options.labelOf(key)}
        </button>`,
      )}
    </div>
  </div>`;
};

/**
 * The panel's own content styles: the switch list and the appearance rows. The
 * switches reuse `.dpk-settings-option` (the chrome's), and the frame is
 * `../dialog/styles.ts`'s.
 */
export const settingsDialogStyles = css`
  .dpk-settings-list {
    display: grid;
    gap: 2px;
  }

  .dpk-settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 40px;
    padding: 4px 8px;
    border-radius: var(--dpk-radius-sm);
  }

  /* A segment too wide for one row with its label goes under it. */
  .dpk-settings-row--wrap {
    flex-wrap: wrap;
  }

  .dpk-settings-row-label {
    color: var(--dpk-ink);
    font-size: 12px;
  }

  .dpk-settings-row .dpk-rich-select {
    height: 28px;
    padding: 0 8px 0 12px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper);
    color: var(--dpk-ink);
  }

  .dpk-settings-segment {
    display: inline-flex;
    flex: none;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
  }

  .dpk-settings-segment button {
    min-width: 56px;
    padding: 3px 10px;
    border: 0;
    border-radius: 999px;
    background: none;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .dpk-settings-segment button[aria-checked='true'] {
    background: var(--dpk-paper);
    color: var(--dpk-ink);
    box-shadow: var(--dpk-shadow-xs);
  }

  .dpk-settings-segment button:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
`;
