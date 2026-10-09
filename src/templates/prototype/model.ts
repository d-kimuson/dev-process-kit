import * as v from 'valibot';

import { entityIdSchema, splitPath } from '../../core/schema';

/**
 * What a preview looks like: a browser window, a phone app, a received e-mail,
 * or `plain` — no device at all, for what is not a screen (a handwritten memo, a
 * FAX, a paper form), whose look the light DOM draws itself.
 */
export const PREVIEW_KINDS = ['browser', 'native', 'mail', 'plain'] as const;
export const PREVIEW_VIEWPORTS = ['mobile', 'tablet', 'desktop', 'fluid'] as const;
export type PreviewKind = (typeof PREVIEW_KINDS)[number];
export type PreviewViewport = (typeof PREVIEW_VIEWPORTS)[number];

/** The envelope a `mail` preview shows above its body. Every field is cosmetic. */
export type PreviewMail = {
  readonly from?: string;
  readonly to?: string;
  readonly cc?: string;
  readonly subject?: string;
  readonly date?: string;
};

export type PrototypePreview = {
  readonly id: string;
  readonly kind: PreviewKind;
  readonly viewport: PreviewViewport;
  readonly label?: string;
  readonly url?: string;
  /** Only for `kind: "mail"`. */
  readonly mail?: PreviewMail;
};

/**
 * One page or state of the product, e.g. `Refunds`, or the cart and its empty
 * state as two screens. Its previews are renditions of the same screen
 * (mobile, desktop), so the reader switches between them with tabs. A screen
 * knows nothing of the scenarios that pass through it.
 */
export type PrototypeScreen = {
  readonly id: string;
  /** Title of the page, e.g. `Users`. */
  readonly title: string;
  readonly description?: string;
  readonly previews: readonly PrototypePreview[];
};

/**
 * One application of the product, typically per audience: the shop buyers
 * use, the admin console operators use. The app view shows one at a time.
 */
export type PrototypeApp = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Who the app is for, e.g. `Administrator`: the profile its browser is signed in with. */
  readonly actor?: string;
  readonly screens: readonly PrototypeScreen[];
};

/**
 * A screen of the product shown in a step. Without `preview` the reader
 * switches between the screen's renditions with tabs; with one, the step
 * shows that rendition alone.
 */
export type ScreenPane = {
  readonly screen: string;
  readonly preview?: string;
};

/** Something the user has at hand outside the product: a handwritten memo, a FAX. */
export type MaterialPane = {
  readonly material: PrototypePreview;
};

/** One pane of a step: a screen of the product, or a material only the story knows. */
export type StepPane = ScreenPane | MaterialPane;

export const isScreenPane = (pane: StepPane): pane is ScreenPane => 'screen' in pane;

/**
 * One moment of a user story: what the user sees, laid out as panes side by
 * side (`panes`: screens of the product, materials at hand), and what only the
 * story knows (`situation`: when and where it happens).
 */
export type PrototypeStep = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Who acts in the step, e.g. `Administrator`. Overrides the story's and activity's. */
  readonly actor?: string;
  /**
   * What is going on around the previews, e.g. `The clerk receives a FAX from
   * the customer`. Shown just above them.
   */
  readonly situation?: string;
  /** What the user sees, in order; empty until someone prototypes the step. */
  readonly panes: readonly StepPane[];
};

export type PrototypeStory = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Who acts in the story's steps unless a step says otherwise. */
  readonly actor?: string;
  readonly steps: readonly PrototypeStep[];
};

export type PrototypeActivity = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Who acts in the activity's steps unless a story or step says otherwise. */
  readonly actor?: string;
  readonly stories: readonly PrototypeStory[];
};

export type PrototypeState = {
  readonly title?: string;
  /**
   * Origin used to render preview URLs, e.g. `https://app.example.com`.
   * Defaults to `https://<slugified title>.example.com`.
   */
  readonly baseUrl?: string;
  /** The product: its applications and their screens. */
  readonly apps: readonly PrototypeApp[];
  /** The scenarios that go through the product. */
  readonly activities: readonly PrototypeActivity[];
};

export const previewMailSchema = v.strictObject({
  from: v.exactOptional(v.string()),
  to: v.exactOptional(v.string()),
  cc: v.exactOptional(v.string()),
  subject: v.exactOptional(v.string()),
  date: v.exactOptional(v.string()),
});

