import type { StatusTone, UsmState } from './model';

export type LabelRow = {
  readonly id: string;
  readonly name: string;
  readonly tone: StatusTone;
  /** The label right before it, `null` for the first: where "move up" goes. */
  readonly previousId: string | null;
  /** The label right after it, `null` for the last: where "move down" goes. */
  readonly nextId: string | null;
  readonly storyCount: number;
  /** Fraction of every story on the map (0 on an empty map). */
  readonly share: number;
};

export type LabelOverview = {
  readonly rows: readonly LabelRow[];
};

/** The labels section of the settings: each label in order and how many stories carry it. */
export const presentLabelOverview = (state: UsmState): LabelOverview => {
  const total = state.stories.length;
  const rows = state.labels.map((label, index) => {
    const storyCount = state.stories.filter((story) => story.labelIds?.includes(label.id)).length;
    return {
      id: label.id,
      name: label.name,
      tone: label.tone,
      previousId: state.labels[index - 1]?.id ?? null,
      nextId: state.labels[index + 1]?.id ?? null,
      storyCount,
      share: total === 0 ? 0 : storyCount / total,
    };
  });
  return { rows };
};
