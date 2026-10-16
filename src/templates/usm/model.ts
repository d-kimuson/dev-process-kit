import { sortBy } from 'es-toolkit/array';
import * as v from 'valibot';

import { entityIdSchema, splitPath } from '../../core/schema';
import { findBlockerCycle } from './dependency-graph';

export type BackboneStep = {
  readonly id: string;
  readonly name: string;
};

export type BackboneActivity = {
  readonly id: string;
  readonly name: string;
  /** Whose experience it is (`管理者`, `一般ユーザー`), shown as a label. */
  readonly actor?: string;
  readonly steps: readonly BackboneStep[];
};

export type Milestone = {
  readonly id: string;
  readonly name: string;
  /** When the slice is meant to ship, as free text (`2026年10月`, `Q4`). */
  readonly timeframe?: string;
  /** What the slice stands for (`必要最低限の機能群`). */
  readonly description?: string;
  /** The day the slice is due, `YYYY-MM-DD`: where its burndown has to reach zero. */
  readonly dueDate?: string;
};

/**
 * Palette tokens (`--dpk-<tone>`) a status may color its stories with. `gray`
 * is the neutral ink, for a status that should not draw the eye.
 */
export const STATUS_TONES = ['gray', 'blue', 'violet', 'green', 'amber', 'accent'] as const;

export type StatusTone = (typeof STATUS_TONES)[number];

/**
 * Icons a status may show. `progress` is a ring that fills up with the
 * status's place in the workflow (a check at the end); the rest are fixed.
 */
export const STATUS_ICONS = [
  'progress',
  'circle',
  'lightbulb',
  'flag',
  'play',
  'clock',
  'eye',
  'pause',
  'check',
  'x',
] as const;

export type StatusIcon = (typeof STATUS_ICONS)[number];

/**
 * Where a story stands (`Idea`, `Ready`, `Done` …). The set is data, so the
 * author and the reader decide which statuses the map has.
 */
export type StoryStatus = {
  readonly id: string;
  readonly name: string;
  readonly tone: StatusTone;
  readonly icon: StatusIcon;
  /**
   * The share of a story's work done while it stands in this status, in parts
   * of 10 across every status but the last (Idea 7, Demo 2, Ready 1). Another
   * total is read as a ratio. Weighs the work left while the `weights` feature
   * is on; left out it counts 1, and the last status has no work left.
   */
  readonly weight?: number;
};

/** One size on the map's estimate scale: a name the team says (`M`, `3`) and the points it stands for. */
export type Estimate = {
  readonly id: string;
  readonly name: string;
  readonly points: number;
};

/** How many stories (and how many points) stood in one status of one milestone. */
export type TallyRow = {
  /** Left out for the stories in no milestone. */
  readonly milestoneId?: string;
  /** Left out on a map without statuses. */
  readonly statusId?: string;
  readonly stories: number;
  readonly points: number;
};

/**
 * The map's totals at one moment, kept as a record: later edits to the
 * stories or the scale do not rewrite it. The burndown is drawn from these.
 */
export type Snapshot = {
  readonly id: string;
  /** When it was taken, as an ISO timestamp. */
  readonly at: string;
  readonly tally: readonly TallyRow[];
};

/**
 * A free tag a story may carry (`Dev`, `PdM`, `Spike` …). The kit attaches no
 * meaning to it: what the labels sort stories by is up to the team.
 */
export type StoryLabel = {
  readonly id: string;
  readonly name: string;
  readonly tone: StatusTone;
};

/**
 * Someone on the team a story may be assigned to. Like a label it is just a
 * name and a color: the kit knows nothing of accounts.
 */
export type Member = {
  readonly id: string;
  readonly name: string;
  readonly tone: StatusTone;
};

/**
 * The parts of the map a team may do without, off unless the base turns them
 * on: `estimates` is the estimate scale and the burndown; `weights` shares a
 * story's work out between the statuses by their weights (off, a story not
 * finished has all of it ahead); `assignees` is the members and who each
 * story is assigned to. While a feature is off what it holds is kept, only
 * left out of sight.
 */
export const USM_FEATURES = ['estimates', 'weights', 'assignees'] as const;

export type UsmFeature = (typeof USM_FEATURES)[number];

