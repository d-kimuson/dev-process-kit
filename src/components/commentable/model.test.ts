import { describe, expect, it } from 'vitest';

import { itemLabel, itemTargetValue, parseItemRef, uniqueItems } from './model';

describe('parseItemRef', () => {
  it('reads kind and id', () => {
    expect(parseItemRef('section:goals')).toEqual({ kind: 'section', id: 'goals' });
  });

  it('rejects a reference without a kind or with other characters', () => {
    expect(parseItemRef('goals')).toBeNull();
    expect(parseItemRef('section:a/b')).toBeNull();
    expect(parseItemRef(null)).toBeNull();
  });
});

describe('itemLabel', () => {
  it('prefers the explicit label, then the heading, then the text', () => {
    expect(itemLabel('Explicit', 'Heading', 'Text', 'x')).toBe('Explicit');
    expect(itemLabel(null, ' Heading\n', 'Text', 'x')).toBe('Heading');
    expect(itemLabel(null, null, '  some   text ', 'x')).toBe('some text');
    expect(itemLabel(null, null, '  ', 'fallback')).toBe('fallback');
  });

  it('shortens a long text', () => {
    expect(itemLabel(null, null, 'a'.repeat(80), 'x')).toHaveLength(60);
  });
});

describe('uniqueItems', () => {
  it('drops every item whose reference is ambiguous', () => {
    const items = [
      { kind: 'row', id: 'a' },
      { kind: 'row', id: 'b' },
      { kind: 'row', id: 'a' },
    ];
    expect(uniqueItems(items)).toEqual([{ kind: 'row', id: 'b' }]);
  });
});

describe('itemTargetValue', () => {
  it('addresses the item under the provider', () => {
    expect(itemTargetValue('doc', { kind: 'section', id: 'goals' })).toBe('element:doc/section/goals');
  });
});
