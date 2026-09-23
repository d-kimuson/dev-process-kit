import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';

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
const DESCRIBERS: Record<string, (action: DraftAction, state: PrototypeState) => Summary> = {
  SET_ACTIVITY_NAME: (action, state) => ({
    title: 'Activity 名を変更',
    tone: 'update',
    body: arrow(
      findActivity(state, action.target.id)?.name,
      payloadFor(prototypeActions.SET_ACTIVITY_NAME, action).name,
    ),
  }),
  SET_ACTIVITY_DESCRIPTION: (action, state) => ({
    title: 'Activity の説明を更新',
    tone: 'update',
    body: preview(
      findActivity(state, action.target.id)?.description,
      payloadFor(prototypeActions.SET_ACTIVITY_DESCRIPTION, action).description,
    ),
  }),
  SET_STORY_NAME: (action, state) => ({
    title: 'UserStory 名を変更',
    tone: 'update',
    body: arrow(
      findStory(state, action.target.id)?.story.name,
      payloadFor(prototypeActions.SET_STORY_NAME, action).name,
    ),
  }),
  SET_STORY_DESCRIPTION: (action, state) => ({
    title: 'UserStory の説明を更新',
    tone: 'update',
    body: preview(
      findStory(state, action.target.id)?.story.description,
      payloadFor(prototypeActions.SET_STORY_DESCRIPTION, action).description,
    ),
  }),
  SET_STEP_NAME: (action, state) => ({
    title: 'Step 名を変更',
    tone: 'update',
    body: arrow(findStep(state, action.target.id)?.step.name, payloadFor(prototypeActions.SET_STEP_NAME, action).name),
  }),
  SET_STEP_DESCRIPTION: (action, state) => ({
    title: 'Step の説明を更新',
    tone: 'update',
    body: preview(
      findStep(state, action.target.id)?.step.description,
      payloadFor(prototypeActions.SET_STEP_DESCRIPTION, action).description,
    ),
  }),
  SET_PREVIEW_KIND: (action, state) => ({
    title: 'Preview の種別を変更',
    tone: 'update',
    body: arrow(
      findPreview(state, action.target.id)?.preview.kind,
      payloadFor(prototypeActions.SET_PREVIEW_KIND, action).kind,
    ),
  }),
  SET_PREVIEW_VIEWPORT: (action, state) => ({
    title: 'Preview のビューポートを変更',
    tone: 'update',
    body: arrow(
      findPreview(state, action.target.id)?.preview.viewport,
      payloadFor(prototypeActions.SET_PREVIEW_VIEWPORT, action).viewport,
    ),
  }),
  SET_PREVIEW_LABEL: (action) => ({
    title: 'Preview のラベルを変更',
    tone: 'update',
    body: `→ "${payloadFor(prototypeActions.SET_PREVIEW_LABEL, action).label}"`,
  }),
  REORDER_ACTIVITY: (action) => reorderSummary('Activity', payloadFor(prototypeActions.REORDER_ACTIVITY, action).after),
  REORDER_STORY: (action) => reorderSummary('UserStory', payloadFor(prototypeActions.REORDER_STORY, action).after),
  REORDER_STEP: (action) => reorderSummary('Step', payloadFor(prototypeActions.REORDER_STEP, action).after),
  MOVE_STORY: (action, state) => ({
    title: 'UserStory を移動',
    tone: 'move',
    body: `→ ${findActivity(state, payloadFor(prototypeActions.MOVE_STORY, action).toActivity)?.name ?? payloadFor(prototypeActions.MOVE_STORY, action).toActivity}`,
  }),
  MOVE_STEP: (action, state) => ({
    title: 'Step を移動',
    tone: 'move',
    body: `→ ${findStory(state, payloadFor(prototypeActions.MOVE_STEP, action).toStory)?.story.name ?? payloadFor(prototypeActions.MOVE_STEP, action).toStory}`,
  }),
  ADD_ACTIVITY: (action) => addSummary('Activity', payloadFor(prototypeActions.ADD_ACTIVITY, action).name),
  ADD_STORY: (action) => addSummary('UserStory', payloadFor(prototypeActions.ADD_STORY, action).name),
  ADD_STEP: (action) => addSummary('Step', payloadFor(prototypeActions.ADD_STEP, action).name),
  ADD_PREVIEW: (action) =>
    addSummary(
      'Preview',
      payloadFor(prototypeActions.ADD_PREVIEW, action).label ?? payloadFor(prototypeActions.ADD_PREVIEW, action).id,
    ),
  DELETE_ACTIVITY: (action, state) => deleteSummary(findActivity(state, action.target.id)?.name),
  DELETE_STORY: (action, state) => deleteSummary(findStory(state, action.target.id)?.story.name),
  DELETE_STEP: (action, state) => deleteSummary(findStep(state, action.target.id)?.step.name),
  DELETE_PREVIEW: (action, state) => deleteSummary(findPreview(state, action.target.id)?.preview.label),
} satisfies Record<ActionName<typeof prototypeActions>, (action: DraftAction, state: PrototypeState) => Summary>;

