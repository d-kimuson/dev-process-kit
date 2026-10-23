import { html, nothing, type TemplateResult } from 'lit';

import type { SelectController } from '../../../core/select/controller';
import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { UsmUiMode } from '../ui-mode';

import { findActivity, findStory, type UsmState } from '../model';

export type MoveDialogHandlers = {
  /** The reader picked a step in the list, before confirming. */
  readonly pick: (stepId: string) => void;
  readonly confirm: (stepId: string) => void;
  readonly cancel: () => void;
};

/**
 * Step picker for a cross-activity drop. Rendered once (not per card) and
 * shown as a popover at the drop point by the host; the milestone comes from
 * the drop cell and the story is appended to the chosen step.
 */
export const renderMoveDialog = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  mode: UsmUiMode,
  select: SelectController,
  /** The step picked so far, or `null` before the reader has touched the list (then the first step shows). */
  pickedStepId: string | null,
  handlers: MoveDialogHandlers,
): TemplateResult | typeof nothing => {
  if (mode.kind !== 'picking-step') return nothing;
  const story = findStory(context.state, mode.storyId);
  const activity = findActivity(context.state, mode.activityId);
  if (!story || !activity) return nothing;
  const firstStepId = activity.steps[0]?.id ?? null;
  const value = pickedStepId ?? firstStepId;
  return html`<div class="comment-pop move-dialog" id="move-dialog" popover="manual">
    <span class="dpk-label">${m.moveDialogLabel}</span>
    ${select.render({
      options: activity.steps.map((step) => ({ value: step.id, label: step.name })),
      value: value ?? '',
      onChange: handlers.pick,
      ariaLabel: m.moveDialogSelectLabel,
    })}
    <div class="pop-actions">
      <button
        class="dpk-btn dpk-btn--accent"
        type="button"
        @click=${() => {
          if (value) handlers.confirm(value);
          else handlers.cancel();
        }}
      >
        ${m.moveConfirm}
      </button>
      <button class="dpk-btn" type="button" @click=${handlers.cancel}>${m.moveCancel}</button>
    </div>
  </div>`;
};
