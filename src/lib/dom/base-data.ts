/**
 * The `<script type="application/json">` child that components use for their
 * data, mirroring the artifact base-data contract: one JSON block, no envelope,
 * parsed strictly.
 */
export type JsonChildResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

export const JSON_CHILD_SELECTOR = 'script[type="application/json"]';

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
 * Reads the JSON child now, and once more if a parser appends it later
 * (dynamically created elements, streaming HTML). Returns a disposer.
 *
 * A block that is present but invalid is reported immediately: it is an
 * authoring mistake, and silently waiting for a better one hides it.
 */
export const observeJsonChild = <T>(
  host: Element,
  parse: (input: unknown) => T,
  onChange: (result: JsonChildResult<T>) => void,
): (() => void) => {
  const initial = readJsonChild(host, parse);
  if (initial) {
    onChange(initial);
    return () => undefined;
  }
  const observer = new MutationObserver(() => {
    const result = readJsonChild(host, parse);
    if (!result) return;
    observer.disconnect();
    onChange(result);
  });
  observer.observe(host, { childList: true, subtree: true });
  return () => observer.disconnect();
};
