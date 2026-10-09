import type { ActivityTone } from '../activity-tone';
import type { StatusTone } from '../model';

/** The activity's palette token as an inline custom property, read by the board, the cards and the milestones tab. */
export const toneStyle = (tone: ActivityTone | undefined): string => `--usm-tone: var(--dpk-${tone ?? 'blue'})`;

/** A status's palette token; `gray` is the neutral ink, as is a story without a status. */
export const statusToneStyle = (tone: StatusTone | undefined): string =>
  `--usm-tone: var(--dpk-${tone === undefined || tone === 'gray' ? 'ink-faint' : tone})`;
