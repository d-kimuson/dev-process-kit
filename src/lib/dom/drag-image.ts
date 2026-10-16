import { composeBoxes } from '../layout/boxes';

/** What `dragstart` brings that a drag image needs. */
export type DragImageStart = {
  readonly dataTransfer: Pick<DataTransfer, 'setDragImage'> | null;
  readonly clientX: number;
  readonly clientY: number;
};

/**
 * Lifts several elements as one drag image: a grid column is a head and a
 * cell in every row, not one subtree `setDragImage` could take. A still copy
 * of the parts, cut to `frame` (their scrolling box) and on its background, is
 * laid exactly over them for the browser to take, and removed a task later;
 * being the same picture, it never shows as a flash, and it takes no pointer
 * events, so the drag source stays under the pointer. The copy goes in the
 * frame's root so the root's styles still dress it. Later parts paint over
 * earlier ones (pass sticky heads last).
 */
export const setCompositeDragImage = (event: DragImageStart, parts: readonly Element[], frame: Element): void => {
  const transfer = event.dataTransfer;
  if (!transfer) return;
  const layout = composeBoxes(
    frame.getBoundingClientRect(),
    parts.map((part) => part.getBoundingClientRect()),
  );
  if (!layout) return;
  const { box } = layout;
  const image = document.createElement('div');
  image.style.cssText = [
    'position: fixed',
    `left: ${box.left}px`,
    `top: ${box.top}px`,
    `width: ${box.width}px`,
    `height: ${box.height}px`,
    'overflow: hidden',
    'pointer-events: none',
    'z-index: 2147483647',
    `background: ${getComputedStyle(frame).backgroundColor}`,
  ].join('; ');
  for (const [index, part] of parts.entries()) {
    const at = layout.parts[index];
    const copy = stillCopy(part);
    if (!at || !(copy instanceof HTMLElement)) continue;
    copy.style.position = 'absolute';
    copy.style.left = `${at.left}px`;
    copy.style.top = `${at.top}px`;
    copy.style.width = `${at.width}px`;
    copy.style.height = `${at.height}px`;
    copy.style.margin = '0';
    copy.style.boxSizing = 'border-box';
    image.append(copy);
  }
  const root = frame.getRootNode();
  (root instanceof ShadowRoot ? root : document.body).append(image);
  transfer.setDragImage(image, event.clientX - box.left, event.clientY - box.top);
  setTimeout(() => image.remove(), 0);
};

/**
 * A deep copy that keeps what custom elements drew in their (open) shadow
 * roots. It shares the originals' root while it is shown, so it drops their
 * ids rather than doubling them.
 */
const stillCopy = (node: Node): Node => {
  if (node instanceof Element && node.shadowRoot) return standIn(node, node.shadowRoot);
  const copy = node.cloneNode(false);
  if (copy instanceof Element) copy.removeAttribute('id');
  for (const child of node.childNodes) copy.appendChild(stillCopy(child));
  return copy;
};

/**
 * A plain element in place of a custom one: a clone of the custom element
 * would upgrade empty, without the properties it renders from. The stand-in
 * carries its attributes but the id (for `:host(...)` rules), its box and a
 * copy of its shadow root with the same styles.
 */
const standIn = (host: Element, shadow: ShadowRoot): Element => {
  const stand = document.createElement('span');
  for (const attribute of host.attributes) {
    if (attribute.name !== 'id') stand.setAttribute(attribute.name, attribute.value);
  }
  const style = getComputedStyle(host);
  const rect = host.getBoundingClientRect();
  stand.style.display = style.display === 'inline' ? 'inline-block' : style.display;
  stand.style.width = `${rect.width}px`;
  stand.style.height = `${rect.height}px`;
  stand.style.boxSizing = 'border-box';
  stand.style.flex = 'none';
  stand.style.verticalAlign = style.verticalAlign;
  const copy = stand.attachShadow({ mode: 'open' });
  if ('adoptedStyleSheets' in shadow) copy.adoptedStyleSheets = shadow.adoptedStyleSheets;
  for (const child of shadow.childNodes) copy.appendChild(stillCopy(child));
  for (const child of host.childNodes) stand.appendChild(stillCopy(child));
  return stand;
};
