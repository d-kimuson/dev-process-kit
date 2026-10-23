/**
 * Where in an item's shown text a click landed, so the editor that replaces
 * it opens with the caret there. The textarea is laid out exactly like the
 * text it replaces (same type, padding and wrapping), so an offset into the
 * text is an offset into the field.
 */

/** Characters of `text` before `(node, offset)`, counting only its text nodes. */
const offsetWithin = (text: Element, node: Node, offset: number): number | undefined => {
  if (!text.contains(node)) return undefined;
  if (node.nodeType !== Node.TEXT_NODE) return undefined;
  let count = 0;
  const walker = text.ownerDocument.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  for (let current = walker.nextNode(); current !== null; current = walker.nextNode()) {
    if (current === node) return count + offset;
    count += current.textContent?.length ?? 0;
  }
  return undefined;
};

/**
 * The text offset under a viewport point, or `undefined` when the browser
 * cannot tell (no caret API, or the point is not over `text`). Feature
 * detected: `caretPositionFromPoint` with `shadowRoots` reaches into the
 * board's shadow root; `caretRangeFromPoint` does in browsers that retarget.
 */
export const caretOffsetAt = (text: Element, x: number, y: number): number | undefined => {
  const root = text.getRootNode();
  const doc = text.ownerDocument;
  if (typeof doc.caretPositionFromPoint === 'function') {
    const shadowRoots = root instanceof ShadowRoot ? [root] : [];
    const position = doc.caretPositionFromPoint(x, y, { shadowRoots });
    if (position !== null) return offsetWithin(text, position.offsetNode, position.offset);
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);
    if (range !== null) return offsetWithin(text, range.startContainer, range.startOffset);
  }
  return undefined;
};