/** The fields of a preview, shared by the base and the actions that add one. */
export const previewEntries = {
  id: entityIdSchema,
  kind: v.optional(v.picklist(PREVIEW_KINDS), 'browser'),
  viewport: v.optional(v.picklist(PREVIEW_VIEWPORTS), 'fluid'),
  label: v.exactOptional(v.string()),
  url: v.exactOptional(v.string()),
  mail: v.exactOptional(previewMailSchema),
};

const previewSchema = v.pipe(
  v.strictObject(previewEntries),
  v.check(
    (preview) => preview.mail === undefined || preview.kind === 'mail',
    'a preview `mail` envelope needs `"kind": "mail"`',
  ),
);

const paneSchema = v.union([
  v.strictObject({ screen: entityIdSchema, preview: v.exactOptional(entityIdSchema) }),
  v.strictObject({ material: previewSchema }),
]);

const stepSchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  actor: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  situation: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  panes: v.optional(v.array(paneSchema), []),
});

const storySchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  actor: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  steps: v.optional(v.array(stepSchema), []),
});

const activitySchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  actor: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  stories: v.optional(v.array(storySchema), []),
});

const screenSchema = v.strictObject({
  id: entityIdSchema,
  title: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  previews: v.optional(v.array(previewSchema), []),
});

const appSchema = v.strictObject({
  id: entityIdSchema,
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.exactOptional(v.string()),
  actor: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  screens: v.optional(v.array(screenSchema), []),
});

export const prototypeBaseSchema = v.strictObject({
  title: v.exactOptional(v.string()),
  baseUrl: v.exactOptional(v.string()),
  apps: v.optional(v.array(appSchema), []),
  activities: v.optional(v.array(activitySchema), []),
});

type ParsedBase = v.InferOutput<typeof prototypeBaseSchema>;

const materialsOf = (panes: readonly StepPane[]): PrototypePreview[] =>
  panes.flatMap((pane) => (isScreenPane(pane) ? [] : [pane.material]));

/**
 * Ids must be unique where they identify a path element, a destination or a
 * slot. Story and step ids are unique within their parent; app and screen ids
 * are global because a screen is a destination of its own, and preview ids
 * are global because they name a light DOM slot.
 */
const findDuplicateId = (state: ParsedBase): string | null => {
  const previewIds = new Set<string>();
  const previewProblem = (previews: readonly { readonly id: string }[]): string | null => {
    for (const preview of previews) {
      if (previewIds.has(preview.id)) {
        return `duplicate preview id "${preview.id}": preview ids are global, they name a light DOM slot`;
      }
      previewIds.add(preview.id);
    }
    return null;
  };
  const appIds = new Set<string>();
  const screenIds = new Set<string>();
  for (const app of state.apps) {
    if (appIds.has(app.id)) return `duplicate app id "${app.id}"`;
    appIds.add(app.id);
    for (const screen of app.screens) {
      if (screenIds.has(screen.id)) return `duplicate screen id "${screen.id}": screen ids are global`;
      screenIds.add(screen.id);
      const problem = previewProblem(screen.previews);
      if (problem !== null) return problem;
    }
  }
  const activityIds = new Set<string>();
  for (const activity of state.activities) {
    if (activityIds.has(activity.id)) return `duplicate activity id "${activity.id}"`;
    activityIds.add(activity.id);
    const storyIds = new Set<string>();
    for (const story of activity.stories) {
      if (storyIds.has(story.id)) return `duplicate story id "${story.id}" in activity "${activity.id}"`;
      storyIds.add(story.id);

      const stepIds = new Set<string>();
      for (const step of story.steps) {
        if (stepIds.has(step.id)) return `duplicate step id "${step.id}" in story "${story.id}"`;
        stepIds.add(step.id);
        const problem = previewProblem(materialsOf(step.panes));
        if (problem !== null) return problem;
      }
    }
  }
  return null;
};

/**
 * A screen pane must name a screen of an app, and a rendition of that screen
 * if it pins one. A step shows a screen at most once unless every pane of it
 * pins a different rendition: one preview fills one slot.
 */