const preview = (before: string | undefined, after: string): string => {
  const trimmed = after.length > 90 ? `${after.slice(0, 90)}…` : after;
  return before === undefined || before === '' ? `→ "${trimmed}"` : `"${shorten(before)}" → "${trimmed}"`;
};

const shorten = (value: string): string => {
  return value.length > 60 ? `${value.slice(0, 60)}…` : value;
};

const reorderSummary = (kind: string, after: string | null): Summary => {
  return {
    title: `${kind} の順序を変更`,
    tone: 'move',
    body: after === null ? '→ 先頭へ' : `→ "${after}" の直後へ`,
  };
};

const addSummary = (kind: string, name: string): Summary => {
  return { title: `${kind} を追加`, tone: 'create', body: `+ "${name}"` };
};

const deleteSummary = (name: string | undefined): Summary => {
  return {
    title: '削除',
    tone: 'delete',
    body: name === undefined ? '(unknown target)' : `− "${name}"`,
  };
};

export const describePrototypeAction = (
  action: DraftAction,
  state: PrototypeState,
  base?: PrototypeState,
): ActionDescription => {
  const describer = Object.hasOwn(DESCRIBERS, action.type) ? DESCRIBERS[action.type] : undefined;
  const summary: Summary = describer ? describer(action, base ?? state) : { title: action.type, tone: 'meta' };
  return {
    title: summary.title,
    targetLabel: prototypeTargetLabel(state, action.target),
    tone: summary.tone,
    ...(summary.body === undefined ? {} : { summary: summary.body }),
  };
};

export const serializePrototypeAction = (action: DraftAction): string => {
  return `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;
};

export const prototypeTargetLabel = (state: PrototypeState, target: ActionTarget): string => {
  switch (target.type) {
    case 'activity': {
      const activity = findActivity(state, target.id);
      return activity ? `Activity · ${activity.name}` : `Activity · ${target.id} (missing)`;
    }
    case 'story': {
      const story = findStory(state, target.id)?.story;
      return story ? `UserStory · ${story.name}` : `UserStory · ${target.id} (missing)`;
    }
    case 'step': {
      const step = findStep(state, target.id)?.step;
      return step ? `Step · ${step.name}` : `Step · ${target.id} (missing)`;
    }
    case 'preview': {
      const preview = findPreview(state, target.id)?.preview;
      return preview ? `Preview · ${preview.label ?? preview.id}` : `Preview · ${target.id} (missing)`;
    }
    case 'page':
      return `Page · ${prototypeTitle(state)}`;
    default:
      return `${target.type} · ${target.id}`;
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

export const prototypeCommentTargets = (state: PrototypeState): readonly CommentTargetOption[] => {
  const options: CommentTargetOption[] = [];
  for (const activity of state.activities) {
    options.push({
      value: targetRef({ type: 'activity', id: activity.id }),
      label: activity.name,
      group: 'Activity',
    });
    for (const story of activity.stories) {
      options.push({
        value: targetRef({ type: 'story', id: storyRef(activity.id, story.id) }),
        label: `${activity.name} › ${story.name}`,
        group: 'UserStory',
      });
      for (const step of story.steps) {
        options.push({
          value: targetRef({ type: 'step', id: stepRefOf(activity, story, step) }),
          label: `${story.name} › ${step.name}`,
          group: 'Step',
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
export const prototypeCurrentTarget = (state: PrototypeState, nav: Navigation): CommentTargetOption | null => {
  const location = findStep(state, nav['step']);
  if (!location) return null;
  return { value: targetRef({ type: 'step', id: stepRef(location) }), label: location.step.name, group: 'Step' };
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
