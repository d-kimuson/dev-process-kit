import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { DEFAULT_LOCALE, LOCALE_CHANGE_EVENT, localeOf, type Locale } from './i18n';

/**
 * The locale an element renders its own text in: its closest `lang`, resolved
 * on connect and again whenever a template's reader switches the language.
 */
export class LocaleController implements ReactiveController {
  readonly #host: ReactiveControllerHost & Element;
  readonly #onChange: () => void;
  #locale: Locale = DEFAULT_LOCALE;

  /** `onChange` runs before the host re-renders, to drop what it derived from the old text. */
  constructor(host: ReactiveControllerHost & Element, onChange: () => void = () => {}) {
    this.#host = host;
    this.#onChange = onChange;
    host.addController(this);
  }

  get locale(): Locale {
    return this.#locale;
  }

  hostConnected(): void {
    this.#locale = localeOf(this.#host);
    document.addEventListener(LOCALE_CHANGE_EVENT, this.#refresh);
  }

  hostDisconnected(): void {
    document.removeEventListener(LOCALE_CHANGE_EVENT, this.#refresh);
  }

  #refresh = (): void => {
    const next = localeOf(this.#host);
    if (next === this.#locale) return;
    this.#locale = next;
    this.#onChange();
    this.#host.requestUpdate();
  };
}
