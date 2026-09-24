import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';
import type { PrototypeMessages } from './messages';

import { payloadFor, type ActionName } from '../../core/schema';
import { slugify, targetRef } from '../../core/target';
import { prototypeActions } from './actions';
import {
  findActivity,
  findPreview,
  findStep,
  findStory,
  stepRef,
  stepRefOf,
  storyRef,
  type PrototypePreview,
  type PrototypeState,
} from './model';

type Summary = {
  readonly title: string;
  readonly tone: ActionTone;
  readonly body?: string;
};

const arrow = (before: string | undefined, after: string): string => {
  return before === undefined ? `→ "${after}"` : `"${before}" → "${after}"`;
};

/**
 * Action vocabulary -> human text. This is the only place the CommentPanel
 * needs from the template besides `serialize`.
 */
const describers = (m: PrototypeMessages): Record<string, (action: DraftAction, state: PrototypeState) => Summary> =>
  ({
    SET_ACTIVITY_NAME: (action, state) => ({
      title: m.renameActivity,
      tone: 'update',
      body: arrow(
        findActivity(state, action.target.id)?.name,
        payloadFor(prototypeActions.SET_ACTIVITY_NAME, action).name,
      ),
    }),
    SET_ACTIVITY_DESCRIPTION: (action, state) => ({
      title: m.updateActivityDescription,
      tone: 'update',
      body: preview(
        findActivity(state, action.target.id)?.description,
        payloadFor(prototypeActions.SET_ACTIVITY_DESCRIPTION, action).description,
      ),
    }),
    SET_STORY_NAME: (action, state) => ({
      title: m.renameStory,
      tone: 'update',
      body: arrow(
        findStory(state, action.target.id)?.story.name,
        payloadFor(prototypeActions.SET_STORY_NAME, action).name,
      ),
    }),
    SET_STORY_DESCRIPTION: (action, state) => ({
      title: m.updateStoryDescription,
      tone: 'update',
      body: preview(
        findStory(state, action.target.id)?.story.description,
        payloadFor(prototypeActions.SET_STORY_DESCRIPTION, action).description,
      ),
    }),
    SET_STEP_NAME: (action, state) => ({
      title: m.renameStep,
      tone: 'update',
      body: arrow(
        findStep(state, action.target.id)?.step.name,
        payloadFor(prototypeActions.SET_STEP_NAME, action).name,
      ),
    }),
    SET_STEP_DESCRIPTION: (action, state) => ({
      title: m.updateStepDescription,
      tone: 'update',
      body: preview(
        findStep(state, action.target.id)?.step.description,
        payloadFor(prototypeActions.SET_STEP_DESCRIPTION, action).description,
      ),
    }),
    SET_PREVIEW_KIND: (action, state) => ({
      title: m.changePreviewKind,
      tone: 'update',
      body: arrow(
        findPreview(state, action.target.id)?.preview.kind,
        payloadFor(prototypeActions.SET_PREVIEW_KIND, action).kind,
      ),
    }),
    SET_PREVIEW_VIEWPORT: (action, state) => ({
      title: m.changePreviewViewport,
      tone: 'update',
      body: arrow(
        findPreview(state, action.target.id)?.preview.viewport,
        payloadFor(prototypeActions.SET_PREVIEW_VIEWPORT, action).viewport,
      ),
    }),
    SET_PREVIEW_LABEL: (action) => ({
      title: m.changePreviewLabel,
      tone: 'update',
      body: `→ "${payloadFor(prototypeActions.SET_PREVIEW_LABEL, action).label}"`,
    }),
    REORDER_ACTIVITY: (action) =>
      reorderSummary(m, m.activityGroup, payloadFor(prototypeActions.REORDER_ACTIVITY, action).after),
    REORDER_STORY: (action) =>
      reorderSummary(m, m.storyGroup, payloadFor(prototypeActions.REORDER_STORY, action).after),
    REORDER_STEP: (action) => reorderSummary(m, m.stepGroup, payloadFor(prototypeActions.REORDER_STEP, action).after),
    MOVE_STORY: (action, state) => ({
      title: m.moveStory,
      tone: 'move',
      body: `→ ${findActivity(state, payloadFor(prototypeActions.MOVE_STORY, action).toActivity)?.name ?? payloadFor(prototypeActions.MOVE_STORY, action).toActivity}`,
    }),
    MOVE_STEP: (action, state) => ({
      title: m.moveStep,
      tone: 'move',
      body: `→ ${findStory(state, payloadFor(prototypeActions.MOVE_STEP, action).toStory)?.story.name ?? payloadFor(prototypeActions.MOVE_STEP, action).toStory}`,
    }),
    ADD_ACTIVITY: (action) => addSummary(m, m.activityGroup, payloadFor(prototypeActions.ADD_ACTIVITY, action).name),
    ADD_STORY: (action) => addSummary(m, m.storyGroup, payloadFor(prototypeActions.ADD_STORY, action).name),
    ADD_STEP: (action) => addSummary(m, m.stepGroup, payloadFor(prototypeActions.ADD_STEP, action).name),
    ADD_PREVIEW: (action) =>
      addSummary(
        m,
        m.previewGroup,
        payloadFor(prototypeActions.ADD_PREVIEW, action).label ?? payloadFor(prototypeActions.ADD_PREVIEW, action).id,
      ),
    DELETE_ACTIVITY: (action, state) => deleteSummary(m, findActivity(state, action.target.id)?.name),
    DELETE_STORY: (action, state) => deleteSummary(m, findStory(state, action.target.id)?.story.name),
    DELETE_STEP: (action, state) => deleteSummary(m, findStep(state, action.target.id)?.step.name),
    DELETE_PREVIEW: (action, state) => deleteSummary(m, findPreview(state, action.target.id)?.preview.label),
  }) satisfies Record<ActionName<typeof prototypeActions>, (action: DraftAction, state: PrototypeState) => Summary>;

