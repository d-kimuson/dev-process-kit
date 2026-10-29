import type { StatusTone, UsmState } from './model';

export type MemberRow = {
  readonly id: string;
  readonly name: string;
  readonly tone: StatusTone;
  /** The member right before it, `null` for the first: where "move up" goes. */
  readonly previousId: string | null;
  /** The member right after it, `null` for the last: where "move down" goes. */
  readonly nextId: string | null;
  readonly storyCount: number;
  /** Fraction of every story on the map (0 on an empty map). */
  readonly share: number;
};

export type MemberOverview = {
  readonly rows: readonly MemberRow[];
};

/** The members section of the settings: each member in order and how many stories they are assigned. */
export const presentMemberOverview = (state: UsmState): MemberOverview => {
  const total = state.stories.length;
  const rows = state.members.map((member, index) => {
    const storyCount = state.stories.filter((story) => story.assigneeId === member.id).length;
    return {
      id: member.id,
      name: member.name,
      tone: member.tone,
      previousId: state.members[index - 1]?.id ?? null,
      nextId: state.members[index + 1]?.id ?? null,
      storyCount,
      share: total === 0 ? 0 : storyCount / total,
    };
  });
  return { rows };
};
