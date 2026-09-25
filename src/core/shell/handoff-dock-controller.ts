/**
 * The effects behind the floating hand-off: the clipboard, the send to Claude
 * and the timer that lets a finished outcome fade back to the button labels.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { HandoffOutcome } from '../claude-handoff';

import { copyText } from '../../lib/dom/clipboard';
import { initialDockState, reduceDock, type DockEvent, type DockState } from '../handoff-dock';

const FLASH_MS = 2400;

export class HandoffDockController implements ReactiveController {
  #state: DockState = initialDockState();
  #timer: ReturnType<typeof setTimeout> | null = null;
  readonly #host: ReactiveControllerHost;

  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  get state(): DockState {
    return this.#state;
  }

  hostDisconnected(): void {
    this.#clearTimer();
  }

  async copy(text: () => string): Promise<void> {
    this.#apply({ kind: 'copy-started' });
    const request = this.#state.request;
    const ok = await copyText(text()).catch(() => false);
    this.#apply({ kind: 'copy-finished', request, ok });
    this.#settleLater(request);
  }

  async send(send: () => Promise<HandoffOutcome>): Promise<void> {
    if (this.#state.status.kind === 'sending') return;
    this.#apply({ kind: 'send-started' });
    const request = this.#state.request;
    const outcome = await send().catch((): HandoffOutcome => ({ ok: false, reason: 'error' }));
    this.#apply({ kind: 'send-finished', request, outcome });
    // A failure says what to do next, so it stays until the reader acts on it.
    if (outcome.ok) this.#settleLater(request);
  }

  #apply(event: DockEvent): void {
    if (event.kind === 'copy-started' || event.kind === 'send-started') this.#clearTimer();
    this.#state = reduceDock(this.#state, event);
    this.#host.requestUpdate();
  }

  #settleLater(request: number): void {
    if (request !== this.#state.request) return;
    this.#clearTimer();
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.#apply({ kind: 'settled', request });
    }, FLASH_MS);
  }

  #clearTimer(): void {
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
  }
}
