/**
 * `<dpk-internal-layout-settings>`: the side panel's `settings` section. One
 * section shows at a time; the nav that switches between them is drawn only
 * when a second one exists. Ids are unique: the first section with an id
 * wins, so the kit's own keep theirs even when a template reuses one.
 *
 * The panel draws it in its own shadow root, where the chrome's styles do not
 * reach: it carries the rows' styles itself, and owns its language picker.
 */
import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { BoundSettingsSection } from '../../shell/contracts';
import type { ActionInput, ViewSetting } from '../../types';

import { LOCALES, type Locale } from '../../i18n';
import { iconCheck } from '../../icons';
import { coreMessages, LANGUAGE_NAMES, type CoreMessages } from '../../messages';
import { SelectController } from '../../select/controller';
import {
  SETTINGS_APPEARANCE_SECTION,
  SETTINGS_DISPLAY_SECTION,
  type SettingsAppearance,
  type SettingsSwitches,
} from '../../shell/settings-panel';
import { settingsOptionStyles } from '../../shell/styles';
import { controls, tokens } from '../../theme';

/** The first section of each id, in the order given. */
const uniqueSections = (sections: readonly BoundSettingsSection[]): readonly BoundSettingsSection[] => {
  const seen = new Set<string>();
  return sections.filter((section) => {
    if (seen.has(section.id)) return false;
    seen.add(section.id);
    return true;
  });
};

const step = <T>(values: readonly T[], current: T, delta: number): T => {
  const index = values.indexOf(current);
  return values[(index + delta + values.length) % values.length] ?? current;
};

