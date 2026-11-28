/** Ctrl+Alt+B (Cmd+Option+B on a Mac) opens and closes the side panel. */
export const isPanelShortcut = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && event.code === 'KeyB';