/** Something the story points at: an issue, a pull request, a design, a doc. */
export type StoryLink = {
  readonly url: string;
  /** Shown instead of the label derived from the URL. */
  readonly label?: string;
};

export type UserStory = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly activityId: string;
  readonly stepId: string;
  readonly milestoneId?: string;
  /**
   * Where the story stands. Once the map has statuses every story has one
   * (base data that leaves it out starts at the first status); a map without
   * statuses has none.
   */
  readonly statusId?: string;
  readonly links?: readonly StoryLink[];
  /** The labels the story carries, each once. */
  readonly labelIds?: readonly string[];
  /** The stories that must be finished before this one can start, each once; never a cycle. */
  readonly blockedBy?: readonly string[];
  /** Its size on the map's estimate scale; left out, it is not estimated yet. */
  readonly estimateId?: string;
  /** The member it is assigned to; left out, no one is. */
  readonly assigneeId?: string;
};

export type UsmState = {
  readonly title?: string;
  /** The optional features turned on, in the order of `USM_FEATURES`. */
  readonly features: readonly UsmFeature[];
  readonly activities: readonly BackboneActivity[];
  readonly milestones: readonly Milestone[];
  readonly statuses: readonly StoryStatus[];
  readonly labels: readonly StoryLabel[];
  readonly members: readonly Member[];
  readonly estimates: readonly Estimate[];
  readonly stories: readonly UserStory[];
  readonly snapshots: readonly Snapshot[];
};

/** A real calendar day as `YYYY-MM-DD`: `2026-02-30` is not one. */
export const dueDateSchema = v.pipe(
  v.string(),
  v.isoDate(),
  v.check((value) => {
    const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }, 'a due date must be a calendar day'),
);
export const statusWeightSchema = v.pipe(v.number(), v.finite(), v.minValue(0));
export const estimatePointsSchema = v.pipe(v.number(), v.finite(), v.minValue(0));
export const tallyRowSchema = v.strictObject({
  milestoneId: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  statusId: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  stories: v.pipe(v.number(), v.integer(), v.minValue(0)),
  points: v.pipe(v.number(), v.finite(), v.minValue(0)),
});
export const snapshotAtSchema = v.pipe(v.string(), v.isoTimestamp());
const stepSchema = v.strictObject({ id: v.pipe(v.string(), v.minLength(1)), name: v.pipe(v.string(), v.minLength(1)) });
const activitySchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  actor: v.exactOptional(v.string()),
  steps: v.optional(v.array(stepSchema), []),
});
const milestoneSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  timeframe: v.exactOptional(v.string()),
  description: v.exactOptional(v.string()),
  dueDate: v.exactOptional(dueDateSchema),
});
export const statusToneSchema = v.picklist(STATUS_TONES);
export const statusIconSchema = v.picklist(STATUS_ICONS);
/** Only web links: a story never points at `javascript:` or a local file. */
export const linkUrlSchema = v.pipe(
  v.string(),
  v.url(),
  v.check((url) => /^https?:\/\//i.test(url), 'a link must be an http(s) URL'),
);
const linkSchema = v.strictObject({ url: linkUrlSchema, label: v.exactOptional(v.pipe(v.string(), v.minLength(1))) });
const statusSchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  tone: v.optional(statusToneSchema),
  icon: v.optional(statusIconSchema),
  weight: v.exactOptional(statusWeightSchema),
});
const labelSchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  tone: v.optional(statusToneSchema),
});
const storySchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  activityId: v.pipe(v.string(), v.minLength(1)),
  stepId: v.pipe(v.string(), v.minLength(1)),
  milestoneId: v.exactOptional(v.string()),
  statusId: v.exactOptional(v.string()),
  links: v.exactOptional(v.array(linkSchema)),
  labelIds: v.exactOptional(v.array(v.pipe(v.string(), v.minLength(1)))),
  blockedBy: v.exactOptional(v.array(v.pipe(v.string(), v.minLength(1)))),
  estimateId: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  assigneeId: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
});
const memberSchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  tone: v.optional(statusToneSchema),
});
export const usmFeatureSchema = v.picklist(USM_FEATURES);
const estimateSchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  points: estimatePointsSchema,
});
const snapshotSchema = v.strictObject({
  id: entityIdSchema,
  at: snapshotAtSchema,
  tally: v.array(tallyRowSchema),
});

