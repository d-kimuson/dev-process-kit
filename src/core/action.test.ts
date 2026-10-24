import { describe, expect, it } from 'vitest';

import type { DraftAction } from './types';

import { appendAction } from './action';
import { pageActions } from './page/actions';

const PAGE = { type: 'page', id: 'page' } as const;

const action = (id: string, type: string, payload: Record<string, unknown>): DraftAction => ({
  id,
  type,
  target: PAGE,
  payload,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('appendAction', () => {
  it('does not fold a patch into a different action type that happens to share its dedupe key', () => {
    const add = action('a', 'ADD_BOARD', { board: 'usm', template: 'usm', label: 'Story map' });
    const rename = action('r', 'RENAME_BOARD', { board: 'usm', label: 'Roadmap' });
    expect(appendAction([add], rename, pageActions.RENAME_BOARD)).toEqual([add, rename]);
  });

  it('still lets the last rename of the same board win', () => {
    const first = action('r1', 'RENAME_BOARD', { board: 'usm', label: 'Road' });
    const second = action('r2', 'RENAME_BOARD', { board: 'usm', label: 'Roadmap' });
    expect(appendAction([first], second, pageActions.RENAME_BOARD)).toEqual([second]);
  });
});
