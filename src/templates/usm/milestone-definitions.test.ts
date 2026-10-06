import { describe, expect, it } from 'vitest';

import { presentMilestoneDefinitions } from './milestone-definitions';
import { parseUsmBase } from './model';

const stateWith = (milestones: readonly Record<string, string>[]) => parseUsmBase({ milestones });

describe('milestone definitions', () => {
  it('lists every milestone in map order with both columns when both are authored', () => {
    const view = presentMilestoneDefinitions(
      stateWith([
        { id: 'mvp', name: 'MVP', timeframe: '2026-10', description: 'Minimum feature set' },
        { id: 'v1', name: 'v1' },
      ]),
    );
    expect(view).toEqual({
      columns: { timeframe: true, description: true },
      rows: [
        { id: 'mvp', name: 'MVP', timeframe: '2026-10', description: 'Minimum feature set' },
        { id: 'v1', name: 'v1', timeframe: '', description: '' },
      ],
    });
  });

  it('drops the timeframe column when no milestone has a timeframe', () => {
    const view = presentMilestoneDefinitions(
      stateWith([
        { id: 'mvp', name: 'MVP', description: 'Minimum feature set' },
        { id: 'v1', name: 'v1', timeframe: '  ' },
      ]),
    );
    expect(view?.columns).toEqual({ timeframe: false, description: true });
  });

  it('drops the description column when no milestone has a description', () => {
    const view = presentMilestoneDefinitions(stateWith([{ id: 'mvp', name: 'MVP', timeframe: 'Q4', description: '' }]));
    expect(view?.columns).toEqual({ timeframe: true, description: false });
  });

  it('hides the whole section when no milestone defines anything beyond its name', () => {
    expect(presentMilestoneDefinitions(stateWith([{ id: 'mvp', name: 'MVP' }]))).toBeNull();
    expect(presentMilestoneDefinitions(stateWith([]))).toBeNull();
  });
});
