import { describe, expect, it } from 'vitest';

import { parseTextSubmitKey, textKeyIntent, textSubmitKeyLabel, type TextSubmitKey } from './text-submit';

const press = (modifiers: { shift?: boolean; meta?: boolean; ctrl?: boolean; alt?: boolean } = {}, key = 'Enter') => ({
  key,
  shiftKey: modifiers.shift ?? false,
  metaKey: modifiers.meta ?? false,
  ctrlKey: modifiers.ctrl ?? false,
  altKey: modifiers.alt ?? false,
});

describe('text-submit key', () => {
  it.each<[TextSubmitKey, ReturnType<typeof press>, 'submit' | 'newline']>([
    ['enter', press(), 'submit'],
    ['enter', press({ shift: true }), 'newline'],
    ['enter', press({ ctrl: true }), 'newline'],
    ['mod-enter', press({ ctrl: true }), 'submit'],
    ['mod-enter', press({ meta: true }), 'submit'],
    ['mod-enter', press(), 'newline'],
    ['mod-enter', press({ shift: true }), 'newline'],
    ['mod-enter', press({ ctrl: true, shift: true }), 'newline'],
    ['shift-enter', press({ shift: true }), 'submit'],
    ['shift-enter', press(), 'newline'],
    ['shift-enter', press({ meta: true }), 'newline'],
    ['enter', press({ alt: true }), 'newline'],
  ])('under %s, %o is %s', (submitKey, event, intent) => {
    expect(textKeyIntent(event, submitKey, false)).toBe(intent);
  });

  it('never saves or breaks the line while an input method is composing, whatever the key', () => {
    for (const submitKey of ['enter', 'mod-enter', 'shift-enter'] as const) {
      for (const event of [press(), press({ shift: true }), press({ ctrl: true }), press({ meta: true })]) {
        expect(textKeyIntent(event, submitKey, true)).toBe('none');
      }
    }
  });

  it('leaves every other key alone', () => {
    expect(textKeyIntent(press({ ctrl: true }, 'a'), 'mod-enter', false)).toBe('none');
  });

  it('names the key the way the reader’s keyboard does', () => {
    expect(textSubmitKeyLabel('mod-enter', true)).toBe('Command + Enter');
    expect(textSubmitKeyLabel('mod-enter', false)).toBe('Ctrl + Enter');
    expect(textSubmitKeyLabel('shift-enter', true)).toBe('Shift + Enter');
    expect(textSubmitKeyLabel('enter', false)).toBe('Enter');
  });

  it('reads only the keys it knows', () => {
    expect(parseTextSubmitKey('shift-enter')).toBe('shift-enter');
    expect(parseTextSubmitKey('ctrl-enter')).toBeNull();
    expect(parseTextSubmitKey(1)).toBeNull();
  });
});
