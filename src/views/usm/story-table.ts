import type { TableColumn, TableData, TableRow, TableTone } from '../../components/table/index';
import type { UsmMessages } from './messages';

import {
  assigneeOf,
  findEstimate,
  findMilestone,
  findStatus,
  findStep,
  hasFeature,
  labelsOfStory,
  stepRefOf,
  type StatusTone,
  type UsmState,
} from './model';
import { storyKey } from './story-key';

/** The stable id `dpk-table` renders the flat story view under. */
export const STORY_TABLE_ID = 'usm-story-table';

/** The generic table's tone palette has no `accent` entry; `accent` (brand indigo) reads closest to `violet`. */
const toTableTone = (tone: StatusTone): TableTone => (tone === 'accent' ? 'violet' : tone);

/**
 * A flat view of every story on the map, one row each, alongside the 2D
 * board: the same stories, filterable and sortable in the browser, with
 * columns for the optional features (estimates, assignees) only once the map
 * turns them on. Pure: `renderStoryTable` wires it onto `dpk-table`.
 */
export const presentStoryTable = (m: UsmMessages, state: UsmState): TableData => {
  const columns: TableColumn[] = [
    { id: 'key', label: m.storyKeyColumn, type: 'text', sortable: true },
    { id: 'name', label: m.storyTitleLabel, type: 'text', sortable: true },
    { id: 'activity', label: m.activityNameLabel, type: 'text', sortable: true },
    { id: 'step', label: m.stepNameLabel, type: 'text', sortable: true },
    { id: 'milestone', label: m.burndownMilestoneLabel, type: 'text', sortable: true },
    ...(state.statuses.length === 0
      ? []
      : [{ id: 'status', label: m.storyStatusLabel, type: 'status', sortable: true } as const]),
    ...(hasFeature(state, 'assignees')
      ? [{ id: 'assignee', label: m.storyAssigneeLabel, type: 'person', sortable: true } as const]
      : []),
    ...(hasFeature(state, 'estimates')
      ? [{ id: 'estimate', label: m.storyEstimateLabel, type: 'number', sortable: true } as const]
      : []),
    ...(state.labels.length === 0
      ? []
      : [{ id: 'labels', label: m.storyLabelsLabel, type: 'tag', sortable: false } as const]),
  ];

  const rows: TableRow[] = state.stories.map((story): TableRow => {
    const found = findStep(state, stepRefOf(story.activityId, story.stepId));
    const milestone = findMilestone(state, story.milestoneId);
    const status = findStatus(state, story.statusId);
    const estimate = findEstimate(state, story.estimateId);
    const assignee = assigneeOf(state, story);
    const labels = labelsOfStory(state, story);
    return {
      id: story.id,
      cells: {
        key: { type: 'text', value: storyKey(story) },
        name: { type: 'text', value: story.name },
        activity: { type: 'text', value: found?.activity.name ?? null },
        step: { type: 'text', value: found?.step.name ?? null },
        milestone: { type: 'text', value: milestone?.name ?? null },
        ...(status === undefined
          ? {}
          : { status: { type: 'status', value: { label: status.name, tone: toTableTone(status.tone) } } }),
        ...(hasFeature(state, 'assignees') ? { assignee: { type: 'person', value: assignee?.name ?? null } } : {}),
        ...(hasFeature(state, 'estimates') ? { estimate: { type: 'number', value: estimate?.points ?? null } } : {}),
        ...(state.labels.length === 0 ? {} : { labels: { type: 'tag', value: labels.map((label) => label.name) } }),
      },
      ...(story.questions === undefined ? {} : { questions: story.questions }),
    };
  });

  return { columns, rows };
};
