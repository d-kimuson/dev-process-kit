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
import { locatePrototype, prototypeAppScreens, prototypeUiCommentCount } from '../present';
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

/** Every screen of the app, grouped by who uses it; the one on stage is current. */
const renderAppScreens = (context: TemplateRenderContext<PrototypeState>, m: PrototypeMessages): TemplateResult => {
  const location = locatePrototype(context.state, context.navigation);
  const currentRef = location?.kind === 'step' ? stepRef(location) : undefined;
  const groups = prototypeAppScreens(context.state);
  const labelled = groups.some((group) => group.actor !== undefined);
  return html`
    <div class="steps-head">
      <span class="dpk-label">${m.appScreens}</span>
      <span class="dpk-label">${groups.reduce((sum, group) => sum + group.screens.length, 0)}</span>
    </div>
    <p class="app-hint">${m.appScreensHint}</p>
    ${groups.map(
      (group) => html`<section class="app-group">
        ${labelled ? html`<h3 class="app-actor">${group.actor ?? m.appNoActor}</h3>` : nothing}
        <ul class="steps app-screens">
          ${group.screens.map((screen) => {
            const current = currentRef !== undefined && screen.stepRefs.includes(currentRef);
            const notes =
              screen.stepRefs.reduce((sum, ref) => sum + context.commentCount({ type: 'step', id: ref }), 0) +
              prototypeUiCommentCount(context.comments, screen.previewIds);
            const { activity, story, step } = screen.opensAt;
            return html`<li class="step-row" data-current=${String(current)}>
              <a
                class="step-link"
                href=${context.hashFor({ activity: activity.id, story: story.id, step: step.id })}
                aria-current=${current ? 'page' : nothing}
              >
                <span class="step-name">${screen.title}</span>
                ${notes > 0 ? html`<span class="step-note">${notes}</span>` : nothing}
              </a>
            </li>`;
          })}
        </ul>
      </section>`,
    )}
  `;
};

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