const preview = (before: string | undefined, after: string): string => {
  const trimmed = after.length > 90 ? `${after.slice(0, 90)}…` : after;
  return before === undefined || before === '' ? `→ "${trimmed}"` : `"${shorten(before)}" → "${trimmed}"`;
};

const shorten = (value: string): string => {
  return value.length > 60 ? `${value.slice(0, 60)}…` : value;
};

const reorderSummary = (m: PrototypeMessages, kind: string, after: string | null): Summary => {
  return {
    title: m.reorderTitle(kind),
    tone: 'move',
    body: after === null ? m.toFront : m.afterName(after),
  };
};

const addSummary = (m: PrototypeMessages, kind: string, name: string): Summary => {
  return { title: m.addTitle(kind), tone: 'create', body: `+ "${name}"` };
};

const deleteSummary = (m: PrototypeMessages, name: string | undefined): Summary => {
  return {
    title: m.deleteTitle,
    tone: 'delete',
    body: name === undefined ? m.unknownTarget : `− "${name}"`,
  };
};

export const describePrototypeAction = (
  m: PrototypeMessages,
  action: DraftAction,
  state: PrototypeState,
  base?: PrototypeState,
): ActionDescription => {
  const DESCRIBERS = describers(m);
  const describer = Object.hasOwn(DESCRIBERS, action.type) ? DESCRIBERS[action.type] : undefined;
  const summary: Summary = describer ? describer(action, base ?? state) : { title: action.type, tone: 'meta' };
  return {
    title: summary.title,
    targetLabel: prototypeTargetLabel(m, state, action.target),
    tone: summary.tone,
    ...(summary.body === undefined ? {} : { summary: summary.body }),
  };
};

