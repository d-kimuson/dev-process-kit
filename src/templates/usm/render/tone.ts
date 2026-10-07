import type { ActivityTone } from '../activity-tone';

/** The activity's palette token as an inline custom property, read by the board, the cards and the milestones tab. */
export const toneStyle = (tone: ActivityTone | undefined): string => `--usm-tone: var(--dpk-${tone ?? 'blue'})`;
