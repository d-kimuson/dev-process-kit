import type { StatusIcon, StatusTone, UsmState } from './model';

export type StatusRow = {
  readonly id: string;
  readonly name: string;
  readonly tone: StatusTone;
  readonly icon: StatusIcon;
  /** Where it sits in the workflow, for its icon (see `StatusView`). */
  readonly progress: number;
  /** The status right before it, `null` for the first: where "move up" goes. */
  readonly previousId: string | null;
  /** The status right after it, `null` for the last: where "move down" goes. */
  readonly nextId: string | null;
  readonly storyCount: number;
  /** Fraction of every story on the map (0 on an empty map). */
  readonly share: number;
};

export type StatusOverview = {
  readonly rows: readonly StatusRow[];
};

/** The statuses tab: each status in order and how many stories stand there. */
export const presentStatusOverview = (state: UsmState): StatusOverview => {
  const total = state.stories.length;
  const shareOf = (count: number): number => (total === 0 ? 0 : count / total);
  const countOf = (id: string): number => state.stories.filter((story) => story.statusId === id).length;
  const rows = state.statuses.map((status, index) => {
    const storyCount = countOf(status.id);
    return {
      id: status.id,
      name: status.name,
      tone: status.tone,
      icon: status.icon,
      progress: state.statuses.length <= 1 ? 1 : index / (state.statuses.length - 1),
      previousId: state.statuses[index - 1]?.id ?? null,
      nextId: state.statuses[index + 1]?.id ?? null,
      storyCount,
      share: shareOf(storyCount),
    };
  });
  return { rows };
};
