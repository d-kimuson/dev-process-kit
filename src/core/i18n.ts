import { closestLang } from '../lib/dom/lang';

/** The languages the kit renders its own text in. */
export const LOCALES = ['en', 'ja'] as const;

export type Locale = (typeof LOCALES)[number];

/** Used when a page declares no language, or one the kit does not ship. */
export const DEFAULT_LOCALE: Locale = 'en';

const isLocale = (value: string): value is Locale => LOCALES.some((locale) => locale === value);

/** Maps a BCP 47 tag to a shipped locale by its primary subtag (`ja-JP` is `ja`). */
export const matchLocale = (tag: string | null | undefined): Locale => {
  const primary = (tag ?? '').split('-')[0]?.toLowerCase() ?? '';
  return isLocale(primary) ? primary : DEFAULT_LOCALE;
};

/** The locale an element renders in: its closest `lang`, crossing shadow roots. */
export const localeOf = (element: Element): Locale => matchLocale(closestLang(element));

/**
 * Fired on `document` when a template's reader switches its language, so every
 * element renders its text again from its closest `lang`.
 */
export const LOCALE_CHANGE_EVENT = 'dpk-locale-change';

export const parseLocale = (value: unknown): Locale | null =>
  typeof value === 'string' && isLocale(value) ? value : null;

export type LocaleSources = {
  /** The reader's pick from the header, or `null` when they follow the page. */
  readonly preference: Locale | null;
  /** The closest `lang` the author wrote. */
  readonly authored: Locale;
};

export const resolveLocale = (sources: LocaleSources): Locale => sources.preference ?? sources.authored;

/** Picking the page's own language stores nothing, so the reader follows the page again. */
export const pickedPreference = (picked: Locale, authored: Locale): Locale | null =>
  picked === authored ? null : picked;

/** A dictionary entry: a fixed label, or a function of the values it quotes. */
export type Message = string | ((...args: never[]) => string);

/** Exact shape equality: a dictionary may neither miss nor add a key. */
type Exactly<T, U> = U & Record<Exclude<keyof U, keyof T>, never>;

/**
 * Declares a module's text in every shipped locale. English defines the keys
 * and signatures; every other locale must match them exactly.
 */
export const defineMessages = <T extends Record<string, Message>, J extends T>(catalog: {
  readonly en: T;
  readonly ja: Exactly<T, J>;
}): ((locale: Locale) => T) => {
  return (locale) => (locale === 'ja' ? catalog.ja : catalog.en);
};
