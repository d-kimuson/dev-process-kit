/**
 * The effects behind the header's language select: the reader's persisted pick,
 * and the `lang` it puts on the template so every nested element follows. The
 * decision itself is the pure `resolveLocale` / `pickedPreference`.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import { closestLang } from '../../lib/dom/lang';
import { LOCALE_CHANGE_EVENT, matchLocale, parseLocale, pickedPreference, resolveLocale, type Locale } from '../i18n';

/** One key for every page of the origin, like the color scheme: the pick is the reader's, not the page's. */
const STORAGE_KEY = 'dev-process-kit:locale';

export class LocaleChoiceController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #persist: () => boolean;
  readonly #onChange: () => void;
  #store: JsonStore<Locale> | null = null;
  #preference: Locale | null = null;
  /** The host's own `lang` as the author wrote it; captured before the pick replaces it. */
  #ownLang: string | null | undefined;
  #resolved: Locale | undefined;

  /**
   * `persist` is read on first connect, like the color scheme's. `onChange`
   * runs whenever the resolved locale changes, before the host re-renders.
   */
  constructor(host: ReactiveControllerHost & HTMLElement, persist: () => boolean, onChange: () => void) {
    this.#host = host;
    this.#persist = persist;
    this.#onChange = onChange;
    host.addController(this);
  }

  /** The page's language: the host's own `lang`, else the closest one above it. */
  get authored(): Locale {
    if (this.#ownLang === undefined) return matchLocale(closestLang(this.#host));
    const parent = this.#host.parentNode;
    return matchLocale(this.#ownLang ?? (parent === null ? null : closestLang(parent)));
  }

  /** Resolved on connect and on each pick; computed on the spot before the first connect. */
  get locale(): Locale {
    return this.#resolved ?? this.#resolve();
  }

  #resolve(): Locale {
    return resolveLocale({ preference: this.#preference, authored: this.authored });
  }

  hostConnected(): void {
    if (this.#store === null) {
      this.#store = this.#persist() ? defaultJsonStore(parseLocale) : memoryJsonStore(parseLocale);
      this.#preference = this.#store.read(STORAGE_KEY);
    }
    this.#ownLang ??= this.#host.getAttribute('lang');
    this.#apply();
  }

  pick(locale: Locale): void {
    this.#preference = pickedPreference(locale, this.authored);
    if (this.#preference === null) this.#store?.remove(STORAGE_KEY);
    else this.#store?.write(STORAGE_KEY, this.#preference);
    this.#apply();
    this.#host.requestUpdate();
  }

  /**
   * The pick lives in the host's `lang`, the attribute every nested element
   * already resolves through; following the page again restores the author's.
   */
  #apply(): void {
    const lang = this.#preference ?? this.#ownLang ?? null;
    if (lang === null) this.#host.removeAttribute('lang');
    else if (this.#host.getAttribute('lang') !== lang) this.#host.setAttribute('lang', lang);
    const next = this.#resolve();
    if (next === this.#resolved) return;
    const first = this.#resolved === undefined;
    this.#resolved = next;
    this.#onChange();
    // Elements that connected before the pick was applied render again.
    if (!first || this.#preference !== null) document.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }
}
