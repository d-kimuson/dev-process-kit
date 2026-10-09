import type { StatusTone, UsmState } from './model';

export type StatusRow = {
  readonly id: string;
  readonly name: string;
  readonly tone: StatusTone;
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
  /** Stories that have no status yet. */
  readonly unsetCount: number;
  readonly unsetShare: number;
};

/** The statuses tab: each status in order, how many stories stand there, and how many stand nowhere yet. */
export const presentStatusOverview = (state: UsmState): StatusOverview => {
  const total = state.stories.length;
  const shareOf = (count: number): number => (total === 0 ? 0 : count / total);
  const countOf = (id: string | undefined): number => state.stories.filter((story) => story.statusId === id).length;
  const rows = state.statuses.map((status, index) => {
    const storyCount = countOf(status.id);
    return {
      id: status.id,
      name: status.name,
      tone: status.tone,
      previousId: state.statuses[index - 1]?.id ?? null,
      nextId: state.statuses[index + 1]?.id ?? null,
      storyCount,
      share: shareOf(storyCount),
    };
  });
  const unsetCount = countOf(undefined);
  return { rows, unsetCount, unsetShare: shareOf(unsetCount) };
};
