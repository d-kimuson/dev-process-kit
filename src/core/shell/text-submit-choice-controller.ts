/**
 * The effects behind the settings' "save text with" choice: the
 * reader's persisted pick, applied to the whole page (`../text-submit-controller.ts`).
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import { DEFAULT_TEXT_SUBMIT_KEY, parseTextSubmitKey, type TextSubmitKey } from '../text-submit';
import { setPageTextSubmitKey } from '../text-submit-controller';

/** One key for every page of the origin, like the color scheme: the pick is the reader's habit, not the page's. */
const STORAGE_KEY = 'dev-process-kit:text-submit-key';

export class TextSubmitChoiceController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #persist: () => boolean;
  readonly #active: () => boolean;
  #store: JsonStore<TextSubmitKey> | null = null;

  /**
   * `persist` is read on first connect, like the color scheme's. `active` is
   * `false` for a board: the page that owns it reads and writes the choice, so
   * the board never touches the shared storage key.
   */
  constructor(host: ReactiveControllerHost, persist: () => boolean, active: () => boolean) {
    this.#host = host;
    this.#persist = persist;
    this.#active = active;
    host.addController(this);
  }

  hostConnected(): void {
    if (!this.#active() || this.#store !== null) return;
    this.#store = this.#persist() ? defaultJsonStore(parseTextSubmitKey) : memoryJsonStore(parseTextSubmitKey);
    const stored = this.#store.read(STORAGE_KEY);
    if (stored !== null) setPageTextSubmitKey(stored);
  }

  pick(key: TextSubmitKey): void {
    if (!this.#active()) return;
    // Picking the default stores nothing, so the reader follows the kit's default again.
    if (key === DEFAULT_TEXT_SUBMIT_KEY) this.#store?.remove(STORAGE_KEY);
    else this.#store?.write(STORAGE_KEY, key);
    setPageTextSubmitKey(key);
    this.#host.requestUpdate();
  }
}
