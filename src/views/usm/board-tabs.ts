import type { Navigation } from '../../core/types';

import { hasFeature, type UsmFeature, type UsmState } from './model';

/**
 * The pages of the template: the story map itself, the milestones it is
 * sliced into and how the milestones burn down (with the estimate scale).
 * Which one is on screen is navigation, never a draft action. What the map is
 * made of — the statuses its stories move through, the labels they carry and
 * the members they are assigned to — is defined in the settings dialog
 * (`DpkViewUsm.renderSettingsSections`), not on a page of its own.
 */
export const USM_TABS = ['map', 'table', 'milestones', 'burndown'] as const;

export type UsmTab = (typeof USM_TABS)[number];

/** The optional feature a tab belongs to: while the feature is off, the tab is not there. */
const TAB_FEATURES: { readonly [tab in UsmTab]?: UsmFeature } = { burndown: 'estimates' };

/** The tabs the map has, in order: every tab but those of a feature that is off. */
export const usmTabsOf = (state: UsmState): readonly UsmTab[] => {
  return USM_TABS.filter((tab) => {
    const feature = TAB_FEATURES[tab];
    return feature === undefined || hasFeature(state, feature);
  });
};

export const usmTabOf = (state: UsmState, nav: Navigation): UsmTab => {
  return usmTabsOf(state).find((tab) => tab === nav['tab']) ?? 'map';
};
