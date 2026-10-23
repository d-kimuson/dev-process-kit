import { describe, expect, it } from 'vitest';

import {
  avatarTone,
  clampActiveIndex,
  filterOptions,
  groupOptions,
  initialsFor,
  isSelected,
  moveActiveIndex,
  normalizeValue,
  parseComboboxData,
  removeValue,
  sameValues,
  selectedLabel,
  selectedOptions,
  toggleSelection,
  type ComboboxOption,
} from './model';

const maya: ComboboxOption = {
  value: 'maya',
  label: 'Maya Chen',
  description: 'Product Designer',
  group: 'Design',
  avatar: null,
};
const jin: ComboboxOption = {
  value: 'jin',
  label: 'Jin Park',
  description: 'Backend Engineer',
  group: 'Engineering',
  avatar: null,
};
const amy: ComboboxOption = {
  value: 'amy',
  label: 'Amy Diaz',
  description: 'Frontend Engineer',
  group: 'Engineering',
  avatar: null,
};
const noor: ComboboxOption = { value: 'noor', label: 'Noor Khan', description: null, group: null, avatar: null };

describe('parseComboboxData', () => {
  it('normalizes options and a scalar or list value', () => {
    expect(
      parseComboboxData({
        options: [{ value: 'maya', label: 'Maya Chen', description: 'Product Designer', group: 'Design' }],
        value: 'maya',
      }),
    ).toEqual({
      options: [{ value: 'maya', label: 'Maya Chen', description: 'Product Designer', group: 'Design', avatar: null }],
      value: ['maya'],
    });
    expect(parseComboboxData({ options: [] })).toEqual({ options: [], value: null });
  });

  it('rejects duplicate values and unknown keys', () => {
    expect(() =>
      parseComboboxData({
        options: [
          { value: 'a', label: 'A' },
          { value: 'a', label: 'B' },
        ],
      }),
    ).toThrow(/duplicate option value: a/);
    expect(() => parseComboboxData({ options: [{ value: 'a', label: 'A', role: 'x' }] })).toThrow();
  });
});

describe('filterOptions', () => {
  const options = [maya, jin, amy, noor];

  it('returns everything for a blank query', () => {
    expect(filterOptions(options, '  ')).toEqual(options);
  });

  it('matches the label or the description, case-insensitively', () => {
    expect(filterOptions(options, 'chen')).toEqual([maya]);
    expect(filterOptions(options, 'ENGINEER')).toEqual([jin, amy]);
    expect(filterOptions(options, 'zzz')).toEqual([]);
  });
});

describe('groupOptions', () => {
  it('buckets by group in first-seen order, keeping ungrouped options in their own bucket', () => {
    expect(groupOptions([maya, jin, noor, amy])).toEqual([
      { group: 'Design', options: [maya] },
      { group: 'Engineering', options: [jin, amy] },
      { group: null, options: [noor] },
    ]);
  });
});

describe('clampActiveIndex', () => {
  it('clamps into range and answers -1 for an empty list', () => {
    expect(clampActiveIndex(-3, 4)).toBe(0);
    expect(clampActiveIndex(9, 4)).toBe(3);
    expect(clampActiveIndex(1, 0)).toBe(-1);
  });
});

describe('moveActiveIndex', () => {
  it('wraps in both directions and starts at an end when nothing was active', () => {
    expect(moveActiveIndex(-1, 1, 3)).toBe(0);
    expect(moveActiveIndex(-1, -1, 3)).toBe(2);
    expect(moveActiveIndex(2, 1, 3)).toBe(0);
    expect(moveActiveIndex(0, -1, 3)).toBe(2);
    expect(moveActiveIndex(0, 1, 0)).toBe(-1);
  });
});

describe('toggleSelection', () => {
  it('always replaces the selection in single-select', () => {
    expect(toggleSelection(['a'], 'b', false)).toEqual(['b']);
    expect(toggleSelection(['a'], 'a', false)).toEqual(['a']);
  });

  it('adds or removes the value in multi-select', () => {
    expect(toggleSelection(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(toggleSelection(['a', 'b'], 'a', true)).toEqual(['b']);
  });
});

describe('removeValue / isSelected / sameValues', () => {
  it('removes one value and reports membership and equality', () => {
    expect(removeValue(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(isSelected(['a', 'b'], 'b')).toBe(true);
    expect(isSelected(['a', 'b'], 'c')).toBe(false);
    expect(sameValues(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameValues(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});

describe('selectedOptions / selectedLabel', () => {
  const options = [maya, jin];

  it('keeps value order and drops values with no matching option', () => {
    expect(selectedOptions(options, ['jin', 'gone', 'maya'])).toEqual([jin, maya]);
  });

  it('reads the first picked option label, or null when nothing (or it is gone) is picked', () => {
    expect(selectedLabel(options, ['jin'])).toBe('Jin Park');
    expect(selectedLabel(options, [])).toBeNull();
    expect(selectedLabel(options, ['gone'])).toBeNull();
  });
});

describe('normalizeValue', () => {
  it('coerces a string, a list, or neither into a string list', () => {
    expect(normalizeValue('maya')).toEqual(['maya']);
    expect(normalizeValue('')).toEqual([]);
    expect(normalizeValue(['a', 'b', 1, null])).toEqual(['a', 'b']);
    expect(normalizeValue(undefined)).toEqual([]);
    expect(normalizeValue(null)).toEqual([]);
  });
});

describe('initialsFor', () => {
  it('takes the first and last word initials, or just the first for a single word', () => {
    expect(initialsFor('Maya Chen')).toBe('MC');
    expect(initialsFor('Cher')).toBe('C');
    expect(initialsFor('  noor   khan  ')).toBe('NK');
  });
});

describe('avatarTone', () => {
  it('is deterministic for the same seed and comes from the fixed palette', () => {
    const tones = ['blue', 'green', 'amber', 'violet', 'accent', 'danger'];
    expect(avatarTone('maya')).toBe(avatarTone('maya'));
    expect(tones).toContain(avatarTone('maya'));
    expect(tones).toContain(avatarTone('jin'));
  });
});
