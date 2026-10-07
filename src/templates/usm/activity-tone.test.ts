import { describe, expect, it } from 'vitest';

import { ACTIVITY_TONES, activityTones } from './activity-tone';
import { parseUsmBase } from './model';

describe('activity tones', () => {
  it('gives each activity a tone by backbone position, cycling through the palette', () => {
    const activities = Array.from({ length: ACTIVITY_TONES.length + 1 }, (_, index) => ({
      id: `a${index}`,
      name: `A${index}`,
    }));
    const tones = activityTones(parseUsmBase({ activities }));
    expect(tones.get('a0')).toBe(ACTIVITY_TONES[0]);
    expect(tones.get('a1')).toBe(ACTIVITY_TONES[1]);
    expect(tones.get(`a${ACTIVITY_TONES.length}`)).toBe(ACTIVITY_TONES[0]);
  });
});
