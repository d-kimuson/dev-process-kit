import { html, nothing, type TemplateResult } from 'lit';

import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';

import { TemplateElement } from '../../core/element';
import { PopoverController } from '../../core/popover-controller';
import { popoverSurface } from '../../core/theme';
import { DragController, type Drop } from '../../lib/dom/drag';
import { pointAnchor } from '../../lib/dom/popover';
import { revealInlineWithin } from '../../lib/dom/scroll';
import { usmTabOf, type UsmTab } from './board-tabs';
import { defineUsmStoryCard } from './components/story-card';
import { usmDefinitionFor } from './definition';
import { resolveCellDrop, resolveGroupDrop, resolveMilestoneDrop, resolvePickedStepMove, type CellRef } from './drop';
import { usmMessages, type UsmMessages } from './messages';
import { presentMilestoneOverview } from './milestone-overview';
import { findStory, type UsmState } from './model';
import { renderBoard, type UsmDragType } from './render/board';
import { linkStyles } from './render/link-icon';
import { renderMilestoneOverview } from './render/milestone-overview';
import { renderMoveDialog } from './render/move-dialog';
import { renderBoardBar } from './render/page-tabs';
import { renderStatusOverview } from './render/status-overview';
import { panelStoryOf, renderStoryPanel, storyPanelStyles } from './render/story-panel';
import { statusStyles } from './render/tone';
import { presentStatusOverview } from './status-overview';
import { usmStyles } from './styles';
import { IDLE_MODE, type UsmUiMode } from './ui-mode';

const MOVE_DIALOG_SIZE = { width: 300, height: 240 };
const ICON_MENU_SIZE = { width: 228, height: 116 };

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
  static override styles = [
    TemplateElement.styles,
    usmStyles,
    statusStyles,
    linkStyles,
    storyPanelStyles,
    popoverSurface,
  ];

  protected override definitionFor(locale: Locale) {
    return usmDefinitionFor(locale);
  }

  static override properties = {
    mode: { state: true },
  };

  declare private mode: UsmUiMode;

  readonly #drag = new DragController<UsmDragType>(this);
  readonly #popovers = new PopoverController(this);
  /** The page tab last scrolled into the strip, so the reader's own scrolling is left alone. */
  #revealedTab: string | null = null;

  constructor() {
    super();
    this.mode = IDLE_MODE;
  }

  protected override renderRegions(context: TemplateRenderContext<UsmState>): ShellRegions {
    return { main: this.#renderMain(context) };
  }

  protected override updated(): void {
    super.updated();
    this.#revealSelectedTab();
    // A status's icon menu hangs off the icon that opened it.
    if (this.mode.kind === 'picking-icon') {
      const menu = this.renderRoot.querySelector<HTMLElement>('#icon-menu');
      const trigger = this.renderRoot.querySelector(`[data-icon-trigger="${CSS.escape(this.mode.statusId)}"]`);
      if (menu && trigger) this.#popovers.open(menu, trigger, ICON_MENU_SIZE);
      return;
    }
    // The step picker floats where the story was dropped (top layer) until the
    // reader picks or cancels; leaving the mode removes it from the DOM.
    if (this.mode.kind !== 'picking-step') return;
    const dialog = this.renderRoot.querySelector<HTMLElement>('#move-dialog');
    if (dialog) this.#popovers.open(dialog, pointAnchor(this.mode.point.x, this.mode.point.y), MOVE_DIALOG_SIZE);
  }

  /** On a phone the tab strip scrolls sideways; a deep link to its last tab must not leave it out of sight. */
  #revealSelectedTab(): void {
    const strip = this.renderRoot.querySelector('.page-tabs');
    const tab = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    const key = tab?.getAttribute('href') ?? null;
    if (!strip || !tab || key === this.#revealedTab) return;
    this.#revealedTab = key;
    revealInlineWithin(strip, tab);
  }

  #renderMain(context: TemplateRenderContext<UsmState>): TemplateResult {
    const m = usmMessages(this.locale);
    const tab = usmTabOf(context.navigation);
    return html`
      ${renderBoardBar(m, context, tab)} ${this.#renderTab(m, context, tab)} ${this.#renderPanel(m, context, tab)}
      ${renderMoveDialog(m, context, this.mode, {
        confirm: (stepId) => this.#confirmPickedStep(stepId),
        cancel: () => (this.mode = IDLE_MODE),
      })}
    `;
  }

  /** The story panel, on the map only: the stories live there. */
  #renderPanel(m: UsmMessages, context: TemplateRenderContext<UsmState>, tab: UsmTab): TemplateResult | typeof nothing {
    if (tab !== 'map') return nothing;
    const story = panelStoryOf(context);
    return story ? renderStoryPanel(m, context, story) : nothing;
  }

  #renderTab(m: UsmMessages, context: TemplateRenderContext<UsmState>, tab: UsmTab): TemplateResult {
    switch (tab) {
      case 'milestones':
        return renderMilestoneOverview(m, context, presentMilestoneOverview(context.state));
      case 'statuses':
        return renderStatusOverview(m, context, presentStatusOverview(context.state), {
          openFor: this.mode.kind === 'picking-icon' ? this.mode.statusId : null,
          toggle: (statusId) => {
            const open = this.mode.kind === 'picking-icon' && this.mode.statusId === statusId;
            this.mode = open ? IDLE_MODE : { kind: 'picking-icon', statusId };
          },
          close: () => (this.mode = IDLE_MODE),
        });
      case 'map':
        return this.#renderMap(m, context);
    }
  }

  #renderMap(m: UsmMessages, context: TemplateRenderContext<UsmState>): TemplateResult {
    return renderBoard({
      m,
      context,
      drag: this.#drag,
      handlers: {
        selectStory: (storyId) => this.#onSelectStory(storyId),
        dropOnCell: (cell, drop) => this.#onCellDrop(cell, drop),
        dropOnGroupCell: (activityId, milestoneId, drop) => this.#onGroupDrop(activityId, milestoneId, drop),
        dropOnMilestoneRow: (milestoneId, drop) => this.#onMilestoneDrop(milestoneId, drop),
      },
    });
  }

  /** A click on a card opens its story in the panel. */
  #onSelectStory(storyId: string): void {
    const context = this.context();
    const story = findStory(context.state, storyId);
    if (story) context.navigate({ step: story.stepId, story: story.id });
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