export const usmBaseSchema = v.strictObject({
  title: v.exactOptional(v.string()),
  features: v.optional(v.array(usmFeatureSchema), []),
  activities: v.optional(v.array(activitySchema), []),
  milestones: v.optional(v.array(milestoneSchema), []),
  statuses: v.optional(v.array(statusSchema), []),
  labels: v.optional(v.array(labelSchema), []),
  members: v.optional(v.array(memberSchema), []),
  estimates: v.optional(v.array(estimateSchema), []),
  stories: v.optional(v.array(storySchema), []),
  snapshots: v.optional(v.array(snapshotSchema), []),
});

/** A status without its own tone takes the palette's next one by position. */
export const defaultStatusTone = (index: number): StatusTone => STATUS_TONES[index % STATUS_TONES.length] ?? 'gray';

/**
 * A label without its own tone takes the palette by position, skipping the
 * neutral gray so a fresh label stands out from the card.
 */
export const defaultLabelTone = (index: number): StatusTone => defaultStatusTone(index + 1);

export const parseUsmBase = (input: unknown): UsmState => {
  const raw = v.parse(usmBaseSchema, input);
  if (new Set(raw.features).size !== raw.features.length) throw new Error('the base turns a feature on twice');
  const firstStatus = raw.statuses[0]?.id;
  const parsed: UsmState = {
    ...raw,
    stories:
      firstStatus === undefined
        ? raw.stories
        : raw.stories.map((story) => (story.statusId === undefined ? { ...story, statusId: firstStatus } : story)),
    statuses: raw.statuses.map((status, index) => ({
      ...status,
      tone: status.tone ?? defaultStatusTone(index),
      icon: status.icon ?? 'progress',
    })),
    labels: raw.labels.map((label, index) => ({ ...label, tone: label.tone ?? defaultLabelTone(index) })),
    members: raw.members.map((member, index) => ({ ...member, tone: member.tone ?? defaultLabelTone(index) })),
    features: USM_FEATURES.filter((feature) => raw.features.includes(feature)),
  };
  const stepIds = new Map<string, string>();
  for (const activity of parsed.activities) {
    for (const step of activity.steps) stepIds.set(step.id, activity.id);
  }
  const milestoneIds = new Set(parsed.milestones.map((milestone) => milestone.id));
  const statusIds = new Set(parsed.statuses.map((status) => status.id));
  const labelIds = new Set(parsed.labels.map((label) => label.id));
  const seen = new Set<string>();
  const checkDuplicate = (kind: string, id: string): void => {
    if (seen.has(id)) throw new Error(`duplicate id "${id}" in ${kind}`);
    seen.add(id);
  };
  for (const activity of parsed.activities) {
    checkDuplicate('activities', activity.id);
    for (const step of activity.steps) checkDuplicate('steps', step.id);
  }
  for (const milestone of parsed.milestones) checkDuplicate('milestones', milestone.id);
  for (const status of parsed.statuses) checkDuplicate('statuses', status.id);
  for (const label of parsed.labels) checkDuplicate('labels', label.id);
  for (const member of parsed.members) checkDuplicate('members', member.id);
  for (const estimate of parsed.estimates) checkDuplicate('estimates', estimate.id);
  for (const snapshot of parsed.snapshots) checkDuplicate('snapshots', snapshot.id);
  const estimateIds = new Set(parsed.estimates.map((estimate) => estimate.id));
  const memberIds = new Set(parsed.members.map((member) => member.id));
  for (const story of parsed.stories) {
    checkDuplicate('stories', story.id);
    const ownerActivity = stepIds.get(story.stepId);
    if (ownerActivity === undefined || ownerActivity !== story.activityId) {
      throw new Error(`story "${story.id}" references unknown activityId/stepId`);
    }
    if (story.milestoneId !== undefined && !milestoneIds.has(story.milestoneId)) {
      throw new Error(`story "${story.id}" references unknown milestoneId "${story.milestoneId}"`);
    }
    const urls = (story.links ?? []).map((link) => link.url);
    if (new Set(urls).size !== urls.length) throw new Error(`story "${story.id}" links the same URL twice`);
    if (story.statusId !== undefined && !statusIds.has(story.statusId)) {
      throw new Error(`story "${story.id}" references unknown statusId "${story.statusId}"`);
    }
    const storyLabels = story.labelIds ?? [];
    if (new Set(storyLabels).size !== storyLabels.length) throw new Error(`story "${story.id}" has a label twice`);
    const unknownLabel = storyLabels.find((id) => !labelIds.has(id));
    if (unknownLabel !== undefined) {
      throw new Error(`story "${story.id}" references unknown labelId "${unknownLabel}"`);
    }
    if (story.estimateId !== undefined && !estimateIds.has(story.estimateId)) {
      throw new Error(`story "${story.id}" references unknown estimateId "${story.estimateId}"`);
    }
    if (story.assigneeId !== undefined && !memberIds.has(story.assigneeId)) {
      throw new Error(`story "${story.id}" references unknown assigneeId "${story.assigneeId}"`);
    }
  }
  for (const snapshot of parsed.snapshots) {
    const problem = tallyProblem(parsed, snapshot.tally);
    if (problem !== null) throw new Error(`snapshot "${snapshot.id}" ${problem}`);
  }
  const storyIds = new Set(parsed.stories.map((story) => story.id));
  for (const story of parsed.stories) {
    const blockers = story.blockedBy ?? [];
    if (blockers.includes(story.id)) throw new Error(`story "${story.id}" is blocked by itself`);
    if (new Set(blockers).size !== blockers.length) throw new Error(`story "${story.id}" has a blocker twice`);
    const unknownBlocker = blockers.find((id) => !storyIds.has(id));
    if (unknownBlocker !== undefined) {
      throw new Error(`story "${story.id}" references unknown blocker "${unknownBlocker}"`);
    }
  }
  const cycle = findBlockerCycle(parsed.stories);
  if (cycle !== null) throw new Error(`stories block one another in a cycle: ${cycle.join(' → ')}`);
  return parsed;
};

