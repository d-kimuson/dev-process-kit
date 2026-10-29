import type { UsmMessages } from './messages';

import {
  assigneeOf,
  findEstimate,
  findMilestone,
  findStatus,
  findStep,
  findStory,
  labelsOfStory,
  type StoryLink,
  type UserStory,
  type UsmState,
} from './model';
import { storyKey } from './story-key';

/** How people name a story in a message: its key and its title (`STORY-12 ログインできる`). */
export const storyIdTitle = (story: UserStory): string => `${storyKey(story)} ${story.name}`;

/** Where the story sits: `Activity › Step`, with the slice when it has one. */
const stepPath = (state: UsmState, story: UserStory): string | undefined => {
  const located = findStep(state, `${story.activityId}.${story.stepId}`);
  if (!located) return undefined;
  const milestone = findMilestone(state, story.milestoneId);
  const path = `${located.activity.name} › ${located.step.name}`;
  return milestone ? `${path} (${milestone.name})` : path;
};

/** The keys of the stories that wait on this one, in map order. */
const dependentKeys = (state: UsmState, story: UserStory): readonly string[] =>
  state.stories.filter((other) => (other.blockedBy ?? []).includes(story.id)).map((other) => storyKey(other));

/** The keys of the stories this one waits on, in the order it lists them; a missing one is skipped. */
const blockerKeys = (state: UsmState, story: UserStory): readonly string[] =>
  (story.blockedBy ?? []).flatMap((id) => {
    const blocker = findStory(state, id);
    return blocker ? [storyKey(blocker)] : [];
  });

/** A link the way Markdown writes it: its label when it has one, else the URL itself. */
const linkMarkdown = (link: StoryLink): string => `[${link.label ?? link.url}](${link.url})`;

/**
 * The story as Markdown, so a card can be pasted into an issue, a chat or a
 * brief: its key and title as a heading, the metadata the map knows about it
 * as a list, then the description exactly as it was written.
 *
 * The list's names are the map's own (the panel's field headings) where they
 * fit, and the copy's own short names (`Blocks`, `Waits on`) where a heading
 * would read long in a list. A field with no value is left out rather than
 * written empty, so a bare story copies as a heading and its description.
 * There is no trailing whitespace and the text ends with one newline.
 */
export const storyInfoMarkdown = (m: UsmMessages, state: UsmState, story: UserStory): string => {
  const fields: string[] = [];
  const field = (label: string, value: string): void => {
    fields.push(`- ${label}: ${value}`);
  };
  const status = findStatus(state, story.statusId);
  if (status) field(m.storyStatusLabel, status.name);
  const path = stepPath(state, story);
  if (path) field(m.copyInfoStep, path);
  const estimate = findEstimate(state, story.estimateId);
  if (estimate) field(m.storyEstimateLabel, `${estimate.name} (${estimate.points})`);
  const assignee = assigneeOf(state, story);
  if (assignee) field(m.storyAssigneeLabel, assignee.name);
  const labels = labelsOfStory(state, story).map((label) => label.name);
  if (labels.length > 0) field(m.storyLabelsLabel, labels.join(', '));
  const blocks = dependentKeys(state, story);
  if (blocks.length > 0) field(m.copyInfoBlocks, blocks.join(', '));
  const waitsOn = blockerKeys(state, story);
  if (waitsOn.length > 0) field(m.copyInfoWaitsOn, waitsOn.join(', '));
  const links = (story.links ?? []).map(linkMarkdown);
  if (links.length > 0) field(m.storyLinksLabel, links.join(', '));
  const lines = [`### ${storyIdTitle(story)}`];
  if (fields.length > 0) lines.push('', ...fields);
  const description = (story.description ?? '').replace(/\s+$/, '');
  if (description !== '') lines.push('', description);
  // A Markdown hard break is two trailing spaces, which the plain text does not need.
  return `${lines
    .join('\n')
    .replace(/[ \t]+$/gm, '')
    .trimEnd()}\n`;
};
