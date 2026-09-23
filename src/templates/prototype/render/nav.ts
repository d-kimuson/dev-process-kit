import { html, nothing, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';

import { iconClose } from '../../../core/icons';
import { createEntityId } from '../../../core/target';
import { onCommit, onSelectChange } from '../../../lib/dom/events';
import { prototypeAction } from '../actions';
import { allStepIds, findStep, stepRef, stepRefOf, storyRef, type PrototypeState } from '../model';

/** Activity select -> UserStory select -> step list of the selected story. */
export const renderNav = (context: TemplateRenderContext<PrototypeState>): TemplateResult => {
  const { state, navigation } = context;
  const located = findStep(state, navigation['step']);
  const activity = located?.activity ?? state.activities[0];
  const story = located?.story ?? activity?.stories[0];
  if (!activity || !story) {
    return html`<p class="nav-empty">
      Activity がまだありません。base JSON の <code>activities</code> を追加するか、Agent に依頼してください。
    </p>`;
  }
  const steps = story.steps;
  const current = located?.step;
  const currentRef = located ? stepRef(located) : undefined;

  return html`
    <div class="nav">
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
            const notes = context.commentCount({ type: 'step', id: ref });
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
                    aria-label="ステップを削除"
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
      <button class="dpk-btn" type="button" @click=${() => addStep(context, storyRef(activity.id, story.id))}>
        ＋ Step
      </button>
      ${
        current
          ? keyed(
              currentRef,
              html`<div class="detail">
                <div class="detail-row">
                  <span class="dpk-label">Step 名</span>
                  <span class="detail-value">
                    <dpk-component-inline-edit
                      .value=${current.name}
                      .label=${'Step 名'}
                      @dpk-commit=${onCommit((value) =>
                        context.dispatch(prototypeAction.setStepName(currentRef ?? current.id, value)),
                      )}
                    ></dpk-component-inline-edit>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="dpk-label">説明</span>
                  <span class="detail-value">
                    <dpk-component-inline-edit
                      multiline
                      .value=${current.description ?? ''}
                      .placeholder=${'この Step で何が起きるか（クリックして編集）'}
                      .label=${'説明'}
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
    </div>
  `;
};

/** Appends a step to the story and navigates to it. */
export const addStep = (context: TemplateRenderContext<PrototypeState>, storyId: string): void => {
  const id = createEntityId('new-step', allStepIds(context.state));
  const outcome = context.dispatch(prototypeAction.addStep(storyId, id, '新しいステップ'));
  if (outcome.ok) context.navigate({ story: storyId, step: id });
};
