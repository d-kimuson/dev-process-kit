import { html, nothing, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { PrototypeMessages } from '../messages';

import { iconClose } from '../../../core/icons';
import { createEntityId } from '../../../core/target';
import { onCommit, onSelectChange } from '../../../lib/dom/events';
import { prototypeAction } from '../actions';
import { allStepIds, stepRef, stepRefOf, storyRef, type PrototypeState } from '../model';
import {
  locatePrototype,
  prototypeAppSections,
  prototypeCurrentAppSection,
  prototypeUiCommentCount,
  type AppScreen,
  type AppScreenGroup,
  type AppSection,
  type ScreenTreeNode,
} from '../present';
import { PROTOTYPE_VIEWS, prototypeViewOf, viewPatch, type PrototypeView } from '../view-mode';

/**
 * The view switch, then the scenario view's Activity select -> UserStory select
 * -> step list of the selected story, or the app view's screens.
 */
export const renderNav = (context: TemplateRenderContext<PrototypeState>, m: PrototypeMessages): TemplateResult => {
  const { state, navigation } = context;
  const location = locatePrototype(state, navigation);
  if (!location) {
    return html`<p class="nav-empty">${m.noActivityBefore}<code>activities</code>${m.noActivityAfter}</p>`;
  }
  const view = prototypeViewOf(navigation);
  return html`
    <div class="nav">
      ${renderViewSwitch(context, m, view)}
      ${view === 'app' ? renderAppScreens(context, m) : renderScenarioNav(context, m, location)}
    </div>
  `;
};

const VIEW_NAME = { scenario: 'viewScenario', app: 'viewApp' } as const;
const VIEW_HINT = { scenario: 'viewScenarioHint', app: 'viewAppHint' } as const;

/** Scenario or app: a pair of links, since the view is a place in the hash. */
const renderViewSwitch = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  current: PrototypeView,
): TemplateResult => html`<nav class="view-switch" aria-label=${m.viewLabel}>
  ${PROTOTYPE_VIEWS.map(
    (view) =>
      html`<a
        class="view-option"
        href=${context.hashFor(viewPatch(view))}
        title=${m[VIEW_HINT[view]]}
        aria-current=${view === current ? 'page' : nothing}
        data-view=${view}
        >${m[VIEW_NAME[view]]}</a
      >`,
  )}
</nav>`;

/**
 * The screens of one sub-application, picked with a select when the page has
 * several: its web pages as URL trees, then the other screens by who uses them.
 * The one on stage is current.
 */
const renderAppScreens = (context: TemplateRenderContext<PrototypeState>, m: PrototypeMessages): TemplateResult => {
  const location = locatePrototype(context.state, context.navigation);
  const currentRef = location?.kind === 'step' ? stepRef(location) : undefined;
  const sections = prototypeAppSections(context.state);
  const section = prototypeCurrentAppSection(sections, location);
  const row: ScreenRow = { context, currentRef, showActor: new Set(section?.screens.map((s) => s.actor)).size > 1 };
  // Below a tree, the other screens are told apart from it; by person when several use them.
  const others = section?.others ?? [];
  const byActor = others.length > 1;
  const othersHeading = (group: AppScreenGroup): string | undefined =>
    byActor ? (group.actor ?? m.appNoActor) : (section?.trees.length ?? 0) > 0 ? m.appOutsideBrowser : group.actor;
  return html`
    ${(context.state.apps ?? []).length > 0 && section ? renderAppSelect(context, m, sections, section) : nothing}
    <div class="steps-head">
      <span class="dpk-label">${m.appScreens}</span>
      <span class="dpk-label">${section?.screens.length ?? 0}</span>
    </div>
    <p class="app-hint">${m.appScreensHint}</p>
    ${section?.trees.map(
      (tree) => html`<section class="app-tree">
        <h3 class="app-origin">${hostOf(tree.origin)}</h3>
        <ul class="tree">
          ${renderTreeNode(row, tree.root, 0)}
        </ul>
      </section>`,
    )}
    ${others.map(
      (group) => html`<section class="app-group">
        ${othersHeading(group) === undefined ? nothing : html`<h3 class="app-actor">${othersHeading(group)}</h3>`}
        <ul class="steps app-screens">
          ${group.screens.map((screen) => {
            const current = isCurrent(row, screen);
            return html`<li class="step-row" data-current=${String(current)}>
              <a class="step-link" href=${screenHref(context, screen)} aria-current=${current ? 'page' : nothing}>
                <span class="step-name">${screen.title}</span>
                ${renderNotes(context, screen)}
              </a>
            </li>`;
          })}
        </ul>
      </section>`,
    )}
  `;
};

