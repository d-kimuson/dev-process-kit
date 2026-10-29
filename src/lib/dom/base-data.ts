/**
 * The `<script type="application/json">` child that components use for their
 * data, mirroring the template base-data contract: one JSON block, no envelope,
 * parsed strictly.
 */
export type JsonChildResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

// Mirrors `core/element.ts`'s own `BASE_SELECTOR`: a board (a diagram acting as its own board,
// ADR 20261023_diagram-as-board) may sit beside a `data-dpk-changes` or `data-dpk-grill` script,
// exactly as a template does, and neither is this element's own base data. The attribute names are
// repeated here as literals (`core/changes.ts`'s `CHANGES_ATTRIBUTE`, `core/grill.ts`'s
// `GRILL_ATTRIBUTE`) since `lib/` keeps no dependency on `core/`.
export const JSON_CHILD_SELECTOR = 'script[type="application/json"]:not([data-dpk-changes]):not([data-dpk-grill])';

/** `null` when the element has no JSON block at all (yet). */
export const readJsonChild = <T>(host: Element, parse: (input: unknown) => T): JsonChildResult<T> | null => {
  const script = host.querySelector(JSON_CHILD_SELECTOR);
  if (!script) return null;
  const text = script.textContent ?? '';
  if (text.trim() === '') return { ok: false, error: 'JSON block is empty' };
  try {
    return { ok: true, value: parse(JSON.parse(text)) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * Reads the JSON child now, and again whenever its text changes: a parser may
 * append it later (dynamically created elements, streaming HTML), and an
 * empty or invalid block may be filled in or fixed later. Returns a disposer.
 *
 * A block that is present but invalid is reported immediately: it is an
 * authoring mistake, and silently waiting for a better one hides it. The
 * reported error goes away with the next read that parses.
 */
export const observeJsonChild = <T>(
  host: Element,
  parse: (input: unknown) => T,
  onChange: (result: JsonChildResult<T>) => void,
): (() => void) => {
  // `undefined` before the first read, `null` without a block.
  let text: string | null | undefined;
  const refresh = (): void => {
    const script = host.querySelector(JSON_CHILD_SELECTOR);
    const next = script === null ? null : (script.textContent ?? '');
    if (next === text) return;
    text = next;
    const result = readJsonChild(host, parse);
    if (result !== null) onChange(result);
  };
  refresh();
  const observer = new MutationObserver(refresh);
  observer.observe(host, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
};
