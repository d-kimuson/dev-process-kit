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
  findActivity,
  findPreview,
  findStep,
  findStory,
  flattenSteps,
  stepAppId,
  stepRef,
  stepRefOf,
  storyRef,
  type PreviewLayout,
  type PrototypeActivity,
  type PrototypeApp,
  type PrototypePreview,
  type PrototypeStep,
  type PrototypeState,
  type PrototypeStory,
  type StepLocation,
  type UiTarget,
  parseUiTargetId,
  UI_TARGET,
} from './model';
import { VIEW_KEY } from './view-mode';

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
  readonly layout: PreviewLayout;
  /** The previews on screen: the selected tab, or every preview side by side. */
  readonly shown: readonly PrototypePreview[];
  /** The tabs to switch between; empty when there is nothing to switch. */
  readonly tabs: readonly PrototypePreview[];
  /** The selected tab. */
  readonly activeId?: string;
};

/** Which previews of a step are on screen, and whether tabs switch between them. */
export const prototypeStageFrames = (step: PrototypeStep, nav: Navigation): StageFrames => {
  if (step.layout === 'side-by-side') return { layout: 'side-by-side', shown: step.previews, tabs: [] };
  const active = step.previews.find((preview) => preview.id === nav['preview']) ?? step.previews[0];
  return {
    layout: 'tabs',
    shown: active ? [active] : [],
    tabs: step.previews.length > 1 ? step.previews : [],
    ...(active ? { activeId: active.id } : {}),
  };
};

/** Why a link in a preview leads nowhere: it names no destination, or one the page does not have. */
export type LinkProblem = 'no-destination' | 'unknown-target';

const NAVIGATION_KEYS = ['activity', 'story', 'step', 'preview'] as const;

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

/** Where the reader is: always a story, and one of its steps unless it has none yet. */
export type PrototypeLocation =
  | ({ readonly kind: 'step' } & StepLocation)
  | { readonly kind: 'story'; readonly activity: PrototypeActivity; readonly story: PrototypeStory };

