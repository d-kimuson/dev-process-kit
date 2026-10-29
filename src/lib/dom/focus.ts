/**
 * Focus questions a modal surface asks: what opened it (so it can give focus
 * back), and what inside it a Tab would reach first.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The element that actually has focus. `document.activeElement` stops at the
 * host of a shadow root, so a button inside a component's shadow root would
 * read as the component itself.
 */
export const deepActiveElement = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active instanceof HTMLElement ? active : null;
};

/**
 * The first element in `root` a Tab would stop on: an `[autofocus]` first,
 * since that is the author's own choice of the opening focus.
 */
export const firstFocusable = (root: ParentNode): HTMLElement | null => {
  const preferred = root.querySelector<HTMLElement>('[autofocus]');
  if (preferred) return preferred;
  for (const candidate of root.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (candidate.hidden || candidate.closest('[hidden]') !== null) continue;
    return candidate;
  }
  return null;
};
