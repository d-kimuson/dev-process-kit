import { describe, expect, it } from 'vitest';

import type { ActionInput, DraftAction } from '../../core/types';

import { prototypeAction } from './actions';
import { applyPrototypeAction } from './apply';
import { prototypeDefinitionFor } from './definition';
import { prototypeMessages } from './messages';
import { findStep, parsePrototypeBase, stepRef, type PrototypeState } from './model';
import {
  describePrototypeAction,
  prototypePreviewUrl,
  resolvePrototypeNavigation,
  serializePrototypeAction,
} from './present';

const m = prototypeMessages('en');

const state = (): PrototypeState => {
  return parsePrototypeBase({
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
              {
                id: 'a',
                name: 'A',
                previews: [{ id: 'a-mobile', kind: 'browser', viewport: 'mobile' }],
              },
              { id: 'b', name: 'B' },
              { id: 'c', name: 'C' },
            ],
          },
          { id: 'profile', name: 'Profile', steps: [{ id: 'p', name: 'P' }] },
        ],
      },
      {
        id: 'daily',
        name: 'Daily',
        stories: [{ id: 'notes', name: 'Notes', steps: [{ id: 'n', name: 'N' }] }],
      },
    ],
  });
};

const action = (input: ActionInput): DraftAction => {
  return {
    id: input.id ?? 'test',
    type: input.type,
    target: typeof input.target === 'string' ? { type: 'step', id: input.target } : input.target,
    payload: input.payload ?? {},
    createdAt: '2026-01-01T00:00:00.000Z',
  };
};

const stepIds = (next: PrototypeState, storyId = 'account'): string[] =>
  next.activities
    .flatMap((activity) => activity.stories)
    .find((story) => story.id === storyId)
    ?.steps.map((step) => step.id) ?? [];