/** Which sub-application to show; picking one opens its first screen. */
const renderAppSelect = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  sections: readonly AppSection[],
  current: AppSection,
): TemplateResult => html`<div class="field">
  <span class="dpk-label">${m.appSelectLabel}</span>
  <select
    class="dpk-select"
    aria-label=${m.appSelectLabel}
    @change=${onSelectChange((value) => {
      const opensAt = sections[Number(value)]?.screens[0]?.opensAt;
      if (opensAt) context.navigate(screenPatch(opensAt));
    })}
  >
    ${sections.map(
      (section, index) =>
        html`<option value=${String(index)} ?selected=${section === current}>
          ${section.app?.name ?? m.appUnassigned}
        </option>`,
    )}
  </select>
  ${current.app?.description ? html`<p class="app-description">${current.app.description}</p>` : nothing}
</div>`;

type ScreenRow = {
  readonly context: TemplateRenderContext<PrototypeState>;
  readonly currentRef: string | undefined;
  /** Whether the section's screens have several users, so a row says whose it is. */
  readonly showActor: boolean;
};

/**
 * One path of the tree: a row per screen at it (a bare path when none, except
 * the root, which the origin heading stands for), then the paths below.
 */
const renderTreeNode = (row: ScreenRow, node: ScreenTreeNode, depth: number): TemplateResult => html`<li
  class="tree-node"
>
  ${
    node.screens.length === 0 && depth === 0
      ? nothing
      : node.screens.length === 0
        ? html`<div class="tree-row" data-depth=${String(depth)} data-current="false">
            <span class="tree-link" title=${node.path}><code class="tree-path">${node.segment}</code></span>
          </div>`
        : node.screens.map((screen) => {
            const current = isCurrent(row, screen);
            return html`<div class="tree-row" data-depth=${String(depth)} data-current=${String(current)}>
              <a
                class="tree-link"
                href=${screenHref(row.context, screen)}
                title=${node.path}
                aria-current=${current ? 'page' : nothing}
              >
                <code class="tree-path">${node.segment}</code>
                <span class="tree-title">${screen.title}</span>
                ${row.showActor && screen.actor ? html`<span class="tree-actor">${screen.actor}</span>` : nothing}
                ${renderNotes(row.context, screen)}
              </a>
            </div>`;
          })
  }
  ${
    node.children.length > 0
      ? html`<ul class="tree">
          ${node.children.map((child) => renderTreeNode(row, child, depth + 1))}
        </ul>`
      : nothing
  }
</li>`;

const isCurrent = (row: ScreenRow, screen: AppScreen): boolean =>
  row.currentRef !== undefined && screen.stepRefs.includes(row.currentRef);

const screenPatch = (opensAt: AppScreen['opensAt']): Readonly<Record<string, string>> => ({
  activity: opensAt.activity.id,
  story: opensAt.story.id,
  step: opensAt.step.id,
});

const screenHref = (context: TemplateRenderContext<PrototypeState>, screen: AppScreen): string =>
  context.hashFor(screenPatch(screen.opensAt));

/** Comments on the screen's steps and on the UI of their previews. */
const renderNotes = (
  context: TemplateRenderContext<PrototypeState>,
  screen: AppScreen,
): TemplateResult | typeof nothing => {
  const notes =
    screen.stepRefs.reduce((sum, ref) => sum + context.commentCount({ type: 'step', id: ref }), 0) +
    prototypeUiCommentCount(context.comments, screen.previewIds);
  return notes > 0 ? html`<span class="step-note">${notes}</span>` : nothing;
};

const hostOf = (origin: string): string => origin.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');

