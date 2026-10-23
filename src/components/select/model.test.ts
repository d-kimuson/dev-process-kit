import { describe, expect, it } from 'vitest';

import { parseSelectData } from './model';

describe('parseSelectData', () => {
  it('parses options and an optional initial value', () => {
    expect(
      parseSelectData({
        options: [
          { value: 'en', label: 'English' },
          { value: 'ja', label: 'Japanese' },
        ],
        value: 'ja',
      }),
    ).toEqual({
      options: [
        { value: 'en', label: 'English' },
        { value: 'ja', label: 'Japanese' },
      ],
      value: 'ja',
    });
    expect(parseSelectData({ options: [] })).toEqual({ options: [], value: null });
  });

  it('rejects duplicate values and unknown keys', () => {
    expect(() =>
      parseSelectData({
        options: [
          { value: 'en', label: 'English' },
          { value: 'en', label: 'Also English' },
        ],
      }),
    ).toThrow(/duplicate/);
    expect(() => parseSelectData({ options: [{ value: 'en', label: 'English', group: 'x' }] })).toThrow();
  });
});
