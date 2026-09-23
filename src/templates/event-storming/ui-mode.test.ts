import { describe, expect, it } from 'vitest';

import { ES_IDLE, noteCardModeOf, reduceNoteIntent, type EsUiMode } from './ui-mode';

const editing: EsUiMode = { kind: 'editing', noteId: 'n1' };

describe('event-storming ui mode', () => {
  it('a committed name ends the local edit', () => {
    expect(reduceNoteIntent(editing, 'n1', { kind: 'rename', name: 'x' })).toEqual(ES_IDLE);
  });

  it('a commit reported for another note leaves the mode alone', () => {
    expect(reduceNoteIntent(editing, 'n2', { kind: 'rename', name: 'x' })).toEqual(editing);
  });

  it('the comment tool toggles the composer for exactly one note', () => {
    expect(reduceNoteIntent(editing, 'n1', { kind: 'toggle-comment' })).toEqual({ kind: 'commenting', noteId: 'n1' });
    expect(reduceNoteIntent({ kind: 'commenting', noteId: 'n1' }, 'n1', { kind: 'toggle-comment' })).toEqual(ES_IDLE);
  });

  it('noteCardModeOf only singles out the edited note', () => {
    expect(noteCardModeOf(editing, 'n1')).toBe('editing');
    expect(noteCardModeOf(editing, 'n2')).toBe('view');
  });
});