const paneProblem = (
  renditionsOf: (screenId: string) => readonly string[] | undefined,
  step: Pick<PrototypeStep, 'id' | 'panes'>,
): string | null => {
  const shown = new Map<string, (string | undefined)[]>();
  for (const pane of step.panes) {
    if (!isScreenPane(pane)) continue;
    const previews = renditionsOf(pane.screen);
    if (previews === undefined) {
      return `unknown screen "${pane.screen}" on step "${step.id}": declare it under \`apps[].screens\``;
    }
    if (pane.preview !== undefined && !previews.includes(pane.preview)) {
      return `preview "${pane.preview}" on step "${step.id}" is not a rendition of screen "${pane.screen}"`;
    }
    const before = shown.get(pane.screen) ?? [];
    if (
      before.length > 0 &&
      (pane.preview === undefined || before.includes(pane.preview) || before.includes(undefined))
    ) {
      return `screen "${pane.screen}" is shown twice on step "${step.id}": give each pane a different \`preview\``;
    }
    shown.set(pane.screen, [...before, pane.preview]);
  }
  return null;
};

const findPaneProblem = (state: ParsedBase): string | null => {
  const renditions = new Map(
    state.apps.flatMap((app) => app.screens.map((screen) => [screen.id, screen.previews.map((preview) => preview.id)])),
  );
  for (const step of state.activities.flatMap((activity) => activity.stories.flatMap((story) => story.steps))) {
    const problem = paneProblem((screenId) => renditions.get(screenId), step);
    if (problem !== null) return problem;
  }
  return null;
};

/** Why the panes of a step do not fit the product, or `null` when they do. */
export const stepPaneProblem = (state: PrototypeState, step: Pick<PrototypeStep, 'id' | 'panes'>): string | null =>
  paneProblem((screenId) => findScreen(state, screenId)?.screen.previews.map((preview) => preview.id), step);

/** Target type of a comment on one element of a preview's markup. */
export const UI_TARGET = 'ui';

/**
 * One element of a preview's markup, as a comment target id:
 * `<preview id>/<selector> "<text>"`, e.g. `cart-mobile/a.sm-btn "レジに進む"`.
 * The selector is relative to the preview's light DOM element and the text is
 * what the element said, so the agent can find it either way.
 */
export type UiTarget = {
  readonly previewId: string;
  readonly selector: string;
  readonly text?: string;
};

export const uiTargetId = (target: UiTarget): string => {
  const text = target.text?.replaceAll('"', "'");
  return `${target.previewId}/${target.selector}${text === undefined ? '' : ` "${text}"`}`;
};

export const parseUiTargetId = (id: string): UiTarget | undefined => {
  const slash = id.indexOf('/');
  if (slash <= 0) return undefined;
  const previewId = id.slice(0, slash);
  if (!v.is(entityIdSchema, previewId)) return undefined;
  const rest = id.slice(slash + 1);
  const quoted = / "([^"]*)"$/.exec(rest);
  const selector = (quoted ? rest.slice(0, quoted.index) : rest).trim();
  if (selector === '') return undefined;
  return quoted?.[1] === undefined ? { previewId, selector } : { previewId, selector, text: quoted[1] };
};

export const parsePrototypeBase = (input: unknown): PrototypeState => {
  const parsed = v.parse(prototypeBaseSchema, input);
  const problem = findDuplicateId(parsed) ?? findPaneProblem(parsed);
  if (problem !== null) throw new Error(problem);
  return parsed;
};

export const emptyPrototypeBase = (): PrototypeState => {
  return { apps: [], activities: [] };
};

export type StepLocation = {
  readonly activity: PrototypeActivity;
  readonly story: PrototypeStory;
  readonly step: PrototypeStep;
  readonly stepIndex: number;
};

/** A screen and the app it belongs to. */
export type ScreenLocation = {
  readonly app: PrototypeApp;
  readonly screen: PrototypeScreen;
};

/** Every screen of the product, app by app, in page order. */
export const allScreens = (state: PrototypeState): readonly ScreenLocation[] => {
  return state.apps.flatMap((app) => app.screens.map((screen) => ({ app, screen })));
};

export const findScreen = (state: PrototypeState, id: string | undefined): ScreenLocation | undefined => {
  if (id === undefined) return undefined;
  return allScreens(state).find((entry) => entry.screen.id === id);
};

/** The screens a step shows, in pane order. */
export const stepScreens = (state: PrototypeState, step: PrototypeStep): readonly ScreenLocation[] => {
  return step.panes.flatMap((pane) => {
    const located = isScreenPane(pane) ? findScreen(state, pane.screen) : undefined;
    return located ? [located] : [];
  });
};

/** What the user has at hand in a step, in pane order. */
export const stepMaterials = (step: PrototypeStep): readonly PrototypePreview[] => materialsOf(step.panes);

export const stepShowsScreen = (step: PrototypeStep, screenId: string): boolean =>
  step.panes.some((pane) => isScreenPane(pane) && pane.screen === screenId);

