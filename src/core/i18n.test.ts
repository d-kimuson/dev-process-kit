import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  defineMessages,
  localeOf,
  matchLocale,
  parseLocale,
  pickedPreference,
  resolveLocale,
} from './i18n';

describe('matchLocale', () => {
  it('matches on the primary subtag, case-insensitively', () => {
    expect(matchLocale('ja')).toBe('ja');
    expect(matchLocale('ja-JP')).toBe('ja');
    expect(matchLocale('EN-gb')).toBe('en');
  });

  it('falls back to English for a missing, empty or unsupported language', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(matchLocale(null)).toBe('en');
    expect(matchLocale('')).toBe('en');
    expect(matchLocale('fr')).toBe('en');
  });
});

describe('localeOf', () => {
  it('uses the closest lang, and English when there is none', () => {
    const page = document.createElement('div');
    page.lang = 'ja-JP';
    const element = document.createElement('span');
    page.append(element);
    expect(localeOf(element)).toBe('ja');
    expect(localeOf(document.createElement('span'))).toBe('en');
  });
});

describe("the reader's language choice", () => {
  it('overrides the page language, which applies otherwise', () => {
    expect(resolveLocale({ preference: null, authored: 'ja' })).toBe('ja');
    expect(resolveLocale({ preference: 'en', authored: 'ja' })).toBe('en');
  });

  it('stores nothing when the reader picks the page language', () => {
    expect(pickedPreference('ja', 'ja')).toBeNull();
    expect(pickedPreference('en', 'ja')).toBe('en');
  });

  it('accepts only a shipped locale from storage', () => {
    expect(parseLocale('ja')).toBe('ja');
    expect(parseLocale('ja-JP')).toBeNull();
    expect(parseLocale(1)).toBeNull();
  });
});

describe('defineMessages', () => {
  const messages = defineMessages({
    en: { clear: 'Clear', progress: (done: number, total: number) => `${done} of ${total} answered` },
    ja: { clear: 'クリア', progress: (done: number, total: number) => `回答済み ${done} / ${total}` },
  });

  it('returns the dictionary of a locale', () => {
    expect(messages('en').clear).toBe('Clear');
    expect(messages('ja').progress(1, 3)).toBe('回答済み 1 / 3');
  });

  it('types every locale after the English one', () => {
    expectTypeOf(messages('ja').progress).toEqualTypeOf<(done: number, total: number) => string>();
    defineMessages({
      en: { clear: 'Clear' },
      // @ts-expect-error: a locale must not miss a key.
      ja: {},
    });
    defineMessages({
      en: { clear: 'Clear' },
      // @ts-expect-error: a locale must not add a key.
      ja: { clear: 'クリア', extra: '余分' },
    });
  });
});
