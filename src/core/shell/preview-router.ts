import { elementOf } from '../../lib/dom/element';
/**
 * Routes author-owned light DOM into the frame slots a template rendered.
 *
 * Preview content stays in the light DOM (`slot="preview"` + `data-preview-id`);
 * this assigns each element the `preview:<id>` slot its template created. An
 * element whose template rendered no frame for it stays in the orphan bucket,
 * which is why `orphans` is exposed: the shell shows a hint instead of silently
 * dropping author markup.
 */
export type PreviewHost = {
  readonly renderRoot: HTMLElement | DocumentFragment;
  requestUpdate(): void;
};

export class PreviewRouter {
  readonly #host: PreviewHost;
  #wiredSlot: Element | null = null;
  #orphans = 0;

  constructor(host: PreviewHost) {
    this.#host = host;
  }

  /** How many assigned preview elements had no matching frame slot. */
  get orphans(): number {
    return this.#orphans;
  }

  route(): void {
    const root = this.#host.renderRoot;
    const slot = elementOf(root.querySelector('slot[name="preview"]'), HTMLSlotElement);
    if (slot === null) return;
    if (this.#wiredSlot !== slot) {
      this.#wiredSlot = slot;
      slot.addEventListener('slotchange', this.#onSlotChange);
    }
    const names = new Set(
      Array.from(root.querySelectorAll('slot')).map((element) => element.getAttribute('name') ?? ''),
    );
    const assigned = slot.assignedElements();
    for (const element of assigned) {
      const id = element.getAttribute('data-preview-id');
      if (!id) continue;
      const target = `preview:${id}`;
      if (element.getAttribute('slot') !== target && names.has(target)) element.setAttribute('slot', target);
    }
    if (assigned.length !== this.#orphans) {
      this.#orphans = assigned.length;
      queueMicrotask(() => this.#host.requestUpdate());
    }
  }

  #onSlotChange = (): void => {
    queueMicrotask(() => this.route());
  };
}
