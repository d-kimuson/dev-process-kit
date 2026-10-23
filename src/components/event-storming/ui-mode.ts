export type Point = {
  readonly x: number;
  readonly y: number;
};

/**
 * The one ephemeral UI state of the wall: which note is being edited or
 * inspected. Everything else is either base+draft state, or the chrome's own
 * selection/comment plumbing (ADR 20261023_diagram-as-board).
 */
export type EsUiMode =
  | { readonly kind: 'idle' }
  | { readonly kind: 'editing'; readonly noteId: string }
  /** A connect port was clicked: pick the note that continues the slice. */
  | { readonly kind: 'append'; readonly sliceId: string; readonly point: Point };

export const ES_IDLE: EsUiMode = { kind: 'idle' };

export type NoteCardMode = 'view' | 'editing';

/** What a note card may ask its host for. The card never dispatches actions. */
export type NoteIntent =
  | { readonly kind: 'select' }
  | { readonly kind: 'rename'; readonly name: string }
  | { readonly kind: 'add-hotspot' }
  | { readonly kind: 'delete' };

/**
 * A pointer gesture in flight on the board, in viewport-local pixels:
 * dragging a connection out of a port, picking up a whole slice, or sweeping
 * a selection rectangle over the background. A press that never moves past
 * the threshold ends as the gesture's click (continue / select slice / clear).
 */
export type EsGesture =
  | {
      readonly kind: 'connect';
      readonly pointerId: number;
      readonly fromSliceId: string;
      readonly start: Point;
      readonly current: Point;
      readonly moved: boolean;
      readonly targetSliceId?: string;
    }
  | {
      readonly kind: 'move-slice';
      readonly pointerId: number;
      readonly sliceId: string;
      readonly start: Point;
      readonly current: Point;
      readonly moved: boolean;
      readonly drop?: { readonly sliceId: string; readonly side: 'before' | 'after' };
    }
  | {
      readonly kind: 'select';
      readonly pointerId: number;
      readonly start: Point;
      readonly current: Point;
      readonly moved: boolean;
    };

/** The context-name popover: naming a fresh group or renaming an existing one. */
export type EsNaming =
  | { readonly kind: 'create-context'; readonly sliceIds: readonly string[]; readonly point: Point }
  | { readonly kind: 'rename-context'; readonly contextId: string; readonly point: Point };

export const noteCardModeOf = (mode: EsUiMode, noteId: string): NoteCardMode => {
  if (mode.kind === 'editing' && mode.noteId === noteId) return 'editing';
  return 'view';
};

export const reduceNoteIntent = (mode: EsUiMode, noteId: string, intent: NoteIntent): EsUiMode => {
  switch (intent.kind) {
    case 'delete':
      return ES_IDLE;
    case 'select':
    case 'add-hotspot':
      return mode;
    // A committed name ends the local edit: the card must not stay in its
    // editing shape once the reader is done typing.
    case 'rename':
      return mode.kind === 'editing' && mode.noteId === noteId ? ES_IDLE : mode;
  }
};
