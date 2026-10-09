import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';
import type { PrototypeMessages } from './messages';

import { commentBody } from '../../core/comment';
import { parseHash } from '../../core/navigation';
import { payloadFor, type ActionName } from '../../core/schema';
import { slugify, targetRef } from '../../core/target';
import { prototypeActions } from './actions';
import {
  allScreens,
  findActivity,
  findPreview,
  findScreen,
  findStep,
  findStory,
  flattenSteps,
  stepRef,
  stepRefOf,
  stepScreen,
  storyRef,
  type PrototypeActivity,
  type PrototypeApp,
  type PrototypePreview,
  type PrototypeState,
  type PrototypeStory,
  type ScreenLocation,
  type StepLocation,
  type UiTarget,
  parseUiTargetId,
  UI_TARGET,
} from './model';
import { prototypeViewOf, VIEW_KEY } from './view-mode';

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
    case 'screen': {
      const screen = findScreen(state, target.id)?.screen;
      return screen ? m.targetLabel(m.screenGroup, screen.title) : m.targetMissing(m.screenGroup, target.id);
    }
    case 'preview': {
      const preview = findPreview(state, target.id)?.preview;
      return preview
        ? m.targetLabel(m.previewGroup, preview.label ?? preview.id)
        : m.targetMissing(m.previewGroup, target.id);
    }
    case 'page':
      return m.targetLabel(m.pageGroup, prototypeTitle(state));
    case UI_TARGET: {
      const ui = parseUiTargetId(target.id);
      const preview = ui ? findPreview(state, ui.previewId)?.preview : undefined;
      return ui && preview
        ? m.targetLabel(m.uiGroup, prototypeUiTargetName(preview, ui))
        : m.targetMissing(m.uiGroup, target.id);
    }
    default:
      return m.targetLabel(target.type, target.id);
  }
};

/** `Desktop › "Save"`: the preview it is on, then what the element says (or its selector). */
export const prototypeUiTargetName = (preview: PrototypePreview, target: UiTarget): string => {
  const element = target.text === undefined ? target.selector : `"${target.text}"`;
  return `${preview.label ?? preview.id} › ${element}`;
};

export type UiCommentPin = {
  /** The comment action. */
  readonly id: string;
  readonly previewId: string;
  readonly selector: string;
  /** 1-based number of the pin among the comments on screen. */
  readonly number: number;
  readonly body: string;
};

/** The UI comments on the given previews, numbered in draft order, for the pins drawn over them. */
export const prototypeUiCommentPins = (
  comments: readonly DraftAction[],
  previewIds: readonly string[],
): readonly UiCommentPin[] => {
  const pins: UiCommentPin[] = [];
  for (const comment of comments) {
    if (comment.target.type !== UI_TARGET) continue;
    const ui = parseUiTargetId(comment.target.id);
    if (!ui || !previewIds.includes(ui.previewId)) continue;
    pins.push({
      id: comment.id,
      previewId: ui.previewId,
      selector: ui.selector,
      number: pins.length + 1,
      body: commentBody(comment),
    });
  }
  return pins;
};

