/**
 * Whether the page is on a phone-width screen: there, the shell slides its
 * sidebar over the main column instead of setting it beside it.
 *
 * The width matches the `max-width: 760px` media queries in the shell styles.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

const NARROW_QUERY = '(max-width: 760px)';

const narrowQuery = (): MediaQueryList | null => (typeof matchMedia === 'function' ? matchMedia(NARROW_QUERY) : null);

export class NarrowScreenController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  #query: MediaQueryList | null = null;
  #narrow = false;

  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  hostConnected(): void {
    this.#query = narrowQuery();
    this.#narrow = this.#query?.matches === true;
    this.#query?.addEventListener('change', this.#onChange);
  }

  hostDisconnected(): void {
    this.#query?.removeEventListener('change', this.#onChange);
    this.#query = null;
  }

  get narrow(): boolean {
    return this.#narrow;
  }

  readonly #onChange = (event: MediaQueryListEvent): void => {
    this.#narrow = event.matches;
    this.#host.requestUpdate();
  };
}
