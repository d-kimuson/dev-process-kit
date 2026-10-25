import type { Locale } from '../../core/i18n';
import type { ActionTarget, ViewDefinition } from '../../core/types';

import { usmActions } from './actions';
import { applyUsmAction } from './apply';
import { usmMessages } from './messages';
import {
  canonicalUsmState,
  emptyUsmBase,
  findActivity,
  findEstimate,
  findLabel,
  findMember,
  findMilestone,
  findStatus,
  findSnapshot,
  findStep,
  findStory,
  hasFeature,
  parseUsmBase,
  stepRefOf,
  USM_FEATURES,
  type UsmState,
} from './model';
import {
  describeUsmAction,
  resolveUsmNavigation,
  serializeUsmAction,
  usmCommentTargets,
  usmCurrentTarget,
  usmNavigationFor,
  usmTitle,
} from './present';

export const usmHasTarget = (state: UsmState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'activity':
      return findActivity(state, target.id) !== undefined;
    case 'step':
      return findStep(state, target.id) !== undefined;
    case 'story':
      return findStory(state, target.id) !== undefined;
    case 'milestone':
      return findMilestone(state, target.id) !== undefined;
    case 'status':
      return findStatus(state, target.id) !== undefined;
    case 'label':
      return findLabel(state, target.id) !== undefined;
    case 'member':
      return findMember(state, target.id) !== undefined;
    case 'estimate':
      return findEstimate(state, target.id) !== undefined;
    case 'snapshot':
      return findSnapshot(state, target.id) !== undefined;
    case 'page':
      return true;
    default:
      return false;
  }
};

/** The user story mapping template, describing its actions in `locale`. */
export const usmDefinitionFor = (locale: Locale): ViewDefinition<UsmState> => {
  const m = usmMessages(locale);
  return {
    kind: 'view',
    name: 'usm',
    label: 'User Story Mapping',
    parseBase: parseUsmBase,
    emptyBase: emptyUsmBase,
    actions: usmActions,
    apply: applyUsmAction,
    canonicalState: canonicalUsmState,
    hasTarget: usmHasTarget,
    canonicalTarget: (state, target) => {
      if (target.type !== 'step') return target;
      const location = findStep(state, target.id);
      return location ? { ...target, id: stepRefOf(location.activity.id, location.step.id) } : target;
    },
    describe: (action, state, base) => describeUsmAction(m, action, state, base),
    serialize: serializeUsmAction,
    resolveNavigation: resolveUsmNavigation,
    navigationFor: usmNavigationFor,
    commentTargets: (state: UsmState, navigation) => usmCommentTargets(m, state, navigation),
    currentTarget: (state, navigation) => usmCurrentTarget(m, state, navigation),
    // Each optional feature is a switch in the shared header's settings.
    settings: (state) => ({
      items: USM_FEATURES.map((feature) => {
        const on = hasFeature(state, feature);
        return {
          key: feature,
          label: m.featureName(feature),
          hint: m.featureHint(feature),
          on,
          toggle: { type: 'SET_FEATURE', target: { type: 'page', id: 'usm' }, payload: { feature, enabled: !on } },
        };
      }),
      note: m.featuresNote,
    }),
    title: usmTitle,
  };
};