/**
 * Why a tally does not fit the map, or `null` when it does: every row names a
 * milestone and a status the map has, and each pair once.
 */
export const tallyProblem = (state: UsmState, tally: readonly TallyRow[]): string | null => {
  const seen = new Set<string>();
  for (const row of tally) {
    if (row.milestoneId !== undefined && !findMilestone(state, row.milestoneId)) {
      return `references unknown milestoneId "${row.milestoneId}"`;
    }
    if (row.statusId !== undefined && !findStatus(state, row.statusId)) {
      return `references unknown statusId "${row.statusId}"`;
    }
    const key = tallyKey(row);
    if (seen.has(key)) return `tallies "${key}" twice`;
    seen.add(key);
  }
  return null;
};

/** The milestone and status a tally row counts, as one key. */
export const tallyKey = (row: {
  readonly milestoneId?: string | undefined;
  readonly statusId?: string | undefined;
}): string => `${row.milestoneId ?? ''}/${row.statusId ?? ''}`;

export const emptyUsmBase = (): UsmState => {
  return {
    features: [],
    activities: [],
    milestones: [],
    statuses: [],
    labels: [],
    members: [],
    estimates: [],
    stories: [],
    snapshots: [],
  };
};

export const findActivity = (state: UsmState, id: string | undefined): BackboneActivity | undefined => {
  if (id === undefined) return undefined;
  return state.activities.find((activity) => activity.id === id);
};

/** Canonical reference of a backbone column: `onboarding.signup`. */
export const stepRefOf = (activityId: string, stepId: string): string => {
  return `${activityId}.${stepId}`;
};

/**
 * Accepts `activityId.stepId` or a bare step id.
 *
 * The path is the canonical form: two activities may both own a `signup`
 * column, so only the qualified ref is unambiguous for a draft action.
 */
export const findStep = (
  state: UsmState,
  ref: string | undefined,
): { activity: BackboneActivity; step: BackboneStep } | undefined => {
  if (ref === undefined) return undefined;
  const path = splitPath(ref, 2);
  if (path) {
    const [activityId, stepId] = path;
    if (activityId === undefined || stepId === undefined) return undefined;
    const activity = state.activities.find((candidate) => candidate.id === activityId);
    const step = activity?.steps.find((candidate) => candidate.id === stepId);
    return activity && step ? { activity, step } : undefined;
  }
  if (ref.includes('.')) return undefined;
  for (const activity of state.activities) {
    const step = activity.steps.find((candidate) => candidate.id === ref);
    if (step) return { activity, step };
  }
  return undefined;
};

