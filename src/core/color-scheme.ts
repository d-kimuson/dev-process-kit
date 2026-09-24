/**
 * Which palette a template renders with.
 *
 * Three sources decide it, strongest first: the reader's own choice from the
 * header toggle (persisted per browser), the author's `theme` attribute, and the
 * environment (the page's `<html data-theme>`, then the OS preference).
 */
export type ColorScheme = 'light' | 'dark';

export type ColorSchemeSources = {
  /** The reader's toggle, or `null` when they have not overridden the default. */
  readonly preference: ColorScheme | null;
  /** The template element's `theme` attribute. */
  readonly authored: ColorScheme | null;
  readonly environment: ColorScheme;
};

export const parseColorScheme = (value: unknown): ColorScheme | null =>
  value === 'light' || value === 'dark' ? value : null;

const defaultScheme = (sources: ColorSchemeSources): ColorScheme => sources.authored ?? sources.environment;

export const resolveColorScheme = (sources: ColorSchemeSources): ColorScheme =>
  sources.preference ?? defaultScheme(sources);

/**
 * The preference after one press of the toggle. Landing on the default stores
 * nothing, so a reader who toggles twice follows the environment again.
 */
export const toggledPreference = (sources: ColorSchemeSources): ColorScheme | null => {
  const next: ColorScheme = resolveColorScheme(sources) === 'dark' ? 'light' : 'dark';
  return next === defaultScheme(sources) ? null : next;
};
