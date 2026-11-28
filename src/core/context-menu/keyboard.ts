/**
 * The two ways in that are not a right-click: a field the reader is typing in
 * keeps the browser's own menu, and the keyboard asks for the custom one over
 * whatever it focuses.
 */

/**
 * Whether `element` sits in text the reader is editing, where the browser's
 * own menu (Cut, Paste, spellcheck) is needed. A read-only field — a card's
 * name at rest is one — is not being edited.
 */
export const isTextEditingSurface = (element: Element): boolean =>
  element.closest('input:not([readonly]), textarea:not([readonly]), [contenteditable=""], [contenteditable="true"]') !==
  null;

/** Shift+F10 or the ContextMenu key: the keyboard's right-click. */
export const isContextMenuKey = (event: KeyboardEvent): boolean =>
  event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10');

/**
 * Opens the context menu over `element` when `event` is the keyboard's
 * right-click: a `contextmenu` at the element's lower-left corner, so the menu
 * resolves the same target a right-click on it would. A key pressed while
 * typing is left to the browser.
 */
export const openContextMenuFromKeyboard = (event: KeyboardEvent, element: Element): void => {
  if (event.isComposing || !isContextMenuKey(event)) return;
  const origin = event.composedPath()[0];
  if (origin instanceof Element && isTextEditingSurface(origin)) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = element.getBoundingClientRect();
  element.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: rect.left,
      clientY: rect.bottom,
    }),
  );
};