export const findMilestone = (state: UsmState, id: string | undefined): Milestone | undefined => {
  if (id === undefined) return undefined;
  return state.milestones.find((milestone) => milestone.id === id);
};

export const findStatus = (state: UsmState, id: string | undefined): StoryStatus | undefined => {
  if (id === undefined) return undefined;
  return state.statuses.find((status) => status.id === id);
};

export const findLabel = (state: UsmState, id: string | undefined): StoryLabel | undefined => {
  if (id === undefined) return undefined;
  return state.labels.find((label) => label.id === id);
};

/** Whether the map has `feature` turned on. */
export const hasFeature = (state: UsmState, feature: UsmFeature): boolean => state.features.includes(feature);

export const findMember = (state: UsmState, id: string | undefined): Member | undefined => {
  if (id === undefined) return undefined;
  return state.members.find((member) => member.id === id);
};

/** The member a story is assigned to, if any. */
export const assigneeOf = (state: UsmState, story: UserStory): Member | undefined =>
  findMember(state, story.assigneeId);

export const findEstimate = (state: UsmState, id: string | undefined): Estimate | undefined => {
  if (id === undefined) return undefined;
  return state.estimates.find((estimate) => estimate.id === id);
};

export const findSnapshot = (state: UsmState, id: string | undefined): Snapshot | undefined => {
  if (id === undefined) return undefined;
  return state.snapshots.find((snapshot) => snapshot.id === id);
};

/** The labels a story carries, in the order of the labels tab. */
export const labelsOfStory = (state: UsmState, story: UserStory): readonly StoryLabel[] => {
  const carried = new Set(story.labelIds ?? []);
  return state.labels.filter((label) => carried.has(label.id));
};

export const findStory = (state: UsmState, id: string | undefined): UserStory | undefined => {
  if (id === undefined) return undefined;
  return state.stories.find((story) => story.id === id);
};

/** Flat backbone columns in display order. */
export const flatSteps = (state: UsmState): readonly { activity: BackboneActivity; step: BackboneStep }[] => {
  return state.activities.flatMap((activity) => activity.steps.map((step) => ({ activity, step })));
};

/**
 * Stories are only ever shown per cell, so their order across cells is
 * incidental: moving a story away and back regroups the array but not the map.
 */
export const canonicalUsmState = (state: UsmState): UsmState => ({
  ...state,
  stories: sortBy(state.stories, [(story) => `${story.activityId}/${story.stepId}/${story.milestoneId ?? ''}`]),
});

/** Stories in one map cell, preserving global story order. */
export const storiesInCell = (
  state: UsmState,
  stepId: string,
  milestoneId: string | undefined,
): readonly UserStory[] => {
  return state.stories.filter((story) => story.stepId === stepId && (story.milestoneId ?? undefined) === milestoneId);
};

/** Stories in one activity-view cell (a whole activity in one column). */
export const storiesInActivity = (
  state: UsmState,
  activityId: string,
  milestoneId: string | undefined,
): readonly UserStory[] => {
  return state.stories.filter(
    (story) => story.activityId === activityId && (story.milestoneId ?? undefined) === milestoneId,
  );
};

export const allUsmIds = (state: UsmState): string[] => {
  return [
    ...state.activities.map((activity) => activity.id),
    ...state.activities.flatMap((activity) => activity.steps.map((step) => step.id)),
    ...state.milestones.map((milestone) => milestone.id),
    ...state.statuses.map((status) => status.id),
    ...state.labels.map((label) => label.id),
    ...state.members.map((member) => member.id),
    ...state.estimates.map((estimate) => estimate.id),
    ...state.stories.map((story) => story.id),
    ...state.snapshots.map((snapshot) => snapshot.id),
  ];
};

export const storyCountForStep = (state: UsmState, stepId: string): number => {
  return state.stories.filter((story) => story.stepId === stepId).length;
};
