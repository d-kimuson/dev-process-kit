import { html, nothing, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { PrototypeMessages } from '../messages';

import { iconClose } from '../../../core/icons';
import { createEntityId } from '../../../core/target';
import { onCommit, onSelectChange } from '../../../lib/dom/events';
import { renderMarkdown } from '../../../lib/markdown';
import { prototypeAction } from '../actions';
import {
  allStepIds,
  stepRef,
  stepRefOf,
  stepScreens,
  storyRef,
  type PrototypeState,
  type PrototypeStep,
} from '../model';
import {
  locatePrototype,
  prototypeAppSections,
  prototypeCurrentAppSection,
  prototypeStepPreviews,
  prototypeUiCommentCount,
  type AppScreen,
  type AppSection,
  type PrototypeLocation,
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
  const view = prototypeViewOf(navigation);
  return html`
    <div class="nav">
      ${renderViewSwitch(context, m, view)}
      ${
        view === 'app'
          ? renderAppScreens(context, m, location)
          : location !== undefined && location.kind !== 'screen'
            ? renderScenarioNav(context, m, location)
            : html`<p class="nav-empty">${m.noActivityBefore}<code>activities</code>${m.noActivityAfter}</p>`
      }
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
 * The screens of one app, picked with a select when the product has several:
 * its web pages as URL trees, then the screens outside the browser. The one on
 * stage is current, and its description follows.
 */
const renderAppScreens = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  location: PrototypeLocation | undefined,
): TemplateResult => {
  const current = location?.kind === 'screen' ? location : undefined;
  const sections = prototypeAppSections(context.state);
  const section = prototypeCurrentAppSection(sections, location);
  const row: ScreenRow = { context, currentId: current?.screen.id };
  const others = section?.others ?? [];
  return html`
    ${sections.length > 1 && section ? renderAppSelect(context, m, sections, section) : nothing}
    ${
      sections.length === 1 && section?.app.description
        ? html`<p class="app-description">${section.app.description}</p>`
        : nothing
    }
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
    ${
      others.length === 0
        ? nothing
        : html`<section class="app-group">
            ${(section?.trees.length ?? 0) > 0 ? html`<h3 class="app-group-heading">${m.appOutsideBrowser}</h3>` : nothing}
            <ul class="steps app-screens">
              ${others.map((screen) => {
                const isOn = isCurrent(row, screen);
                return html`<li class="step-row" data-current=${String(isOn)}>
                  <a class="step-link" href=${screenHref(context, screen)} aria-current=${isOn ? 'page' : nothing}>
                    <span class="step-name">${screen.screen.title}</span>
                    ${renderNotes(context, screen)}
                  </a>
                </li>`;
              })}
            </ul>
          </section>`
    }
    ${
      current?.screen.description
        ? html`<div class="detail">
            <div class="screen-description dpk-prose">${unsafeHTML(renderMarkdown(current.screen.description))}</div>
          </div>`
        : nothing
    }
  `;
};

/** Which app to show; picking one opens its first screen. */
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
      const first = sections[Number(value)]?.screens[0];
      if (first) context.navigate(screenPatch(first));
    })}
  >
    ${sections.map(
      (section, index) =>
        html`<option value=${String(index)} ?selected=${section === current}>${section.app.name}</option>`,
    )}
  </select>
  ${current.app.description ? html`<p class="app-description">${current.app.description}</p>` : nothing}
</div>`;

type ScreenRow = {
  readonly context: TemplateRenderContext<PrototypeState>;
  /** The screen on stage. */
  readonly currentId: string | undefined;
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
                <span class="tree-title">${screen.screen.title}</span>
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

const isCurrent = (row: ScreenRow, entry: AppScreen): boolean => entry.screen.id === row.currentId;

const screenPatch = (entry: AppScreen): Readonly<Record<string, string | null>> => ({
  screen: entry.screen.id,
  preview: null,
});

const screenHref = (context: TemplateRenderContext<PrototypeState>, entry: AppScreen): string =>
  context.hashFor(screenPatch(entry));

/** Comments on the screen and on the UI of its renditions. */
const renderNotes = (
  context: TemplateRenderContext<PrototypeState>,
  entry: AppScreen,
): TemplateResult | typeof nothing => {
  const notes =
    context.commentCount({ type: 'screen', id: entry.screen.id }) +
    prototypeUiCommentCount(
      context.comments,
      entry.screen.previews.map((preview) => preview.id),
    );
  return notes > 0 ? html`<span class="step-note">${notes}</span>` : nothing;
};

const hostOf = (origin: string): string => origin.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');

/** Activity select -> UserStory select -> step list of the selected story. */
const renderScenarioNav = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  location: Exclude<PrototypeLocation, { readonly kind: 'screen' }>,
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
          // Comments on the UI of what the step shows are about the step too.
          const notes =
            context.commentCount({ type: 'step', id: ref }) +
            prototypeUiCommentCount(
              context.comments,
              prototypeStepPreviews(state, step).map((preview) => preview.id),
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
              ${renderStepScreens(context, m, current)}
            </div>`,
          )
        : nothing
    }
  `;
};

/** The screens the step shows: each a way into the app view, with what the screen is for. */
const renderStepScreens = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  step: PrototypeStep,
): TemplateResult | typeof nothing => {
  const screens = stepScreens(context.state, step);
  if (screens.length === 0) return nothing;
  return html`<div class="detail-row">
    <span class="dpk-label">${m.screenGroup}</span>
    <span class="detail-value">
      ${screens.map(
        ({ app, screen }) =>
          html`<div class="step-screen-entry">
            <a
              class="step-screen"
              href=${context.hashFor({ ...viewPatch('app'), screen: screen.id })}
              title=${m.openInApp}
              >${app.name} › ${screen.title}</a
            >
            ${
              screen.description
                ? html`<div class="screen-description dpk-prose">
                    ${unsafeHTML(renderMarkdown(screen.description))}
                  </div>`
                : nothing
            }
          </div>`,
      )}
    </span>
  </div>`;
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
