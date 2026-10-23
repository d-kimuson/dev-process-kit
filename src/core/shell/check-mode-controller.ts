/**
 * Check Mode's own state and its storage: entirely local to this reader, kept
 * exactly like the change notices' seen record (`./change-notice-controller.ts`)
 * — never part of a template's state, so it is never in the draft handed back
 * to the agent.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { ChangeLog } from '../changes';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import {
  currentRevisionOf,
  EMPTY_CHECK_STATE,
  parseCheckState,
  statusOf,
  withEnabled,
  withToggled,
  type CheckState,
  type CheckStatus,
} from '../check-mode';

export type CheckModeOptions = {
  readonly persist: () => boolean;
  readonly storageKey: () => string;
  /** The page's change log, so a checked target can be told apart from one changed since. `null` without one. */
  readonly log: () => ChangeLog | null;
};

export class CheckModeController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #options: CheckModeOptions;
  #state: CheckState = EMPTY_CHECK_STATE;
  #store: JsonStore<CheckState> | null = null;

  constructor(host: ReactiveControllerHost & HTMLElement, options: CheckModeOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    this.#store = this.#options.persist() ? defaultJsonStore(parseCheckState) : memoryJsonStore(parseCheckState);
    this.#state = this.#store.read(this.#key()) ?? EMPTY_CHECK_STATE;
  }

  hostDisconnected(): void {}

  get enabled(): boolean {
    return this.#state.enabled;
  }

  /** The raw state, for `check-mode-badges.ts`'s `collectCheckBindings` to read. */
  get state(): CheckState {
    return this.#state;
  }

  /**
   * Turning Check Mode on takes effect at once. Turning it off resets every
   * mark (`withEnabled`), so the caller confirms with the reader first (the
   * shell gates this behind `ConfirmDialogController`) and only calls this
   * once that is agreed.
   */
  setEnabled(enabled: boolean): void {
    if (enabled === this.#state.enabled) return;
    this.#state = withEnabled(this.#state, enabled);
    this.#write();
    this.#host.requestUpdate();
  }

  statusOf(ref: string): CheckStatus {
    return statusOf(this.#state, ref, this.#options.log());
  }

  /** Applies one click on `ref`'s badge: see `withToggled` for what each status becomes. */
  toggle(ref: string): void {
    const status = this.statusOf(ref);
    this.#state = withToggled(this.#state, ref, status, currentRevisionOf(this.#options.log()));
    this.#write();
    this.#host.requestUpdate();
  }

  #key(): string {
    return `${this.#options.storageKey()}:check-mode`;
  }

  #write(): void {
    this.#store?.write(this.#key(), this.#state);
  }
}
