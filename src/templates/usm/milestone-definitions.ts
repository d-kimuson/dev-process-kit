import type { UsmState } from './model';

import { rowVisible, type MilestoneFilter } from './milestone-tabs';

export type MilestoneDefinitionRow = {
  readonly id: string;
  readonly name: string;
  /** `''` when this milestone leaves it out. */
  readonly timeframe: string;
  /** `''` when this milestone leaves it out. */
  readonly description: string;
};

export type MilestoneDefinitions = {
  /** A column is shown only when at least one milestone fills it. */
  readonly columns: { readonly timeframe: boolean; readonly description: boolean };
  readonly rows: readonly MilestoneDefinitionRow[];
};

/**
 * The milestone legend under the map. Both details are optional, so it only
 * shows what the author actually wrote: a column nobody filled disappears, and
 * with nothing beyond the names (already on the row heads) there is no legend.
 * It follows the milestone tab, so a single slice shows only its own definition.
 */
export const presentMilestoneDefinitions = (
  state: UsmState,
  filter: MilestoneFilter = { kind: 'all' },
): MilestoneDefinitions | null => {
  const rows = state.milestones
    .filter((milestone) => rowVisible(filter, milestone.id))
    .map((milestone): MilestoneDefinitionRow => ({
      id: milestone.id,
      name: milestone.name,
      timeframe: milestone.timeframe?.trim() ?? '',
      description: milestone.description?.trim() ?? '',
    }));
  const columns = {
    timeframe: rows.some((row) => row.timeframe !== ''),
    description: rows.some((row) => row.description !== ''),
  };
  return columns.timeframe || columns.description ? { columns, rows } : null;
};