/** Reads a resolved navigation (see `resolvePrototypeNavigation`). */
export const locatePrototype = (state: PrototypeState, nav: Navigation): PrototypeLocation | undefined => {
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

/** The stage heading of a step: the nearest actor (step › story › activity) and the page title. */
export const prototypePageHeading = (location: StepLocation): PageHeading => {
  const { activity, story, step } = location;
  const actor = step.actor ?? story.actor ?? activity.actor;
  const title = step.title ?? step.name;
  return actor === undefined ? { title } : { actor, title };
};

/** The stage heading of a story that has no steps yet: its actor and its name. */
export const prototypeStoryHeading = (activity: PrototypeActivity, story: PrototypeStory): PageHeading => {
  const actor = story.actor ?? activity.actor;
  return actor === undefined ? { title: story.name } : { actor, title: story.name };
};

export const prototypeTitle = (state: PrototypeState): string => {
  return state.title ?? 'UX Prototype';
};

export const resolvePrototypeNavigation = (state: PrototypeState, nav: Navigation): Navigation => {
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
  const located = scopedStep ?? findStep(state, requestedStep);
  const activity = located?.activity ?? storyLocation?.activity ?? requestedActivity ?? state.activities[0];
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
  // Side by side, every preview is on screen at once: there is no tab to keep.
  const preview =
    step?.layout === 'side-by-side'
      ? undefined
      : step && nav['preview'] && step.previews.some((entry) => entry.id === nav['preview'])
        ? nav['preview']
        : step?.previews[0]?.id;
  if (preview) next['preview'] = preview;
  else delete next['preview'];
  // Only the app view is written: the scenario view is the default.
  if (next[VIEW_KEY] !== 'app') delete next[VIEW_KEY];
  return next;
};

/** One screen of the app: the steps that show the same page to the same actor. */
export type AppScreen = {
  readonly title: string;
  /** Who uses the screen; absent when no level names an actor. */
  readonly actor?: string;
  /** Where the screen opens: its first step in page order. */
  readonly opensAt: StepLocation;
  /** Every step showing this screen, so the one on stage marks it current. */
  readonly stepRefs: readonly string[];
  /** The previews of those steps, whose UI comments count for the screen. */
  readonly previewIds: readonly string[];
};

export type AppScreenGroup = {
  /** Who uses these screens; absent for the screens no level names an actor for. */
  readonly actor?: string;
  readonly screens: readonly AppScreen[];
};

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

/** The screens of one sub-application. */
export type AppSection = {
  /** Absent for the screens no level names an app for, or when the page declares none. */
  readonly app?: PrototypeApp;
  /** Every screen, in page order. */
  readonly screens: readonly AppScreen[];
  /** The screens shown in a browser, as URL trees. */
  readonly trees: readonly ScreenTree[];
  /** The other screens (a phone app, a mail, a paper), grouped by who uses them. */
  readonly others: readonly AppScreenGroup[];
};

/** Collects the screens of steps: a page several steps show (a list in its states) is one screen. */
const collectScreens = (locations: readonly StepLocation[]): readonly AppScreen[] => {
  const screens = new Map<string, AppScreen>();
  for (const location of locations) {
    if (location.step.previews.length === 0) continue;
    const heading = prototypePageHeading(location);
    const key = JSON.stringify([heading.actor ?? null, heading.title]);
    const screen = screens.get(key);
    const ref = stepRef(location);
    const previewIds = location.step.previews.map((preview) => preview.id);
    screens.set(
      key,
      screen === undefined
        ? { ...heading, opensAt: location, stepRefs: [ref], previewIds }
        : { ...screen, stepRefs: [...screen.stepRefs, ref], previewIds: [...screen.previewIds, ...previewIds] },
    );
  }
  return [...screens.values()];
};

const groupByActor = (screens: readonly AppScreen[]): readonly AppScreenGroup[] => {
  const groups = new Map<string, AppScreen[]>();
  for (const screen of screens) {
    const key = screen.actor ?? '';
    groups.set(key, [...(groups.get(key) ?? []), screen]);
  }
  return [...groups.entries()].map(([actor, members]) =>
    actor === '' ? { screens: members } : { actor, screens: members },
  );
};

type WebAddress = { readonly origin: string; readonly segments: readonly string[] };

/** Where a screen lives on the web: the address of its first browser preview. */
const webAddressOf = (state: PrototypeState, screen: AppScreen): WebAddress | undefined => {
  const preview = screen.opensAt.step.previews.find((entry) => entry.kind === 'browser');
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

const appSection = (
  state: PrototypeState,
  app: PrototypeApp | undefined,
  locations: readonly StepLocation[],
): AppSection => {
  const screens = collectScreens(locations);
  const web: (readonly [AppScreen, WebAddress])[] = [];
  const others: AppScreen[] = [];
  for (const screen of screens) {
    const address = webAddressOf(state, screen);
    if (address) web.push([screen, address]);
    else others.push(screen);
  }
  const section: AppSection = { screens, trees: buildTrees(web), others: groupByActor(others) };
  return app === undefined ? section : { app, ...section };
};

/**
 * The app view's sidebar: the screens of the whole prototype, whatever story
 * they appear in, one section per sub-application in declared order, then the
 * screens no level names an app for. A page several steps show is one screen,
 * opened at its first step; the mock's links reach the others.
 */
export const prototypeAppSections = (state: PrototypeState): readonly AppSection[] => {
  const locations = flattenSteps(state);
  const sections = (state.apps ?? []).map((app) =>
    appSection(
      state,
      app,
      locations.filter((location) => stepAppId(location) === app.id),
    ),
  );
  const unassigned = appSection(
    state,
    undefined,
    locations.filter((location) => stepAppId(location) === undefined),
  );
  return [...sections, unassigned].filter((section) => section.screens.length > 0);
};

/** The section the reader is in: the one showing the step on stage, else that step's app, else the first. */
export const prototypeCurrentAppSection = (
  sections: readonly AppSection[],
  location: PrototypeLocation | undefined,
): AppSection | undefined => {
  if (location?.kind !== 'step') return sections[0];
  const ref = stepRef(location);
  const appId = stepAppId(location);
  return (
    sections.find((section) => section.screens.some((screen) => screen.stepRefs.includes(ref))) ??
    sections.find((section) => section.app?.id === appId) ??
    sections[0]
  );
};