describe('prototype base parsing', () => {
  it('rejects unknown keys so authoring typos are loud', () => {
    expect(() => parsePrototypeBase({ activities: [{ id: 'a', name: 'A', oops: true }] })).toThrow();
    expect(() =>
      parsePrototypeBase({
        activities: [
          {
            id: 'a',
            name: 'A',
            stories: [
              {
                id: 's',
                name: 'S',
                steps: [{ id: 'x', name: 'X', previews: [{}] }],
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  it('defaults missing collections and preview fields', () => {
    const parsed = parsePrototypeBase({
      activities: [
        {
          id: 'a',
          name: 'A',
          stories: [
            {
              id: 's',
              name: 'S',
              steps: [{ id: 'x', name: 'X', previews: [{ id: 'p' }] }],
            },
          ],
        },
      ],
    });
    expect(parsed.activities[0]?.stories[0]?.steps[0]?.previews[0]).toMatchObject({
      kind: 'browser',
      viewport: 'fluid',
    });
    expect(parsePrototypeBase({})).toEqual({ activities: [] });
  });
});

describe('prototype preview url', () => {
  it('derives a placeholder domain from the title instead of a fake protocol', () => {
    expect(prototypePreviewUrl(state(), { id: 'a-mobile', kind: 'browser', viewport: 'mobile' })).toBe(
      'https://demo.example.com/a-mobile',
    );
  });

  it('honours an explicit base url and strips a trailing slash', () => {
    const withBase = { ...state(), baseUrl: 'https://app.kumoma.io/' };
    expect(prototypePreviewUrl(withBase, { id: 'a-mobile', kind: 'browser', viewport: 'mobile' })).toBe(
      'https://app.kumoma.io/a-mobile',
    );
    const bare = { ...state(), baseUrl: 'app.kumoma.io' };
    expect(prototypePreviewUrl(bare, { id: 'a-mobile', kind: 'browser', viewport: 'mobile' })).toBe(
      'https://app.kumoma.io/a-mobile',
    );
  });

  it('lets a preview override the url and falls back to a neutral domain', () => {
    expect(
      prototypePreviewUrl(state(), { id: 'x', kind: 'browser', viewport: 'fluid', url: 'https://a.example.com/x' }),
    ).toBe('https://a.example.com/x');
    expect(prototypePreviewUrl({ activities: [] }, { id: 'x', kind: 'browser', viewport: 'fluid' })).toBe(
      'https://page.example.com/x',
    );
  });
});

describe('prototype applyAction', () => {
  it('is pure: the input state is never mutated', () => {
    const base = state();
    const snapshot = JSON.stringify(base);
    applyPrototypeAction(base, action(prototypeAction.setStepName('a', 'Renamed')));
    applyPrototypeAction(base, action(prototypeAction.reorderStep('a', 'c')));
    applyPrototypeAction(base, action(prototypeAction.deleteStep('a')));
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it('renames through nested levels', () => {
    const next = applyPrototypeAction(state(), action(prototypeAction.setStepName('p', 'Profile step')));
    expect(next?.activities[0]?.stories[1]?.steps[0]?.name).toBe('Profile step');
  });

  it('is idempotent: applying the same patch twice gives the same page', () => {
    const once = applyPrototypeAction(state(), action(prototypeAction.reorderStep('a', 'c')));
    const twice = applyPrototypeAction(once ?? state(), action(prototypeAction.reorderStep('a', 'c')));
    expect(stepIds(once ?? state())).toEqual(['b', 'c', 'a']);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it('reorders with an idempotent anchor (after = null means first)', () => {
    const next = applyPrototypeAction(state(), action(prototypeAction.reorderStep('c', null)));
    expect(stepIds(next ?? state())).toEqual(['c', 'a', 'b']);
  });

  it('moves a step into another story', () => {
    const next = applyPrototypeAction(state(), action(prototypeAction.moveStep('a', 'profile', null)));
    expect(stepIds(next ?? state(), 'account')).toEqual(['b', 'c']);
    expect(stepIds(next ?? state(), 'profile')).toEqual(['a', 'p']);
  });

  it('returns null for unknown targets and anchors', () => {
    expect(applyPrototypeAction(state(), action(prototypeAction.setStepName('ghost', 'X')))).toBeNull();
    expect(applyPrototypeAction(state(), action(prototypeAction.reorderStep('a', 'ghost')))).toBeNull();
    expect(applyPrototypeAction(state(), action(prototypeAction.moveStep('a', 'ghost', null)))).toBeNull();
    expect(applyPrototypeAction(state(), action(prototypeAction.deletePreview('ghost')))).toBeNull();
  });

  it('treats re-adding an existing entity as a no-op', () => {
    const base = state();
    expect(applyPrototypeAction(base, action(prototypeAction.addStep('account', 'a', 'dup')))).toBe(base);
  });

  it('adds and deletes previews and steps', () => {
    const added = applyPrototypeAction(state(), action(prototypeAction.addStep('account', 'd', 'D')));
    expect(stepIds(added ?? state())).toEqual(['a', 'b', 'c', 'd']);
    const withPreview = applyPrototypeAction(
      added ?? state(),
      action(
        prototypeAction.addPreview('d', {
          id: 'd-mobile',
          kind: 'browser',
          viewport: 'mobile',
        }),
      ),
    );
    expect(withPreview?.activities[0]?.stories[0]?.steps[3]?.previews).toHaveLength(1);
    const deleted = applyPrototypeAction(withPreview ?? state(), action(prototypeAction.deletePreview('d-mobile')));
    expect(deleted?.activities[0]?.stories[0]?.steps[3]?.previews).toHaveLength(0);
  });

  it('deletes an activity and everything below it', () => {
    const next = applyPrototypeAction(
      state(),
      action({
        type: 'DELETE_ACTIVITY',
        target: { type: 'activity', id: 'onboarding' },
        payload: {},
      }),
    );
    expect(next?.activities.map((activity) => activity.id)).toEqual(['daily']);
  });
});

describe('prototype presentation', () => {
  it('describes rename actions with a before/after summary', () => {
    const description = describePrototypeAction(m, action(prototypeAction.setStepName('a', 'Renamed')), state());
    expect(description.title).toBe(m.renameStep);
    expect(description.targetLabel).toBe('Step · A');
    expect(description.summary).toContain('→');
  });

  it('does not throw for stale targets', () => {
    const stale = action(prototypeAction.setStepName('ghost', 'X'));
    expect(() => describePrototypeAction(m, stale, state())).not.toThrow();
    expect(describePrototypeAction(m, stale, state()).targetLabel).toContain('missing');
  });

  it('serializes to a stable one-liner', () => {
    expect(serializePrototypeAction(action(prototypeAction.setStepName('a', 'X')))).toBe(
      'SET_STEP_NAME step:a {"name":"X"}',
    );
  });

  it('offers comment targets for activity, story and step', () => {
    // Step refs carry the path: a bare step id is not unique across stories.
    expect(
      prototypeDefinitionFor('en')
        .commentTargets(state(), {})
        .map((option) => option.value),
    ).toEqual([
      'activity:onboarding',
      'story:onboarding.account',
      'step:onboarding.account.a',
      'step:onboarding.account.b',
      'step:onboarding.account.c',
      'story:onboarding.profile',
      'step:onboarding.profile.p',
      'activity:daily',
      'story:daily.notes',
      'step:daily.notes.n',
    ]);
  });
});

describe('prototype target refs', () => {
  it('builds a path ref and resolves it back', () => {
    const base = state();
    const location = findStep(base, 'onboarding.account.a');
    expect(location).toBeDefined();
    expect(stepRef(location!)).toBe('onboarding.account.a');
    expect(findStep(base, 'a')?.step.id).toBe('a');
  });

  it('keeps two same-named steps apart', () => {
    const base = parsePrototypeBase({
      activities: [
        { id: 'one', name: 'One', stories: [{ id: 's', name: 'S', steps: [{ id: 'landing', name: 'L1' }] }] },
        { id: 'two', name: 'Two', stories: [{ id: 's', name: 'S', steps: [{ id: 'landing', name: 'L2' }] }] },
      ],
    });
    expect(findStep(base, 'one.s.landing')?.step.name).toBe('L1');
    expect(findStep(base, 'two.s.landing')?.step.name).toBe('L2');
    // A draft action pointed at the path must not leak into the other story.
    const renamed = applyPrototypeAction(
      base,
      action({ type: 'SET_STEP_NAME', target: { type: 'step', id: 'two.s.landing' }, payload: { name: 'Renamed' } }),
    );
    expect(findStep(renamed ?? base, 'one.s.landing')?.step.name).toBe('L1');
    expect(findStep(renamed ?? base, 'two.s.landing')?.step.name).toBe('Renamed');
  });

  it('rejects ids that would make a path ambiguous, and duplicate ids', () => {
    const withDot = { activities: [{ id: 'a.b', name: 'A', stories: [] }] };
    expect(() => parsePrototypeBase(withDot)).toThrow();
    const duplicatePreview = {
      activities: [
        {
          id: 'a',
          name: 'A',
          stories: [{ id: 's', name: 'S', steps: [{ id: 'x', name: 'X', previews: [{ id: 'p' }] }] }],
        },
        {
          id: 'b',
          name: 'B',
          stories: [{ id: 's', name: 'S', steps: [{ id: 'y', name: 'Y', previews: [{ id: 'p' }] }] }],
        },
      ],
    };
    expect(() => parsePrototypeBase(duplicatePreview)).toThrow(/duplicate preview id/);
  });
});

describe('prototype navigation', () => {
  it('fills defaults without touching the hash', () => {
    const nav = resolvePrototypeNavigation(state(), {});
    expect(nav).toEqual({
      activity: 'onboarding',
      story: 'account',
      step: 'a',
      preview: 'a-mobile',
    });
  });

  it('resolves a deep link that only carries the step id', () => {
    const nav = resolvePrototypeNavigation(state(), { step: 'n' });
    expect(nav).toMatchObject({ activity: 'daily', story: 'notes', step: 'n' });
  });

  it('falls back to the first step when the id is unknown', () => {
    const nav = resolvePrototypeNavigation(state(), {
      activity: 'daily',
      step: 'ghost',
    });
    expect(nav).toMatchObject({ activity: 'daily', story: 'notes', step: 'n' });
  });

  it('resolves the preview tab and keeps unrelated keys untouched', () => {
    expect(resolvePrototypeNavigation(state(), { mode: 'walkthrough' })).toMatchObject({ mode: 'walkthrough' });
    expect(resolvePrototypeNavigation(state(), { step: 'a', preview: 'a-mobile' })).toMatchObject({
      preview: 'a-mobile',
    });
    // an unknown preview id falls back to the first preview of the step
    expect(resolvePrototypeNavigation(state(), { step: 'a', preview: 'nope' })).toMatchObject({
      preview: 'a-mobile',
    });
    // a step without previews drops the key entirely
    expect(resolvePrototypeNavigation(state(), { step: 'b', preview: 'a-mobile' })).not.toHaveProperty('preview');
  });
});
