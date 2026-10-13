/**
 * Drives a change's "Show" from a template's tests: the change log to mount
 * with the page, and the element "Show" highlighted.
 */

/** A change log with one change about `target`, to mount as a child of the template element. */
export const changeLogScript = (target: string): string => {
  const log = { revision: 'r1', changes: [{ id: 'change', title: 'Changed', target }] };
  return `<script type="application/json" data-dpk-changes>${JSON.stringify(log)}</script>`;
};

const WAIT_MS = 1000;

const later = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));

/**
 * Clicks "Show" on the change's toast and resolves with the element it
 * highlighted, or `null`. Without layout every element counts as shown, so
 * the first marked one in tree order wins.
 */
export const showChange = async (host: HTMLElement): Promise<Element | null> => {
  let highlighted: Element | null = null;
  const record = (element: Element): null => {
    highlighted = element;
    return null;
  };
  const fakes: Record<'animate' | 'getClientRects', (this: Element) => unknown> = {
    animate() {
      return record(this);
    },
    getClientRects: () => [new DOMRect(0, 0, 1, 1)],
  };
  // A DOM implementation may define either on a subclass of Element, which would hide a fake on Element.
  const restores = [Element.prototype, HTMLElement.prototype, SVGElement.prototype].flatMap((proto) =>
    (['animate', 'getClientRects'] as const).map((name) => {
      const own = Object.getOwnPropertyDescriptor(proto, name);
      Object.defineProperty(proto, name, { configurable: true, writable: true, value: fakes[name] });
      return () => {
        if (own) Object.defineProperty(proto, name, own);
        else Reflect.deleteProperty(proto, name);
      };
    }),
  );
  try {
    const button = host.shadowRoot?.querySelector('.dpk-toast[data-key="change"] .dpk-notice-show');
    if (!(button instanceof HTMLElement)) throw new Error('the change has no "Show"');
    button.click();
    for (let waited = 0; highlighted === null && waited < WAIT_MS; waited += 10) await later();
    return highlighted;
  } finally {
    for (const restore of restores) restore();
  }
};
