import type { UsmState } from './model';

/**
 * Palette tokens (`--dpk-<tone>`) that tell activities apart. The same tone
 * marks an activity's band, its stories on the map and its share of a
 * milestone, so a reader can follow one activity across both tabs.
 */
export const ACTIVITY_TONES = ['blue', 'violet', 'green', 'amber', 'accent'] as const;

export type ActivityTone = (typeof ACTIVITY_TONES)[number];

/** Each activity's tone by its backbone position, cycling once the palette runs out. */
export const activityTones = (state: UsmState): ReadonlyMap<string, ActivityTone> => {
  return new Map(
    state.activities.map((activity, index) => [activity.id, ACTIVITY_TONES[index % ACTIVITY_TONES.length] ?? 'blue']),
  );
};