export const findActivity = (state: PrototypeState, id: string | undefined): PrototypeActivity | undefined => {
  if (id === undefined) return undefined;
  return state.activities.find((activity) => activity.id === id);
};

/** Canonical reference of a story: `onboarding.account`. */
export const storyRef = (activityId: string, storyId: string): string => {
  return `${activityId}.${storyId}`;
};

/** Accepts the canonical `activityId.storyId` path or a bare story id. */
export const findStory = (
  state: PrototypeState,
  ref: string | undefined,
): { activity: PrototypeActivity; story: PrototypeStory } | undefined => {
  if (ref === undefined) return undefined;
  const path = splitPath(ref, 2);
  if (path) {
    const [activityId, storyId] = path;
    if (activityId === undefined || storyId === undefined) return undefined;
    const activity = state.activities.find((candidate) => candidate.id === activityId);
    const story = activity?.stories.find((candidate) => candidate.id === storyId);
    return activity && story ? { activity, story } : undefined;
  }
  if (ref.includes('.')) return undefined;
  const matches = state.activities.flatMap((activity) =>
    activity.stories.filter((story) => story.id === ref).map((story) => ({ activity, story })),
  );
  return matches.length === 1 ? matches[0] : undefined;
};

/** The id part of a canonical ref: `a.b.c` -> `c`. */
export const localId = (ref: string): string => {
  const index = ref.lastIndexOf('.');
  return index >= 0 ? ref.slice(index + 1) : ref;
};

/**
 * Canonical reference of a step: `onboarding.account.landing`.
 *
 * A bare step id is not enough on its own — two stories may both own a `landing`
 * step — so refs carry the path that makes them globally unambiguous, and give
 * the agent reading a draft the context of where the step lives.
 */
export const stepRef = (location: StepLocation): string => {
  return `${location.activity.id}.${location.story.id}.${location.step.id}`;
};

export const stepRefOf = (activity: PrototypeActivity, story: PrototypeStory, step: PrototypeStep): string => {
  return `${activity.id}.${story.id}.${step.id}`;
};

/** Accepts the canonical path or a bare step id (which must be unique). */
export const findStep = (state: PrototypeState, ref: string | undefined): StepLocation | undefined => {
  if (ref === undefined) return undefined;
  const path = splitPath(ref, 3);
  if (path) {
    const [activityId, storyId, stepId] = path;
    if (activityId === undefined || storyId === undefined || stepId === undefined) return undefined;
    const activity = state.activities.find((candidate) => candidate.id === activityId);
    const story = activity?.stories.find((candidate) => candidate.id === storyId);
    const stepIndex = story ? story.steps.findIndex((candidate) => candidate.id === stepId) : -1;
    const step = story && stepIndex >= 0 ? story.steps[stepIndex] : undefined;
    return activity && story && step ? { activity, story, step, stepIndex } : undefined;
  }
  if (ref.includes('.')) return undefined;
  const matches = flattenSteps(state).filter((location) => location.step.id === ref);
  return matches.length === 1 ? matches[0] : undefined;
};

/** Where a preview lives: a rendition of a screen, or a material of a step. */
export type PreviewOwner = ({ readonly kind: 'screen' } & ScreenLocation) | ({ readonly kind: 'step' } & StepLocation);

/** Preview ids are global: a preview id names a light DOM slot, so the base schema rejects duplicates. */
export const findPreview = (
  state: PrototypeState,
  id: string | undefined,
): { owner: PreviewOwner; preview: PrototypePreview } | undefined => {
  if (id === undefined) return undefined;
  for (const entry of allScreens(state)) {
    const preview = entry.screen.previews.find((candidate) => candidate.id === id);
    if (preview) return { owner: { kind: 'screen', ...entry }, preview };
  }
  for (const location of flattenSteps(state)) {
    const preview = stepMaterials(location.step).find((candidate) => candidate.id === id);
    if (preview) return { owner: { kind: 'step', ...location }, preview };
  }
  return undefined;
};

/** Depth-first list of steps, used for "next / previous" and navigation defaults. */
export const flattenSteps = (state: PrototypeState): readonly StepLocation[] => {
  return state.activities.flatMap((activity) =>
    activity.stories.flatMap((story) =>
      story.steps.map((step, stepIndex) => ({
        activity,
        story,
        step,
        stepIndex,
      })),
    ),
  );
};

export const allStepIds = (state: PrototypeState): string[] => {
  return flattenSteps(state).map((location) => location.step.id);
};
