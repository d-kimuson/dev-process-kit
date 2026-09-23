import { describe, expect, it } from 'vitest';

import { ArtifactController } from '../../core/controller';
import { prototypeDefinition } from './definition';
import { parsePrototypeBase } from './model';

const base = parsePrototypeBase({
  title: 'Demo',
  activities: [
    {
      id: 'onboarding',
      name: 'Onboarding',
      stories: [
        {
          id: 'account',
          name: 'Account',
          steps: [
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B' },
          ],
        },
        { id: 'profile', name: 'Profile', steps: [{ id: 'p', name: 'P' }] },
      ],
    },
  ],
});

const controller = () => new ArtifactController({ definition: prototypeDefinition, base, storage: null });

const moveStep = (id: string, toStory: string, after: string | null) => ({
  type: 'MOVE_STEP',
  target: { type: 'step', id },
  payload: { toStory, after },
});

describe('prototype draft', () => {
  it('cancels a step moved to another story and back', () => {
    const c = controller();
    expect(c.dispatch(moveStep('a', 'profile', 'p')).ok).toBe(true);
    expect(c.actions).toHaveLength(1);
    expect(c.dispatch(moveStep('a', 'account', null)).ok).toBe(true);
    expect(c.actions).toEqual([]);
    expect(c.derivation.state).toEqual(base);
  });
});
