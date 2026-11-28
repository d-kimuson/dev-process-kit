/**
 * Whether a key press belongs to an input method rather than to the page.
 *
 * `isComposing` alone is not enough: some engines report the key that ends a
 * composition as `keyCode` 229, and Safari on macOS delivers the Enter that
 * confirms a conversion after `compositionend`, with `isComposing` already
 * `false`. That last case is told apart by time: a key that follows the end of
 * a composition this closely is the one that ended it, not a new press.
 */
const AFTER_COMPOSITION_MS = 100;

let lastCompositionEnd = Number.NEGATIVE_INFINITY;

if (typeof document !== 'undefined') {
  // Composition events are composed, so one capturing listener sees those of every shadow root.
  document.addEventListener(
    'compositionend',
    (event) => {
      lastCompositionEnd = event.timeStamp;
    },
    { capture: true },
  );
}

export const isImeKey = (event: Pick<KeyboardEvent, 'isComposing' | 'keyCode' | 'timeStamp'>): boolean =>
  event.isComposing || event.keyCode === 229 || event.timeStamp - lastCompositionEnd < AFTER_COMPOSITION_MS;
