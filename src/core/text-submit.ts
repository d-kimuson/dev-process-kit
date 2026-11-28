/**
 * Which key saves a multi-line text field. One choice for the whole page: the
 * reader picks it in the settings dialog, and every multi-line field (comment
 * boxes, notes, a multi-line inline edit) follows it. Any other Enter starts a
 * new line.
 */
export type TextSubmitKey = 'enter' | 'mod-enter' | 'shift-enter';

/** Ctrl/Command+Enter: what the kit's text fields have always used. */
export const DEFAULT_TEXT_SUBMIT_KEY: TextSubmitKey = 'mod-enter';

export const TEXT_SUBMIT_KEYS: readonly TextSubmitKey[] = ['enter', 'mod-enter', 'shift-enter'];

export const parseTextSubmitKey = (value: unknown): TextSubmitKey | null =>
  value === 'enter' || value === 'mod-enter' || value === 'shift-enter' ? value : null;

/**
 * Fired on `document` when the page's choice changes, so a field showing the
 * key ("⌘ + Enter to save") renders again.
 */
export const TEXT_SUBMIT_CHANGE_EVENT = 'dpk-text-submit-change';

export type TextKeyPress = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey'>;

/**
 * What a key press in a multi-line field means: save, a line break, or
 * nothing of ours (any other key, or one an input method is using).
 */
export type TextKeyIntent = 'submit' | 'newline' | 'none';

export const textKeyIntent = (event: TextKeyPress, submitKey: TextSubmitKey, composing: boolean): TextKeyIntent => {
  if (event.key !== 'Enter' || composing) return 'none';
  const mod = event.metaKey || event.ctrlKey;
  const submits =
    !event.altKey &&
    (submitKey === 'enter'
      ? !mod && !event.shiftKey
      : submitKey === 'mod-enter'
        ? mod && !event.shiftKey
        : event.shiftKey && !mod);
  return submits ? 'submit' : 'newline';
};

/** The key as the reader's keyboard names it: Command on Apple platforms, Ctrl elsewhere. */
export const textSubmitKeyLabel = (key: TextSubmitKey, apple: boolean): string =>
  key === 'enter' ? 'Enter' : key === 'shift-enter' ? 'Shift + Enter' : `${apple ? 'Command' : 'Ctrl'} + Enter`;
