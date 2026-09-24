import { html, type TemplateResult } from 'lit';

import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';

import { TemplateElement } from '../../core/element';
import { PopoverController } from '../../core/popover-controller';
import { popoverSurface } from '../../core/theme';
import { DragController, type Drop } from '../../lib/dom/drag';
import { pointAnchor } from '../../lib/dom/popover';
import { defineUsmStoryCard } from './components/story-card';
import { usmDefinitionFor } from './definition';
import { resolveCellDrop, resolveGroupDrop, resolveMilestoneDrop, resolvePickedStepMove, type CellRef } from './drop';
import { usmMessages } from './messages';
import { findStory, type UsmState } from './model';
import { renderBoard, type UsmDragType } from './render/board';
import { renderMoveDialog } from './render/move-dialog';
import { usmStyles } from './styles';
import { IDLE_MODE, reduceCardIntent, type CardIntent, type UsmUiMode } from './ui-mode';

const MOVE_DIALOG_SIZE = { width: 300, height: 240 };

/**
 * `<dpk-template-usm>` — the user story map.
 *
 * The element is the seam between the pure parts: it owns the one ephemeral
 * `mode` (which card is being edited / commented, or which drop is waiting
 * for a step), lends its `DragController` to the board template, and turns
 * card intents and drops into actions. Layout lives in `render/`, the card in
 * `components/`, and every drop decision in `drop.ts`.
 */
export class DpkTemplateUsm extends TemplateElement<UsmState> {
  static override styles = [TemplateElement.styles, usmStyles, popoverSurface];

  protected override definitionFor(locale: Locale) {
    return usmDefinitionFor(locale);
  }

  static override properties = {
    mode: { state: true },
  };

  declare private mode: UsmUiMode;

  readonly #drag = new DragController<UsmDragType>(this);
  readonly #popovers = new PopoverController(this);

  constructor() {
    super();
    this.mode = IDLE_MODE;
  }

  protected override renderRegions(context: TemplateRenderContext<UsmState>): ShellRegions {
    return { main: this.#renderMain(context) };
  }

  protected override updated(): void {
    super.updated();
    // The step picker floats where the story was dropped (top layer) until the
    // reader picks or cancels; leaving the mode removes it from the DOM.
    if (this.mode.kind !== 'picking-step') return;
    const dialog = this.renderRoot.querySelector<HTMLElement>('#move-dialog');
    if (dialog) this.#popovers.open(dialog, pointAnchor(this.mode.point.x, this.mode.point.y), MOVE_DIALOG_SIZE);
  }

  #renderMain(context: TemplateRenderContext<UsmState>): TemplateResult {
    const m = usmMessages(this.locale);
    return html`
      ${renderBoard({
        m,
        context,
        mode: this.mode,
        drag: this.#drag,
        handlers: {
          cardIntent: (storyId, intent) => this.#onCardIntent(storyId, intent),
          dropOnCell: (cell, drop) => this.#onCellDrop(cell, drop),
          dropOnGroupCell: (activityId, milestoneId, drop) => this.#onGroupDrop(activityId, milestoneId, drop),
          dropOnMilestoneRow: (milestoneId, drop) => this.#onMilestoneDrop(milestoneId, drop),
        },
      })}
      ${renderMoveDialog(m, context, this.mode, {
        confirm: (stepId) => this.#confirmPickedStep(stepId),
        cancel: () => (this.mode = IDLE_MODE),
      })}
    `;
  }

  /** A card asked for something: apply the side effect, then the mode transition. */
  #onCardIntent(storyId: string, intent: CardIntent): void {
    const context = this.context();
    switch (intent.kind) {
      case 'select': {
        const story = findStory(context.state, storyId);
        if (story) context.navigate({ step: story.stepId, story: story.id });
        break;
      }
      case 'rename':
        context.dispatch({
          type: 'SET_STORY_NAME',
          target: { type: 'story', id: storyId },
          payload: { name: intent.name },
        });
        break;
      case 'comment':
        context.dispatch({ type: 'comment', target: `story:${storyId}`, payload: { body: intent.body } });
        break;
      case 'delete':
        context.dispatch({ type: 'DELETE_STORY', target: { type: 'story', id: storyId }, payload: {} });
        break;
      case 'toggle-edit':
      case 'toggle-comment':
      case 'dismiss':
        break;
    }
    this.mode = reduceCardIntent(this.mode, storyId, intent);
  }

  #onCellDrop(cell: CellRef, drop: Drop<'story'>): void {
    const context = this.context();
    context.dispatch(resolveCellDrop(context.state, cell, drop.item.id, drop.hoveredId, drop.place));
  }

  /**
   * The activity column cannot name a step. Inside the same activity the story
   * keeps its step; across activities the reader picks one where it was dropped.
   */
  #onGroupDrop(activityId: string, milestoneId: string | undefined, drop: Drop<'story'>): void {
    const context = this.context();
    const story = findStory(context.state, drop.item.id);
    if (!story) return;
    if (story.activityId !== activityId) {
      this.mode = {
        kind: 'picking-step',
        storyId: story.id,
        activityId,
        milestoneId,
        point: { x: drop.event.clientX, y: drop.event.clientY },
      };
      return;
    }
    const input = resolveGroupDrop(context.state, activityId, milestoneId, story.id, drop.hoveredId, drop.place);
    if (input) context.dispatch(input);
  }

  #onMilestoneDrop(_milestoneId: string, drop: Drop<'milestone'>): void {
    const context = this.context();
    const order = context.state.milestones.map((milestone) => milestone.id);
    const input = resolveMilestoneDrop(order, drop.item.id, drop.hoveredId, drop.place);
    if (input) context.dispatch(input);
  }

  #confirmPickedStep(stepId: string): void {
    const pending = this.mode;
    if (pending.kind !== 'picking-step') return;
    const context = this.context();
    context.dispatch(
      resolvePickedStepMove(context.state, pending.storyId, pending.activityId, stepId, pending.milestoneId),
    );
    this.mode = IDLE_MODE;
  }
}

export const defineUsmElement = (): void => {
  defineUsmStoryCard();
  if (!customElements.get('dpk-template-usm')) customElements.define('dpk-template-usm', DpkTemplateUsm);
};