/** Activity select -> UserStory select -> step list of the selected story. */
const renderScenarioNav = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  location: NonNullable<ReturnType<typeof locatePrototype>>,
): TemplateResult => {
  const { state } = context;
  const { activity, story } = location;
  const steps = story.steps;
  const current = location.kind === 'step' ? location.step : undefined;
  const currentRef = location.kind === 'step' ? stepRef(location) : undefined;

  return html`
    <div class="field">
      <span class="dpk-label">Activity</span>
      <select
        class="dpk-select"
        aria-label="Activity"
        @change=${onSelectChange((value) => context.navigate({ activity: value, story: null, step: null }))}
      >
        ${state.activities.map(
          (entry) => html`<option value=${entry.id} ?selected=${entry.id === activity.id}>${entry.name}</option>`,
        )}
      </select>
    </div>
    <div class="field">
      <span class="dpk-label">User Story</span>
      <select
        class="dpk-select"
        aria-label="User Story"
        @change=${onSelectChange((value) => context.navigate({ activity: activity.id, story: value, step: null }))}
      >
        ${activity.stories.map(
          (entry) => html`<option value=${entry.id} ?selected=${entry.id === story.id}>${entry.name}</option>`,
        )}
      </select>
    </div>
    <div class="steps-head">
      <span class="dpk-label">Step</span>
      <span class="dpk-label">${steps.length}</span>
    </div>
    <ol class="steps">
      ${repeat(
        steps,
        (step) => stepRefOf(activity, story, step),
        (step, index) => {
          const ref = stepRefOf(activity, story, step);
          // Comments on the UI of the step's previews are about the step too.
          const notes =
            context.commentCount({ type: 'step', id: ref }) +
            prototypeUiCommentCount(
              context.comments,
              step.previews.map((preview) => preview.id),
            );
          return html`
            <li class="step-row" data-current=${String(step.id === current?.id)}>
              <a class="step-link" href=${context.hashFor({ activity: activity.id, story: story.id, step: step.id })}>
                <span class="step-index">${String(index + 1).padStart(2, '0')}</span>
                <span class="step-name">${step.name}</span>
                ${notes > 0 ? html`<span class="step-note">${notes}</span>` : nothing}
              </a>
              <span class="row-tools">
                <button
                  class="dpk-icon-btn"
                  type="button"
                  aria-label=${m.deleteStepAria}
                  @click=${() => context.dispatch(prototypeAction.deleteStep(ref))}
                >
                  ${iconClose()}
                </button>
              </span>
            </li>
          `;
        },
      )}
    </ol>
    <button class="dpk-btn" type="button" @click=${() => addStep(context, m, storyRef(activity.id, story.id))}>
      ${m.addStepButton}
    </button>
    ${
      current
        ? keyed(
            currentRef,
            html`<div class="detail">
              <div class="detail-row">
                <span class="dpk-label">${m.stepNameLabel}</span>
                <span class="detail-value">
                  <dpk-component-inline-edit
                    .value=${current.name}
                    .label=${m.stepNameLabel}
                    @dpk-commit=${onCommit((value) =>
                      context.dispatch(prototypeAction.setStepName(currentRef ?? current.id, value)),
                    )}
                  ></dpk-component-inline-edit>
                </span>
              </div>
              <div class="detail-row">
                <span class="dpk-label">${m.descriptionLabel}</span>
                <span class="detail-value">
                  <dpk-component-inline-edit
                    multiline
                    markdown
                    .value=${current.description ?? ''}
                    .placeholder=${m.descriptionPlaceholder}
                    .label=${m.descriptionLabel}
                    @dpk-commit=${onCommit((value) =>
                      context.dispatch(prototypeAction.setStepDescription(currentRef ?? current.id, value)),
                    )}
                  ></dpk-component-inline-edit>
                </span>
              </div>
            </div>`,
          )
        : nothing
    }
  `;
};

/** Appends a step to the story and navigates to it. */
export const addStep = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  storyId: string,
): void => {
  const id = createEntityId('new-step', allStepIds(context.state));
  const outcome = context.dispatch(prototypeAction.addStep(storyId, id, m.newStepName));
  if (outcome.ok) context.navigate({ story: storyId, step: id });
};