/** How many UI comments sit on the given previews: the step list counts them with the step's own. */
export const prototypeUiCommentCount = (comments: readonly DraftAction[], previewIds: readonly string[]): number => {
  return prototypeUiCommentPins(comments, previewIds).length;
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

export type StageFrames = {
  /** `side-by-side` when the materials at hand sit beside the screen, else `tabs`. */
  readonly layout: 'tabs' | 'side-by-side';
  /** The previews on screen: the materials, then the selected rendition of the screen. */
  readonly shown: readonly PrototypePreview[];
  /** The renditions of the screen to switch between; empty when there is nothing to switch. */
  readonly tabs: readonly PrototypePreview[];
  /** The selected rendition. */
  readonly activeId?: string;
};

const stageFrames = (
  materials: readonly PrototypePreview[],
  renditions: readonly PrototypePreview[],
  nav: Navigation,
): StageFrames => {
  const active = renditions.find((preview) => preview.id === nav['preview']) ?? renditions[0];
  const shown = active ? [...materials, active] : materials;
  return {
    layout: shown.length > 1 ? 'side-by-side' : 'tabs',
    shown,
    tabs: renditions.length > 1 ? renditions : [],
    ...(active ? { activeId: active.id } : {}),
  };
};

/**
 * What is on stage: in the scenario view, the materials a step has at hand
 * beside the screen it shows; in the app view, the screen alone. A screen's
 * renditions are tabs.
 */
export const prototypeStageFrames = (state: PrototypeState, located: StageLocation, nav: Navigation): StageFrames => {
  if (located.kind === 'screen') return stageFrames([], located.screen.previews, nav);
  return stageFrames(located.step.materials, stepScreen(state, located.step)?.screen.previews ?? [], nav);
};

/** Every preview a step can show: its materials and the renditions of its screen. */
export const prototypeStepPreviews = (state: PrototypeState, location: StepLocation): readonly PrototypePreview[] => {
  return [...location.step.materials, ...(stepScreen(state, location.step)?.screen.previews ?? [])];
};

/** Why a link in a preview leads nowhere: it names no destination, or one the page does not have. */
export type LinkProblem = 'no-destination' | 'unknown-target';

const NAVIGATION_KEYS = ['activity', 'story', 'step', 'screen', 'preview'] as const;

const destinationExists = (state: PrototypeState, key: (typeof NAVIGATION_KEYS)[number], id: string): boolean => {
  switch (key) {
    case 'activity':
      return findActivity(state, id) !== undefined;
    case 'story':
      // A bare id two activities share still resolves: the current activity wins.
      return (
        findStory(state, id) !== undefined ||
        state.activities.some((activity) => activity.stories.some((story) => story.id === id))
      );
    case 'step':
      return findStep(state, id) !== undefined || flattenSteps(state).some((location) => location.step.id === id);
    case 'screen':
      return findScreen(state, id) !== undefined;
    case 'preview':
      return findPreview(state, id) !== undefined;
    default:
      return false;
  }
};

/**
 * Checks a link of a preview against the page: `data-dpk-navigate` first, then
 * an `href` hash. `null` when it goes somewhere (an external URL counts).
 */
export const prototypeLinkProblem = (
  state: PrototypeState,
  link: { readonly href: string | null; readonly navigate: string | null },
): LinkProblem | null => {
  let target: string;
  if (link.navigate !== null) target = link.navigate.includes('=') ? link.navigate : `step=${link.navigate}`;
  else {
    const href = link.href?.trim() ?? '';
    if (href === '' || href === '#' || href.toLowerCase().startsWith('javascript:')) return 'no-destination';
    if (!href.startsWith('#')) return null;
    target = href;
  }
  const navigation = parseHash(target);
  const keys = NAVIGATION_KEYS.filter((key) => navigation[key] !== undefined);
  if (keys.length === 0) return link.navigate === null ? null : 'unknown-target';
  return keys.every((key) => destinationExists(state, key, navigation[key] ?? '')) ? null : 'unknown-target';
};

export type MailHeader = {
  readonly subject?: string;
  /** The sender's display name (`Shop <a@b>` -> `Shop`), shown next to the avatar. */
  readonly sender?: string;
  /** First letter of the sender, drawn as the avatar. */
  readonly initial?: string;
  readonly rows: readonly { readonly label: string; readonly value: string }[];
};

/** The envelope of a `mail` preview in the order a mail client shows it, without empty rows. */
export const prototypeMailHeader = (m: PrototypeMessages, preview: PrototypePreview): MailHeader => {
  const mail = preview.mail ?? {};
  const rows = [
    { label: m.mailFrom, value: mail.from },
    { label: m.mailTo, value: mail.to },
    { label: m.mailCc, value: mail.cc },
    { label: m.mailDate, value: mail.date },
  ].flatMap((row) =>
    row.value === undefined || row.value.trim() === '' ? [] : [{ label: row.label, value: row.value }],
  );
  const sender =
    mail.from
      ?.replace(/<[^>]*>/g, '')
      .replace(/["']/g, '')
      .trim() || mail.from?.trim();
  const initial = sender ? Array.from(sender)[0]?.toUpperCase() : undefined;
  return {
    ...(mail.subject === undefined || mail.subject.trim() === '' ? {} : { subject: mail.subject }),
    ...(sender ? { sender } : {}),
    ...(initial === undefined ? {} : { initial }),
    rows,
  };
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
  for (const { app, screen } of allScreens(state)) {
    options.push({
      value: targetRef({ type: 'screen', id: screen.id }),
      label: `${app.name} › ${screen.title}`,
      group: m.screenGroup,
    });
  }
  return options;
};

/**
 * What the reader is looking at: the step in the scenario view, the screen in
 * the app view. The composer's "attach to this step" checkbox, and the target
 * of an page-wide note's counterpart.
 */
export const prototypeCurrentTarget = (
  m: PrototypeMessages,
  state: PrototypeState,
  nav: Navigation,
): CommentTargetOption | null => {
  const located = locatePrototype(state, nav);
  if (located?.kind === 'screen') {
    const { screen } = located;
    return { value: targetRef({ type: 'screen', id: screen.id }), label: screen.title, group: m.screenGroup };
  }
  if (located?.kind !== 'step') return null;
  return { value: targetRef({ type: 'step', id: stepRef(located) }), label: located.step.name, group: m.stepGroup };
};

/** What the stage can show: a step of a story, or a screen of the app view. */
export type StageLocation = ({ readonly kind: 'step' } & StepLocation) | ({ readonly kind: 'screen' } & ScreenLocation);

/**
 * Where the reader is. In the scenario view, always a story, and one of its
 * steps unless it has none yet; in the app view, a screen unless the product
 * has none.
 */
export type PrototypeLocation =
  | StageLocation
  | { readonly kind: 'story'; readonly activity: PrototypeActivity; readonly story: PrototypeStory };

/** Reads a resolved navigation (see `resolvePrototypeNavigation`). */
export const locatePrototype = (state: PrototypeState, nav: Navigation): PrototypeLocation | undefined => {
  if (prototypeViewOf(nav) === 'app') {
    const screen = findScreen(state, nav['screen']);
    return screen ? { kind: 'screen', ...screen } : undefined;
  }
  const step = findStep(state, nav['step']);
  if (step) return { kind: 'step', ...step };
  const activity = findActivity(state, nav['activity']);
  const story = activity?.stories.find(
    (entry) => entry.id === nav['story'] || storyRef(activity.id, entry.id) === nav['story'],
  );
  return activity && story ? { kind: 'story', activity, story } : undefined;
};

export type PageHeading = {
  /** Who uses the page; absent when no level names one. */
  readonly actor?: string;
  readonly title: string;
};

/**
 * The stage heading. A screen is headed by its title and the user its app is
 * for. A step is headed by the title of its screen, or its own name away from
 * the product, and the nearest actor of step › story › activity › app.
 */
export const prototypePageHeading = (state: PrototypeState, located: StageLocation): PageHeading => {
  const heading = (title: string, actor: string | undefined): PageHeading =>
    actor === undefined ? { title } : { actor, title };
  if (located.kind === 'screen') return heading(located.screen.title, located.app.actor);
  const { activity, story, step } = located;
  const screen = stepScreen(state, step);
  return heading(screen?.screen.title ?? step.name, step.actor ?? story.actor ?? activity.actor ?? screen?.app.actor);
};

/** The stage heading of a story that has no steps yet: its actor and its name. */
export const prototypeStoryHeading = (activity: PrototypeActivity, story: PrototypeStory): PageHeading => {
  const actor = story.actor ?? activity.actor;
  return actor === undefined ? { title: story.name } : { actor, title: story.name };
};

export const prototypeTitle = (state: PrototypeState): string => {
  return state.title ?? 'UX Prototype';
};

/** The rendition a hash names, if the screen has it, else its first one. */
const renditionOf = (screen: ScreenLocation | undefined, requested: string | undefined): string | undefined => {
  const previews = screen?.screen.previews ?? [];
  return previews.find((entry) => entry.id === requested)?.id ?? previews[0]?.id;
};

const withPreview = (nav: Record<string, string>, preview: string | undefined): Navigation => {
  if (preview) nav['preview'] = preview;
  else delete nav['preview'];
  return nav;
};

/**
 * The app view names a screen and its rendition, nothing of a scenario. A
 * hash that comes from the scenario opens the screen of its step.
 */
const resolveAppNavigation = (state: PrototypeState, nav: Navigation): Navigation => {
  const fromScenario = (): ScreenLocation | undefined => {
    if (nav['step'] === undefined && nav['story'] === undefined) return undefined;
    const scenario = resolveScenarioNavigation(state, { ...nav, [VIEW_KEY]: '' });
    const location = findStep(state, scenario['step']);
    return location && stepScreen(state, location.step);
  };
  const screen = findScreen(state, nav['screen']) ?? fromScenario() ?? allScreens(state)[0];
  const next: Record<string, string> = { ...nav, [VIEW_KEY]: 'app' };
  for (const key of ['activity', 'story', 'step'] as const) delete next[key];
  if (screen) next['screen'] = screen.screen.id;
  else delete next['screen'];
  return withPreview(next, renditionOf(screen, nav['preview']));
};

/**
 * The step a link to a screen leads to in the scenario: the step on stage if
 * it shows the screen, the next one of the story that does, the nearest
 * earlier one, then the first on the page.
 */
const stepShowing = (state: PrototypeState, screenId: string, current: StepLocation | undefined) => {
  const shows = (location: StepLocation): boolean => location.step.screen === screenId;
  if (current && shows(current)) return current;
  const steps = current?.story.steps ?? [];
  const inStory = (index: number): StepLocation | undefined => {
    const step = steps[index];
    return current && step ? { ...current, step, stepIndex: index } : undefined;
  };
  for (let index = (current?.stepIndex ?? 0) + 1; index < steps.length; index += 1) {
    const location = inStory(index);
    if (location && shows(location)) return location;
  }
  for (let index = (current?.stepIndex ?? 0) - 1; index >= 0; index -= 1) {
    const location = inStory(index);
    if (location && shows(location)) return location;
  }
  return flattenSteps(state).find(shows);
};

const resolveScenarioNavigation = (state: PrototypeState, nav: Navigation): Navigation => {
  const requestedActivity = findActivity(state, nav['activity']);
  const requestedStory = nav['story'];
  // A bare story id names a story of the requested activity first, then the
  // one story of the page with that id, whose activity it then brings along.
  const scopedStory = requestedActivity?.stories.find(
    (story) => story.id === requestedStory || storyRef(requestedActivity.id, story.id) === requestedStory,
  );
  const storyLocation =
    scopedStory && requestedActivity
      ? { activity: requestedActivity, story: scopedStory }
      : findStory(state, requestedStory);
  const requestedStep = nav['step'];
  const scopedStep =
    storyLocation && requestedStep
      ? findStep(state, `${storyRef(storyLocation.activity.id, storyLocation.story.id)}.${requestedStep}`)
      : undefined;
  const current = scopedStep ?? findStep(state, requestedStep);
  // A link to a screen (`screen=…`) moves the story to a step showing it; a
  // screen no step shows is the app view's.
  const requestedScreen = nav['screen'];
  const showing = requestedScreen === undefined ? undefined : stepShowing(state, requestedScreen, current);
  if (requestedScreen !== undefined && !showing && findScreen(state, requestedScreen)) {
    return resolveAppNavigation(state, { ...nav, [VIEW_KEY]: 'app' });
  }
  const located = showing ?? current;
  const activity = located?.activity ?? storyLocation?.activity ?? requestedActivity ?? state.activities[0];
  const story =
    located?.story ??
    (storyLocation && storyLocation.activity === activity ? storyLocation.story : undefined) ??
    activity?.stories[0];
  const step = located?.step ?? story?.steps[0];
  const next: Record<string, string> = { ...nav };
  delete next['screen'];
  if (activity) next['activity'] = activity.id;
  else delete next['activity'];
  if (story && activity) next['story'] = findStory(state, story.id) ? story.id : storyRef(activity.id, story.id);
  else delete next['story'];
  if (step && story && activity) next['step'] = findStep(state, step.id) ? step.id : stepRefOf(activity, story, step);
  else delete next['step'];
  // Only the app view is written: the scenario view is the default.
  delete next[VIEW_KEY];
  // The rendition is navigation state too: it must be shareable and survive
  // back/forward, so it lives in the hash and falls back to the first one.
  return withPreview(next, renditionOf(step && stepScreen(state, step), nav['preview']));
};

export const resolvePrototypeNavigation = (state: PrototypeState, nav: Navigation): Navigation => {
  return prototypeViewOf(nav) === 'app' ? resolveAppNavigation(state, nav) : resolveScenarioNavigation(state, nav);
};

/** One screen of the app view's sidebar. */
export type AppScreen = ScreenLocation;

/**
 * One path of a URL tree. A path no screen sits at folds into its only child
 * (`/checkout` + `/done` -> `/checkout/done`), so the tree only branches where
 * the app does.
 */
export type ScreenTreeNode = {
  /** The part of the path below the parent, e.g. `/orders`; `/` for the root. */
  readonly segment: string;
  /** The whole path, e.g. `/mypage/orders`. */
  readonly path: string;
  /** The screens whose page has this path, e.g. a list and its empty state. */
  readonly screens: readonly AppScreen[];
  readonly children: readonly ScreenTreeNode[];
};

/** The web pages of one origin, from its root path. */
export type ScreenTree = {
  readonly origin: string;
  readonly root: ScreenTreeNode;
};

/** The screens of one app. */
export type AppSection = {
  readonly app: PrototypeApp;
  /** Every screen, in page order. */
  readonly screens: readonly AppScreen[];
  /** The screens shown in a browser, as URL trees. */
  readonly trees: readonly ScreenTree[];
  /** The other screens (a phone app, a mail). */
  readonly others: readonly AppScreen[];
};

type WebAddress = { readonly origin: string; readonly segments: readonly string[] };

/** Where a screen lives on the web: the address of its first browser rendition. */
const webAddressOf = (state: PrototypeState, entry: AppScreen): WebAddress | undefined => {
  const preview = entry.screen.previews.find((candidate) => candidate.kind === 'browser');
  if (!preview) return undefined;
  let url: URL;
  try {
    url = new URL(prototypePreviewUrl(state, preview), 'https://page.example.com');
  } catch {
    return undefined;
  }
  const segments = url.pathname
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  return { origin: url.origin, segments };
};

type MutableNode = { readonly screens: AppScreen[]; readonly children: Map<string, MutableNode> };

const emptyNode = (): MutableNode => ({ screens: [], children: new Map<string, MutableNode>() });

const freezeNode = (node: MutableNode, segment: string, path: string): ScreenTreeNode => {
  // A path no screen sits at, with one way down, is only a step towards it.
  const [only, ...rest] = node.children.entries();
  if (node.screens.length === 0 && only && rest.length === 0 && path !== '/') {
    const [childSegment, child] = only;
    return freezeNode(child, `${segment}/${childSegment}`, `${path}/${childSegment}`);
  }
  return {
    segment,
    path,
    screens: node.screens,
    children: [...node.children.entries()].map(([childSegment, child]) =>
      freezeNode(child, `/${childSegment}`, `${path === '/' ? '' : path}/${childSegment}`),
    ),
  };
};

const buildTrees = (entries: readonly (readonly [AppScreen, WebAddress])[]): readonly ScreenTree[] => {
  const roots = new Map<string, MutableNode>();
  for (const [screen, address] of entries) {
    const root = roots.get(address.origin) ?? emptyNode();
    roots.set(address.origin, root);
    let node = root;
    for (const segment of address.segments) {
      const child = node.children.get(segment) ?? emptyNode();
      node.children.set(segment, child);
      node = child;
    }
    node.screens.push(screen);
  }
  return [...roots.entries()].map(([origin, root]) => ({ origin, root: freezeNode(root, '/', '/') }));
};

const appSection = (state: PrototypeState, app: PrototypeApp): AppSection => {
  const screens = app.screens.map((screen) => ({ app, screen }));
  const web: (readonly [AppScreen, WebAddress])[] = [];
  const others: AppScreen[] = [];
  for (const screen of screens) {
    const address = webAddressOf(state, screen);
    if (address) web.push([screen, address]);
    else others.push(screen);
  }
  return { app, screens, trees: buildTrees(web), others };
};

/**
 * The app view's sidebar: the screens of each app, in declared order. An app
 * with no screens yet is left out.
 */
export const prototypeAppSections = (state: PrototypeState): readonly AppSection[] => {
  return state.apps.map((app) => appSection(state, app)).filter((section) => section.screens.length > 0);
};

/** The section the reader is in: the app of the screen on stage, else the first. */
export const prototypeCurrentAppSection = (
  sections: readonly AppSection[],
  location: PrototypeLocation | undefined,
): AppSection | undefined => {
  if (location?.kind !== 'screen') return sections[0];
  return sections.find((section) => section.app.id === location.app.id) ?? sections[0];
};