export class DpkInternalLayoutSettings extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    controls,
    settingsOptionStyles,
    css`
      :host {
        display: grid;
        gap: 12px;
        color: var(--dpk-ink);
      }

      .nav {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
      }

      .nav-item {
        flex: none;
        padding: 5px 10px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--dpk-ink-soft);
        font: inherit;
        font-size: 12px;
        font-weight: 550;
        white-space: nowrap;
        cursor: pointer;
        transition:
          background var(--dpk-dur-fast) var(--dpk-ease),
          color var(--dpk-dur-fast) var(--dpk-ease);
      }

      .nav-item:hover {
        background: var(--dpk-paper-sunken);
        color: var(--dpk-ink);
      }

      .nav-item[aria-current='true'] {
        background: var(--dpk-accent-soft);
        color: var(--dpk-accent-strong);
      }

      .nav-item:focus-visible {
        outline: none;
        box-shadow: var(--dpk-focus);
      }

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
    `,
  ];

  static override properties = {
    locale: { attribute: false },
    display: { attribute: false },
    appearance: { attribute: false },
    sections: { attribute: false },
    active: { attribute: false },
    onPick: { attribute: false },
  };

  declare locale: Locale;
  /** The template's switches; `null` when it has none, and then there is no `display` section. */
  declare display: SettingsSwitches | null;
  declare appearance: SettingsAppearance | null;
  /** The template's own sections, after the kit's. */
  declare sections: readonly BoundSettingsSection[];
  /** The id of the section shown; one not offered falls back to the first. */
  declare active: string;
  declare onPick: ((id: string) => void) | null;

  readonly #langSelect = new SelectController(this);
  /** A radio picked from the arrow keys, which takes the focus once it shows as picked. */
  #focusChoice: string | null = null;

  constructor() {
    super();
    this.locale = 'en';
    this.display = null;
    this.appearance = null;
    this.sections = [];
    this.active = SETTINGS_DISPLAY_SECTION;
    this.onPick = null;
  }

  protected override render(): TemplateResult {
    const m = coreMessages(this.locale);
    const display = this.display;
    const sections = uniqueSections([
      ...(display === null
        ? []
        : [{ id: SETTINGS_DISPLAY_SECTION, label: m.settingsDisplay, render: () => this.#renderSwitches(display) }]),
      { id: SETTINGS_APPEARANCE_SECTION, label: m.settingsGeneral, render: () => this.#renderAppearance(m) },
      ...this.sections,
    ]);
    const shown = sections.find((section) => section.id === this.active) ?? sections[0];
    return html`${
      sections.length < 2
        ? nothing
        : html`<nav class="nav" aria-label=${m.settingsSections}>
            ${sections.map(
              (section) => html`<button
                class="nav-item"
                type="button"
                data-section=${section.id}
                aria-current=${section === shown ? 'true' : 'false'}
                @click=${() => this.onPick?.(section.id)}
              >
                ${section.label}
              </button>`,
            )}
          </nav>`
    }
    ${shown === undefined ? nothing : html`<section data-settings-section=${shown.id}>${shown.render()}</section>`}`;
  }

  protected override updated(): void {
    if (this.#focusChoice === null) return;
    const choice = this.renderRoot.querySelector<HTMLElement>(`${this.#focusChoice}[aria-checked="true"]`);
    if (choice === null) return;
    this.#focusChoice = null;
    choice.focus();
  }

  #renderSwitches({ settings, flip }: SettingsSwitches): TemplateResult {
    const m = coreMessages(this.locale);
    return html`<div class="dpk-settings-list" role="group" aria-label=${m.settings}>
        ${settings.items.map((item) => this.#renderSwitch(item, flip))}
      </div>
      ${settings.note === undefined ? nothing : html`<p class="dpk-settings-note">${settings.note}</p>`}`;
  }

  #renderSwitch(item: ViewSetting, flip: (input: ActionInput) => void): TemplateResult {
    return html`<button
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
  }

  #renderAppearance(m: CoreMessages): TemplateResult | typeof nothing {
    const appearance = this.appearance;
    if (appearance === null) return nothing;
    const schemes = [
      { value: 'light', label: m.themeLight },
      { value: 'dark', label: m.themeDark },
    ] as const;
    return html`<div class="dpk-settings-list">
      <div class="dpk-settings-row">
        <span class="dpk-settings-row-label">${m.language}</span>
        ${this.#langSelect.render({
          options: LOCALES.map((candidate) => ({ value: candidate, label: LANGUAGE_NAMES[candidate] })),
          value: this.locale,
          onChange: (value) => {
            const picked = LOCALES.find((candidate) => candidate === value);
            if (picked !== undefined) appearance.pickLocale(picked);
          },
          ariaLabel: m.language,
          className: 'dpk-lang-select',
        })}
      </div>
      ${this.#renderChoice({
        label: m.settingsTheme,
        attribute: 'data-theme-choice',
        choices: schemes,
        current: appearance.scheme,
        pick: appearance.pickScheme,
      })}
      ${this.#renderChoice({
        label: m.settingsTextSubmit,
        attribute: 'data-text-submit-choice',
        choices: appearance.textSubmitKeys.map((key) => ({ value: key, label: appearance.textSubmitLabel(key) })),
        current: appearance.textSubmit,
        pick: appearance.pickTextSubmit,
        wrap: true,
      })}
    </div>`;
  }

  /** One row: a radio group of choices, the arrow keys moving the pick and the focus with it. */
  #renderChoice<T extends string>(options: {
    readonly label: string;
    readonly attribute: 'data-theme-choice' | 'data-text-submit-choice';
    readonly choices: readonly { readonly value: T; readonly label: string }[];
    readonly current: T;
    readonly pick: (value: T) => void;
    readonly wrap?: boolean;
  }): TemplateResult {
    const values = options.choices.map((choice) => choice.value);
    return html`<div class=${options.wrap === true ? 'dpk-settings-row dpk-settings-row--wrap' : 'dpk-settings-row'}>
      <span class="dpk-settings-row-label">${options.label}</span>
      <div
        class="dpk-settings-segment"
        role="radiogroup"
        aria-label=${options.label}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          this.#focusChoice = `[${options.attribute}]`;
          options.pick(step(values, options.current, event.key === 'ArrowRight' ? 1 : -1));
        }}
      >
        ${options.choices.map(
          (choice) => html`<button
            type="button"
            role="radio"
            aria-checked=${choice.value === options.current ? 'true' : 'false'}
            tabindex=${choice.value === options.current ? '0' : '-1'}
            data-theme-choice=${options.attribute === 'data-theme-choice' ? choice.value : nothing}
            data-text-submit-choice=${options.attribute === 'data-text-submit-choice' ? choice.value : nothing}
            @click=${() => options.pick(choice.value)}
          >
            ${choice.label}
          </button>`,
        )}
      </div>
    </div>`;
  }
}

export const defineLayoutSettings = (): void => {
  if (!customElements.get('dpk-internal-layout-settings'))
    customElements.define('dpk-internal-layout-settings', DpkInternalLayoutSettings);
};
