import { html, nothing, type TemplateResult } from 'lit';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmUiMode } from '../ui-mode';

import { elementOf } from '../../../lib/dom/element';
import { findActivity, findStory, type UsmState } from '../model';

export type MoveDialogHandlers = {
  readonly confirm: (stepId: string) => void;
  readonly cancel: () => void;
};

/**
 * Step picker for a cross-activity drop. Rendered once (not per card) and
 * shown as a popover at the drop point by the host; the milestone comes from
 * the drop cell and the story is appended to the chosen step.
 */
export const renderMoveDialog = (
  context: TemplateRenderContext<UsmState>,
  mode: UsmUiMode,
  handlers: MoveDialogHandlers,
): TemplateResult | typeof nothing => {
  if (mode.kind !== 'picking-step') return nothing;
  const story = findStory(context.state, mode.storyId);
  const activity = findActivity(context.state, mode.activityId);
  if (!story || !activity) return nothing;
  const firstStepId = activity.steps[0]?.id;
  return html`<div class="comment-pop move-dialog" id="move-dialog" popover="manual">
    <span class="af-label">移動先のアクティビティ</span>
    <select class="af-select" aria-label="移動先" data-move-dialog>
      ${activity.steps.map(
        (step) => html`<option value=${step.id} ?selected=${step.id === firstStepId}>${step.name}</option>`,
      )}
    </select>
    <div class="pop-actions">
      <button
        class="af-btn af-btn--accent"
        type="button"
        @click=${(e: Event) => {
          const dialog = elementOf(e.currentTarget, HTMLElement)?.closest('#move-dialog') ?? null;
          const stepId = dialog?.querySelector('select')?.value ?? firstStepId;
          if (stepId) handlers.confirm(stepId);
          else handlers.cancel();
        }}
      >
        移動する
      </button>
      <button class="af-btn" type="button" @click=${handlers.cancel}>キャンセル</button>
    </div>
  </div>`;
};
