import { html, nothing, type TemplateResult } from 'lit';

import type {
  MatrixReorderColumnDetail,
  MatrixReorderRowDetail,
  MatrixReorderSubColumnDetail,
} from '../../components/matrix';
import type { Locale } from '../../core/i18n';
import type { PanelDetail } from '../../core/panel/host';
import type { DetailIntent } from '../../core/panel/model';
import type { ShellRegions, SettingsSection, ViewRenderContext } from '../../core/shell/contracts';
import type { ActionTarget } from '../../core/types';

import { controlAtom } from '../../components/atoms/controls';
import { linkStyles } from '../../components/atoms/link';
import { ViewElement } from '../../core/element';
import { PopoverController } from '../../core/popover-controller';
import { SelectController } from '../../core/select/controller';
import { popoverSurface } from '../../core/theme';
import { DismissController } from '../../lib/dom/dismiss';
import { DragController, type Drop } from '../../lib/dom/drag';
import { pointAnchor } from '../../lib/dom/popover';
import { PriorityOverflowController } from '../../lib/dom/priority-overflow';
import { revealInlineWithin, revealWithin } from '../../lib/dom/scroll';
import { usmTabOf, type UsmTab } from './board-tabs';
import { defineUsmBurndownChart } from './components/burndown-chart';
import { defineInternalUsmSettingsSection } from './components/settings-section';
import { defineUsmStoryCard } from './components/story-card';
import { defineInternalUsmStoryDetail } from './components/story-detail';
import { defineUsmWeightBar } from './components/weight-bar';
import { highlightedStoriesOf, highlightOf } from './critical-path';
import { usmDefinitionFor } from './definition';
import { resolveCellDrop, resolveGroupDrop, resolvePickedStepMove, type CellRef } from './drop';
import { usmMessages, type UsmMessages } from './messages';
import { presentMilestoneOverview } from './milestone-overview';
import { findStory, flatSteps, hasFeature, stepRefOf, type UsmState } from './model';
import { renderBoard, type UsmDragType } from './render/board';
import { burndownStyles, renderBurndown } from './render/burndown';
import { highlightStyles } from './render/highlight';
import { mapFilterStyles } from './render/map-filter';
import { mapToolbarStyles, renderMapToolbar } from './render/map-toolbar';
import { renderMilestoneOverview } from './render/milestone-overview';
import { renderMoveDialog } from './render/move-dialog';
import {
  pageTabsStyles,
  renderBoardBar,
  renderBoardHead,
  TABS_MENU_ITEM_HEIGHT,
  TABS_MENU_PADDING,
  TABS_MENU_WIDTH,
} from './render/page-tabs';
import { renderSettingsSection } from './render/settings-section';
import { selectedStoryOf, type StoryManage } from './render/story-detail';
import { renderStoryTable } from './render/story-table';
import { statusStyles } from './render/tone';
import { storyKey } from './story-key';
import { usmStyles } from './styles';
import { IDLE_MODE, type UsmUiMode } from './ui-mode';

const MOVE_DIALOG_SIZE = { width: 300, height: 240 };

/**
 * The settings dialog's sections, after the kit's `display`: the statuses the
 * stories move through, the labels they carry and the members they are
 * assigned to. What the map is made of is defined there rather than on a page
 * of its own; `openSettings(id)` opens one of them.
 */
const STATUSES_SECTION = 'statuses';
const LABELS_SECTION = 'labels';
const MEMBERS_SECTION = 'members';

/** The settings section a target of the map's own model is defined in, for a change's "Show". */
const SETTINGS_SECTION_OF: { readonly [type: string]: string | undefined } = {
  status: STATUSES_SECTION,
  label: LABELS_SECTION,
  member: MEMBERS_SECTION,
};

const FILTER_MENU_WIDTH = 240;
/** The height of one choice in a filter menu, and of the menu's padding: the room the menu asks for. */
const FILTER_OPTION_HEIGHT = 31;
const FILTER_MENU_PADDING = 14;
/** Room kept around a highlighted card brought into view: about the backbone's height and the milestone column's width. */
const HIGHLIGHT_REVEAL_MARGIN = 160;

/**
 * `<dpk-view-usm>` — the user story map.
 *
 * The element is the seam between the pure parts: it owns the one ephemeral
 * `mode` (which card is being edited / commented, or which drop is waiting
 * for a step), lends its `DragController` to the board template, and turns
 * card intents and drops into actions. Layout lives in `render/`, the card in
 * `components/`, and every drop decision in `drop.ts`.
 */
