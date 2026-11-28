/**
 * The effects behind the page's text-submit key (`./text-submit.ts`).
 *
 * The choice is kept on `<html data-dpk-text-submit>`, one per page: every
 * field reads it at the moment a key is pressed, so a field never holds a stale
 * copy, and every bundle loaded on the page sees the same value. The reader's
 * pick itself is persisted by the template that owns the settings
 * (`./shell/text-submit-choice-controller.ts`).
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { isImeKey } from '../lib/dom/ime';
import { isApplePlatform } from '../lib/dom/platform';
import {
  DEFAULT_TEXT_SUBMIT_KEY,
  parseTextSubmitKey,
  TEXT_SUBMIT_CHANGE_EVENT,
  textKeyIntent,
  textSubmitKeyLabel,
  type TextKeyIntent,
  type TextSubmitKey,
} from './text-submit';

const ATTRIBUTE = 'data-dpk-text-submit';

export const pageTextSubmitKey = (): TextSubmitKey =>
  parseTextSubmitKey(document.documentElement.getAttribute(ATTRIBUTE)) ?? DEFAULT_TEXT_SUBMIT_KEY;

/** Sets the page's key; the default leaves no attribute behind. */
export const setPageTextSubmitKey = (key: TextSubmitKey): void => {
  if (key === pageTextSubmitKey()) return;
  if (key === DEFAULT_TEXT_SUBMIT_KEY) document.documentElement.removeAttribute(ATTRIBUTE);
  else document.documentElement.setAttribute(ATTRIBUTE, key);
  document.dispatchEvent(new Event(TEXT_SUBMIT_CHANGE_EVENT));
};

/**
 * The one keydown handler of a multi-line text field. It returns what the press
 * meant; on `submit` the field saves. A line break the browser would not insert
 * itself (Ctrl/Command or Alt with Enter) is inserted here, so every Enter but
 * the save key breaks the line.
 */
export const handleTextSubmitKey = (event: KeyboardEvent): TextKeyIntent => {
  const intent = textKeyIntent(event, pageTextSubmitKey(), isImeKey(event));
  if (intent === 'submit') event.preventDefault();
  else if (intent === 'newline' && (event.metaKey || event.ctrlKey || event.altKey)) {
    const field = event.composedPath()[0];
    if (field instanceof HTMLTextAreaElement) {
      event.preventDefault();
      insertLineBreak(field);
    }
  }
  return intent;
};

/** Through the editing command where there is one, so the break joins the field's own undo history. */
const insertLineBreak = (field: HTMLTextAreaElement): void => {
  if (typeof document.execCommand === 'function' && document.execCommand('insertText', false, '\n')) return;
  field.setRangeText('\n', field.selectionStart, field.selectionEnd, 'end');
  field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertLineBreak' }));
};

/** For an element that shows the key: it renders again when the page's choice changes. */
export class TextSubmitKeyController implements ReactiveController {
  readonly #host: ReactiveControllerHost;

  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  get key(): TextSubmitKey {
    return pageTextSubmitKey();
  }

  /** The key as the reader's keyboard names it ("Command + Enter", "Ctrl + Enter", …). */
  get label(): string {
    return textSubmitKeyLabel(this.key, isApplePlatform());
  }

  hostConnected(): void {
    document.addEventListener(TEXT_SUBMIT_CHANGE_EVENT, this.#refresh);
  }

  hostDisconnected(): void {
    document.removeEventListener(TEXT_SUBMIT_CHANGE_EVENT, this.#refresh);
  }

  #refresh = (): void => {
    this.#host.requestUpdate();
  };
}
