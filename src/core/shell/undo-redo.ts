/**
 * Undo/redo over the draft log, in the shell header: two icon buttons
 * (disabled when there is nothing to undo or redo) and the keyboard shortcuts
 * that drive the same thing (Cmd+Z/Ctrl+Z, Shift+Cmd+Z/Ctrl+Shift+Z/Ctrl+Y).
 * What `undo`/`redo` do is the core's (`DraftController`); this only renders
 * the buttons and recognizes the keys.
 */
import { html, type ReactiveController, type ReactiveControllerHost, type TemplateResult } from 'lit';

import type { CoreMessages } from '../messages';

import { iconRedo, iconUndo } from '../icons';

export type UndoRedoIntents = {
  readonly undo: () => void;
  readonly redo: () => void;
};

export const renderUndoRedo = (
  canUndo: boolean,
  canRedo: boolean,
  m: CoreMessages,
  on: UndoRedoIntents,
): TemplateResult =>
  html`<div class="dpk-undo-redo" role="group" aria-label=${m.undoRedo}>
    <button
      class="dpk-chrome-action dpk-undo"
      type="button"
      ?disabled=${!canUndo}
      aria-label=${m.undo}
      data-tooltip=${m.undo}
      @click=${on.undo}
    >
      ${iconUndo()}
    </button>
    <button
      class="dpk-chrome-action dpk-redo"
      type="button"
      ?disabled=${!canRedo}
      aria-label=${m.redo}
      data-tooltip=${m.redo}
      @click=${on.redo}
    >
      ${iconRedo()}
    </button>
  </div>`;

/** A `<input>`/`<textarea>`/`contenteditable` so native text-editing undo keeps working. */
const isEditableTarget = (path: readonly EventTarget[]): boolean => {
  const target = path[0];
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
  return target.isContentEditable;
};

const isUndoChord = (event: KeyboardEvent): boolean => {
  const key = event.key.toLowerCase();
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === 'z';
};

const isRedoChord = (event: KeyboardEvent): boolean => {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return false;
  const key = event.key.toLowerCase();
  // Shift+Cmd/Ctrl+Z (every platform) and Ctrl+Y (Windows/Linux convention).
  return (key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey);
};

/**
 * Document-level Cmd+Z/Ctrl+Z and Shift+Cmd+Z/Ctrl+Shift+Z/Ctrl+Y, listening
 * while the host is connected. `composedPath()` finds the real target even
 * across shadow roots, so a shortcut typed while editing inside one still
 * reaches native text undo instead of this controller.
 */
export class UndoRedoKeyboardController implements ReactiveController {
  readonly #options: UndoRedoIntents;
  constructor(host: ReactiveControllerHost, options: UndoRedoIntents) {
    this.#options = options;
    host.addController(this);
  }
  hostConnected(): void {
    document.addEventListener('keydown', this.#onKeyDown);
  }
  hostDisconnected(): void {
    document.removeEventListener('keydown', this.#onKeyDown);
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.defaultPrevented) return;
    if (isEditableTarget(event.composedPath())) return;
    if (isRedoChord(event)) {
      event.preventDefault();
      this.#options.redo();
    } else if (isUndoChord(event)) {
      event.preventDefault();
      this.#options.undo();
    }
  };
}
