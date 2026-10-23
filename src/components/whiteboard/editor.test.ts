import { describe, expect, it } from 'vitest';

import { editedText } from './editor';
import { findItem, parseWhiteboardBase } from './model';

const state = parseWhiteboardBase({
  items: [
    { id: 'f', kind: 'frame', x: 0, y: 0, w: 400, h: 300, title: 'Ideas' },
    { id: 's', kind: 'sticky', x: 20, y: 20, text: 'Hello' },
  ],
});
const item = (id: string) => {
  const found = findItem(state, id);
  if (found === undefined) throw new Error(id);
  return found;
};

describe('in-place editor', () => {
  it('commits typed text, trimmed, and nothing when it did not change', () => {
    expect(editedText(item('s'), '  Hello\nworld  ')).toBe('Hello\nworld');
    expect(editedText(item('s'), 'Hello ')).toBeUndefined();
    expect(editedText(item('s'), '')).toBe('');
  });

  it('keeps a frame title on one line, and never empty', () => {
    expect(editedText(item('f'), 'Big\nideas')).toBe('Big ideas');
    expect(editedText(item('f'), '   ')).toBeUndefined();
  });
});
