import { describe, expect, it } from 'vitest';

import { toggleSelection } from './selection';

describe('multi-selection', () => {
  it('toggles one id in or out', () => {
    expect(toggleSelection(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b']);
  });
});