export const serializePrototypeAction = (action: DraftAction): string => {
  return `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;
};

export const prototypeTargetLabel = (m: PrototypeMessages, state: PrototypeState, target: ActionTarget): string => {
  switch (target.type) {
    case 'activity': {
      const activity = findActivity(state, target.id);
      return activity ? m.targetLabel(m.activityGroup, activity.name) : m.targetMissing(m.activityGroup, target.id);
    }
    case 'story': {
      const story = findStory(state, target.id)?.story;
      return story ? m.targetLabel(m.storyGroup, story.name) : m.targetMissing(m.storyGroup, target.id);
    }
    case 'step': {
      const step = findStep(state, target.id)?.step;
      return step ? m.targetLabel(m.stepGroup, step.name) : m.targetMissing(m.stepGroup, target.id);
    }
    case 'preview': {
      const preview = findPreview(state, target.id)?.preview;
      return preview
        ? m.targetLabel(m.previewGroup, preview.label ?? preview.id)
        : m.targetMissing(m.previewGroup, target.id);
    }
    case 'page':
      return m.targetLabel(m.pageGroup, prototypeTitle(state));
    default:
      return m.targetLabel(target.type, target.id);
  }
};

/**
 * Address shown in the browser chrome. `preview.url` wins, then `baseUrl`, then
 * a placeholder domain derived from the page title
 * (`https://kumoma.example.com/<preview id>`), so a preview never shows an
 * internal id as if it were a protocol.
 */
export const prototypePreviewUrl = (state: PrototypeState, preview: PrototypePreview): string => {
  if (preview.url) return preview.url;
  const configured = state.baseUrl?.trim();
  // `slugify` answers 'item' when nothing usable is left; read that as "unnamed".
  const slug = slugify(state.title ?? '');
  const origin = configured
    ? configured.startsWith('http')
      ? configured
      : `https://${configured}`
    : `https://${slug === 'item' ? 'page' : slug}.example.com`;
  return `${origin.replace(/\/+$/, '')}/${preview.id}`;
};

export const prototypeCommentTargets = (
  m: PrototypeMessages,
  state: PrototypeState,
): readonly CommentTargetOption[] => {
  const options: CommentTargetOption[] = [];
  for (const activity of state.activities) {
    options.push({
      value: targetRef({ type: 'activity', id: activity.id }),
      label: activity.name,
      group: m.activityGroup,
    });
    for (const story of activity.stories) {
      options.push({
        value: targetRef({ type: 'story', id: storyRef(activity.id, story.id) }),
        label: `${activity.name} › ${story.name}`,
        group: m.storyGroup,
      });
      for (const step of story.steps) {
        options.push({
          value: targetRef({ type: 'step', id: stepRefOf(activity, story, step) }),
          label: `${story.name} › ${step.name}`,
          group: m.stepGroup,
        });
      }
    }
  }
  return options;
};

/**
 * The step the reader is looking at: the composer's "attach to this step"
 * checkbox, and the target of an page-wide note's counterpart.
 */
export const prototypeCurrentTarget = (
  m: PrototypeMessages,
  state: PrototypeState,
  nav: Navigation,
): CommentTargetOption | null => {
  const location = findStep(state, nav['step']);
  if (!location) return null;
  return { value: targetRef({ type: 'step', id: stepRef(location) }), label: location.step.name, group: m.stepGroup };
};

export const prototypeTitle = (state: PrototypeState): string => {
  return state.title ?? 'UX Prototype';
};

export const resolvePrototypeNavigation = (state: PrototypeState, nav: Navigation): Navigation => {
  const requestedActivity = findActivity(state, nav['activity']);
  const requestedStory = nav['story'];
  const scopedStory = requestedActivity?.stories.find(
    (story) => story.id === requestedStory || storyRef(requestedActivity.id, story.id) === requestedStory,
  );
  const requestedStep = nav['step'];
  const scopedStep =
    requestedActivity && scopedStory && requestedStep
      ? findStep(state, `${storyRef(requestedActivity.id, scopedStory.id)}.${requestedStep}`)
      : undefined;
  const located = scopedStep ?? findStep(state, requestedStep);
  const storyLocation =
    scopedStory && requestedActivity
      ? { activity: requestedActivity, story: scopedStory }
      : findStory(state, requestedStory);
  const activity = located?.activity ?? requestedActivity ?? storyLocation?.activity ?? state.activities[0];
  const story =
    located?.story ??
    (storyLocation && storyLocation.activity === activity ? storyLocation.story : undefined) ??
    activity?.stories[0];
  const step = located?.step ?? story?.steps[0];
  const next: Record<string, string> = { ...nav };
  if (activity) next['activity'] = activity.id;
  else delete next['activity'];
  if (story && activity) next['story'] = findStory(state, story.id) ? story.id : storyRef(activity.id, story.id);
  else delete next['story'];
  if (step && story && activity) next['step'] = findStep(state, step.id) ? step.id : stepRefOf(activity, story, step);
  else delete next['step'];
  // The preview tab is navigation state too: it must be shareable and survive
  // back/forward, so it lives in the hash and falls back to the first preview.
  const preview =
    step && nav['preview'] && step.previews.some((entry) => entry.id === nav['preview'])
      ? nav['preview']
      : step?.previews[0]?.id;
  if (preview) next['preview'] = preview;
  else delete next['preview'];
  return next;
};
