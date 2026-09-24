/**
 * The effects behind a template's color scheme: the reader's persisted toggle,
 * and the environment it follows otherwise. The decision itself is the pure
 * `resolveColorScheme` / `toggledPreference`.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import {
  parseColorScheme,
  resolveColorScheme,
  toggledPreference,
  type ColorScheme,
  type ColorSchemeSources,
} from '../color-scheme';

/** One key for every page of the origin: the toggle is the reader's taste, not the page's. */
const STORAGE_KEY = 'dev-process-kit:color-scheme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const darkQuery = (): MediaQueryList | null => (typeof matchMedia === 'function' ? matchMedia(DARK_QUERY) : null);

/**
 * A page-level `<html data-theme="light|dark">` stamp wins over the OS
 * preference: that is how a host such as the Claude Artifact viewer passes its
 * reader's explicit choice down to the page.
 */
const readEnvironment = (): ColorScheme =>
  parseColorScheme(document.documentElement.dataset['theme']) ?? (darkQuery()?.matches === true ? 'dark' : 'light');

export class ColorSchemeController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #persist: () => boolean;
  #store: JsonStore<ColorScheme> | null = null;
  #preference: ColorScheme | null = null;
  #environment: ColorScheme = 'light';
  #query: MediaQueryList | null = null;
  #observer: MutationObserver | null = null;

  /**
   * `persist` is read on first connect, once the host's attributes are known:
   * `storage="off"` / `"memory"` keeps the toggle to this page load.
   */
  constructor(host: ReactiveControllerHost, persist: () => boolean) {
    this.#host = host;
    this.#persist = persist;
    host.addController(this);
  }

  hostConnected(): void {
    if (this.#store === null) {
      this.#store = this.#persist() ? defaultJsonStore(parseColorScheme) : memoryJsonStore(parseColorScheme);
      this.#preference = this.#store.read(STORAGE_KEY);
    }
    this.#environment = readEnvironment();
    this.#query = darkQuery();
    this.#query?.addEventListener('change', this.#onEnvironment);
    this.#observer = new MutationObserver(this.#onEnvironment);
    this.#observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  hostDisconnected(): void {
    this.#query?.removeEventListener('change', this.#onEnvironment);
    this.#query = null;
    this.#observer?.disconnect();
    this.#observer = null;
  }

  resolve(authored: ColorScheme | null): ColorScheme {
    return resolveColorScheme(this.#sources(authored));
  }

  toggle(authored: ColorScheme | null): void {
    this.#preference = toggledPreference(this.#sources(authored));
    if (this.#preference === null) this.#store?.remove(STORAGE_KEY);
    else this.#store?.write(STORAGE_KEY, this.#preference);
    this.#host.requestUpdate();
  }

  #sources(authored: ColorScheme | null): ColorSchemeSources {
    return { preference: this.#preference, authored, environment: this.#environment };
  }

  #onEnvironment = (): void => {
    const next = readEnvironment();
    if (next === this.#environment) return;
    this.#environment = next;
    this.#host.requestUpdate();
  };
}