export class DpkViewUsm extends ViewElement<UsmState> {
  static override styles = [
    ViewElement.styles,
    controlAtom,
    usmStyles,
    statusStyles,
    linkStyles,
    burndownStyles,
    mapToolbarStyles,
    mapFilterStyles,
    highlightStyles,
    pageTabsStyles,
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
  /** Which page tabs do not fit on the bar's line, and so fold behind its more button. */
  readonly #tabsFit = new PriorityOverflowController(this, {
    row: () => this.renderRoot.querySelector('.page-nav'),
    items: (row) => [...row.querySelectorAll('.page-tabs [role="tab"]')],
    keyOf: (tab) => tab.getAttribute('data-tab') ?? '',
    kept: (tab) => tab.getAttribute('aria-selected') === 'true',
    more: (row) => row.querySelector('[data-tabs-more-trigger]'),
  });
  /** Whether the map has brought its highlight into view since it was turned on, so the reader's own scrolling is left alone. */
  #revealedHighlight = false;
  readonly #milestoneSelect = new SelectController(this);
  readonly #moveDialogSelect = new SelectController(this);
  /** The step picked in the move dialog so far, reset once it opens or closes. */
  #moveDialogStepId: string | null = null;

  constructor() {
    super();
    this.mode = IDLE_MODE;
    // Escape on the map lets go of the selected story; an Escape inside the side panel is the panel's.
    new DismissController(this, {
      open: () => this.navigation['story'] !== undefined,
      closesOn: () => false,
      ownsEscape: (path) =>
        this.mode.kind === 'idle' &&
        !path.some((node) => node instanceof Element && node.localName === 'dpk-internal-layout-panel') &&
        (path.includes(this) || path[0] === document.body || path[0] === document.documentElement),
      dismiss: () => this.context().navigate({ story: null }),
    });
    // A filter menu closes on Escape and on a press outside it and its trigger (the trigger toggles it).
    new DismissController(this, {
      open: () => this.mode.kind === 'filtering',
      closesOn: (path) =>
        !path.some(
          (node) => node instanceof Element && (node.id === 'filter-menu' || node.hasAttribute('data-filter-trigger')),
        ),
      ownsEscape: () => true,
      dismiss: () => (this.mode = IDLE_MODE),
    });
    // And the menu of the folded page tabs.
    new DismissController(this, {
      open: () => this.mode.kind === 'choosing-tab',
      closesOn: (path) =>
        !path.some(
          (node) => node instanceof Element && (node.id === 'tabs-menu' || node.hasAttribute('data-tabs-more-trigger')),
        ),
      ownsEscape: () => true,
      dismiss: () => (this.mode = IDLE_MODE),
    });
  }

  protected override renderRegions(context: ViewRenderContext<UsmState>): ShellRegions {
    return { main: this.#renderMain(context) };
  }

  /**
   * What the map is made of, in the settings dialog after the kit's `display`:
   * the statuses a story can stand in, the labels it may carry and the people
   * it may be assigned to — each the overview it always was, rendered in its own
   * `<dpk-usm-settings-section>` so it looks the same whichever element draws
   * the dialog. The members are offered while the feature that uses them is on.
   */
  protected override renderSettingsSections(
    context: ViewRenderContext<UsmState>,
  ): readonly SettingsSection<UsmState>[] {
    const m = usmMessages(this.locale);
    const sections = [
      renderSettingsSection(STATUSES_SECTION, m.statusesSection, 'statuses', this.locale),
      renderSettingsSection(LABELS_SECTION, m.labelsSection, 'labels', this.locale),
    ];
    if (hasFeature(context.state, 'assignees')) {
      sections.push(renderSettingsSection(MEMBERS_SECTION, m.membersSection, 'members', this.locale));
    }
    return sections;
  }

  /**
   * A change's "Show" for a status, a label or a member opens its section of
   * the settings dialog: that is where the map defines them, and navigation
   * cannot reach into the panel. A member is part of a feature, so while that
   * is off there is nowhere to show one.
   */
  protected override showTarget(target: ActionTarget): void {
    const section = SETTINGS_SECTION_OF[target.type];
    if (section === undefined) return;
    if (target.type === 'member' && !hasFeature(this.context().state, 'assignees')) return;
    this.openSettings(section);
  }

  protected override updated(): void {
    super.updated();
    this.#revealHighlight();
    // A filter's menu hangs off its trigger, as tall as its choices.
    if (this.mode.kind === 'filtering') {
      const menu = this.renderRoot.querySelector<HTMLElement>('#filter-menu');
      const trigger = this.renderRoot.querySelector(`[data-filter-trigger="${CSS.escape(this.mode.key)}"]`);
      const height = (menu?.childElementCount ?? 0) * FILTER_OPTION_HEIGHT + FILTER_MENU_PADDING;
      if (menu && trigger) this.#popovers.open(menu, trigger, { width: FILTER_MENU_WIDTH, height });
      return;
    }
    // The folded page tabs hang below the more button, as many as there are.
    if (this.mode.kind === 'choosing-tab') {
      const menu = this.renderRoot.querySelector<HTMLElement>('#tabs-menu');
      const trigger = this.renderRoot.querySelector('[data-tabs-more-trigger]');
      // Once every tab fits again there is nothing left to choose from.
      if (!menu) {
        this.mode = IDLE_MODE;
        return;
      }
      const height = menu.childElementCount * TABS_MENU_ITEM_HEIGHT + TABS_MENU_PADDING;
      if (trigger)
        this.#popovers.open(menu, trigger, { width: TABS_MENU_WIDTH, height }, { placement: 'bottom-start' });
      return;
    }
    // The step picker floats where the story was dropped (top layer) until the
    // reader picks or cancels; leaving the mode removes it from the DOM.
    if (this.mode.kind !== 'picking-step') return;
    const dialog = this.renderRoot.querySelector<HTMLElement>('#move-dialog');
    if (dialog) this.#popovers.open(dialog, pointAnchor(this.mode.point.x, this.mode.point.y), MOVE_DIALOG_SIZE);
  }

  /**
   * Scrolls the map to the first highlighted card once the highlight turns on:
   * on a wide map the path may start out of sight, leaving only dimmed cards.
   * The margin clears the backbone and the milestone column stuck over the map.
   */
  #revealHighlight(): void {
    // The navigation, not the render context: this runs before the element is initialized too.
    const on = highlightOf(this.navigation) !== null;
    if (!on) {
      this.#revealedHighlight = false;
      return;
    }
    // The scroller is `<dpk-matrix>`'s own; the card is still this element's light-DOM
    // descendant (slotted into matrix, not reparented into its shadow tree).
    const matrix = this.renderRoot.querySelector('dpk-matrix');
    const scroller = matrix?.shadowRoot?.querySelector('.matrix-scroll') ?? null;
    const card = this.renderRoot.querySelector('dpk-internal-usm-story-card[data-highlight="on"]');
    if (this.#revealedHighlight || !scroller || !card) return;
    this.#revealedHighlight = true;
    revealWithin(scroller, card, HIGHLIGHT_REVEAL_MARGIN);
    revealInlineWithin(scroller, card, HIGHLIGHT_REVEAL_MARGIN);
  }

  #renderMain(context: ViewRenderContext<UsmState>): TemplateResult {
    const m = usmMessages(this.locale);
    const tab = usmTabOf(context.state, context.navigation);
    return html`
      ${renderBoardHead(
        renderBoardBar(m, context, tab, {
          folded: this.#tabsFit.hidden,
          minimum: this.#tabsFit.minimum,
          open: this.mode.kind === 'choosing-tab',
          toggle: () => (this.mode = this.mode.kind === 'choosing-tab' ? IDLE_MODE : { kind: 'choosing-tab' }),
          close: () => (this.mode = IDLE_MODE),
        }),
        this.#renderToolbar(m, context, tab),
      )}
      ${this.#renderTab(m, context, tab)}
      ${renderMoveDialog(m, context, this.mode, this.#moveDialogSelect, this.#moveDialogStepId, {
        pick: (stepId) => {
          this.#moveDialogStepId = stepId;
          this.requestUpdate();
        },
        confirm: (stepId) => this.#confirmPickedStep(stepId),
        cancel: () => {
          this.#moveDialogStepId = null;
          this.mode = IDLE_MODE;
        },
      })}
    `;
  }

  /** The map's filters and highlight, on the map only and once it has steps to show stories under. */
  #renderToolbar(m: UsmMessages, context: ViewRenderContext<UsmState>, tab: UsmTab): TemplateResult | typeof nothing {
    if (tab !== 'map' || flatSteps(context.state).length === 0) return nothing;
    return renderMapToolbar(m, context, {
      openFor: this.mode.kind === 'filtering' ? this.mode.key : null,
      toggle: (key) => {
        const open = this.mode.kind === 'filtering' && this.mode.key === key;
        this.mode = open ? IDLE_MODE : { kind: 'filtering', key };
      },
      close: () => (this.mode = IDLE_MODE),
    });
  }

  #renderTab(m: UsmMessages, context: ViewRenderContext<UsmState>, tab: UsmTab): TemplateResult {
    switch (tab) {
      case 'table':
        return renderStoryTable(m, context, (storyId) => this.#onSelectStory(storyId));
      case 'milestones':
        return renderMilestoneOverview(m, context, presentMilestoneOverview(context.state));
      case 'burndown':
        return renderBurndown(m, context, new Date(), this.#milestoneSelect);
      case 'map':
        return this.#renderMap(m, context);
    }
  }

  #renderMap(m: UsmMessages, context: ViewRenderContext<UsmState>): TemplateResult {
    return renderBoard({
      m,
      context,
      drag: this.#drag,
      handlers: {
        selectStory: (storyId) => this.#onSelectStory(storyId),
        dropOnCell: (cell, drop) => this.#onCellDrop(cell, drop),
        dropOnGroupCell: (activityId, milestoneId, drop) => this.#onGroupDrop(activityId, milestoneId, drop),
        reorderMilestone: (detail) => this.#onReorderMilestone(detail),
        reorderActivity: (detail) => this.#onReorderActivity(detail),
        reorderStep: (detail) => this.#onReorderStep(detail),
      },
      highlighted: highlightedStoriesOf(context.state, context.navigation),
    });
  }

  /** A click on a card or a row opens its story in the panel, the story already selected too. */
  #onSelectStory(storyId: string): void {
    const context = this.context();
    const story = findStory(context.state, storyId);
    if (!story) return;
    context.navigate({ step: story.stepId, story: story.id });
    this.openPanelDetail();
  }

  protected override get providesPanelDetail(): boolean {
    return true;
  }

  /** The selected story is always the reader's pick (a card, a row, a link, the URL): it opens the panel. */
  protected override get panelDetailIntent(): DetailIntent {
    return 'open';
  }

  protected override renderPanelDetail(context: ViewRenderContext<UsmState>): PanelDetail | null {
    const story = selectedStoryOf(context);
    if (!story) return null;
    const m = usmMessages(this.locale);
    const manage: StoryManage = { open: (section) => this.openSettings(section) };
    const target = { type: 'story', id: story.id };
    return {
      key: story.id,
      kind: m.storyDetailKind,
      title: storyKey(story),
      render: () =>
        html`<dpk-internal-usm-story-detail
          .story=${story}
          .context=${context}
          .messages=${m}
          .manage=${manage}
        ></dpk-internal-usm-story-detail>`,
      focus: () =>
        this.renderRoot
          .querySelector<HTMLElement>(`dpk-internal-usm-story-card[data-story="${CSS.escape(story.id)}"]`)
          ?.focus({ preventScroll: true }),
      comment: () => context.requestComment(target),
    };
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
      this.#moveDialogStepId = null;
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

  /** `<dpk-matrix>` already resolved the landing anchor; this only turns it into an action. */
  #onReorderMilestone(detail: MatrixReorderRowDetail): void {
    this.context().dispatch({
      type: 'REORDER_MILESTONE',
      target: { type: 'milestone', id: detail.rowId },
      payload: { after: detail.after },
    });
  }

  #onReorderActivity(detail: MatrixReorderColumnDetail): void {
    this.context().dispatch({
      type: 'REORDER_ACTIVITY',
      target: { type: 'activity', id: detail.columnId },
      payload: { after: detail.after },
    });
  }

  /** A step's id and its anchor are qualified `activityId.stepId` refs: two activities may share a step id. */
  #onReorderStep(detail: MatrixReorderSubColumnDetail): void {
    const activityId = detail.columnId;
    this.context().dispatch({
      type: 'REORDER_STEP',
      target: { type: 'step', id: stepRefOf(activityId, detail.subColumnId) },
      payload: { after: detail.after === null ? null : stepRefOf(activityId, detail.after) },
    });
  }

  #confirmPickedStep(stepId: string): void {
    const pending = this.mode;
    if (pending.kind !== 'picking-step') return;
    const context = this.context();
    context.dispatch(
      resolvePickedStepMove(context.state, pending.storyId, pending.activityId, stepId, pending.milestoneId),
    );
    this.#moveDialogStepId = null;
    this.mode = IDLE_MODE;
  }
}

export const defineUsmElement = (): void => {
  defineUsmStoryCard();
  defineInternalUsmStoryDetail();
  defineInternalUsmSettingsSection();
  defineUsmBurndownChart();
  defineUsmWeightBar();
  if (!customElements.get('dpk-view-usm')) customElements.define('dpk-view-usm', DpkViewUsm);
};
