import { html, nothing, type TemplateResult } from 'lit';

import type {
  MatrixReorderColumnDetail,
  MatrixReorderRowDetail,
  MatrixReorderSubColumnDetail,
} from '../../components/matrix';
import type { Locale } from '../../core/i18n';
import type { ShellRegions, SettingsSection, ViewRenderContext } from '../../core/shell/contracts';
import type { ActionTarget } from '../../core/types';

import { controlAtom } from '../../components/atoms/controls';
import { linkStyles } from '../../components/atoms/link';
import { ViewElement } from '../../core/element';
import { PopoverController } from '../../core/popover-controller';
import { SelectController } from '../../core/select/controller';
import { popoverSurface } from '../../core/theme';
import { copyText } from '../../lib/dom/clipboard';
import { DismissController } from '../../lib/dom/dismiss';
import { DragController, type Drop } from '../../lib/dom/drag';
import { pointAnchor } from '../../lib/dom/popover';
import { PriorityOverflowController } from '../../lib/dom/priority-overflow';
import { revealInlineWithin, revealWithin } from '../../lib/dom/scroll';
import { usmTabOf, type UsmTab } from './board-tabs';
import { defineUsmBurndownChart } from './components/burndown-chart';
import { defineInternalUsmSettingsSection } from './components/settings-section';
import { defineUsmStoryCard } from './components/story-card';
import { defineUsmWeightBar } from './components/weight-bar';
import { highlightedStoriesOf, highlightOf } from './critical-path';
import { usmDefinitionFor } from './definition';
import { resolveCellDrop, resolveGroupDrop, resolvePickedStepMove, type CellRef } from './drop';
import { usmMessages, type UsmMessages } from './messages';
import { presentMilestoneOverview } from './milestone-overview';
import { findStory, flatSteps, hasFeature, stepRefOf, type UsmState } from './model';
import { renderBoard, type UsmDragType } from './render/board';
import { burndownStyles, renderBurndown } from './render/burndown';
import { dependencyPickerStyles, type DependencyPicker } from './render/dependency-picker';
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
import {
  panelStoryOf,
  renderStoryPanel,
  storyPanelStyles,
  type StoryCopy,
  type StoryManage,
} from './render/story-panel';
import { renderStoryTable } from './render/story-table';
import { statusStyles } from './render/tone';
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
/** How long the story panel's copy buttons say what they copied. */
const COPIED_MS = 1500;

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
    storyPanelStyles,
    dependencyPickerStyles,
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
  /** The story the panel showed at the last update, to move the focus when that changes. */
  #panelShown: string | null = null;
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
  /** The text the story panel just copied, while its buttons say so. */
  #copied: string | null = null;
  #copiedTimer: ReturnType<typeof setTimeout> | undefined;
  readonly #milestoneSelect = new SelectController(this);
  readonly #moveDialogSelect = new SelectController(this);
  /** The step picked in the move dialog so far, reset once it opens or closes. */
  #moveDialogStepId: string | null = null;

  constructor() {
    super();
    this.mode = IDLE_MODE;
    // The story panel closes on Escape and on a press on the page outside it.
    new DismissController(this, {
      open: () => this.#panel() !== null,
      closesOn: (path) => this.#closesPanel(path),
      ownsEscape: (path) =>
        this.mode.kind === 'idle' &&
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

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.#copiedTimer);
    this.#copied = null;
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
    this.#syncPanelFocus();
    if (this.mode.kind === 'picking-dependency') {
      this.#syncDependencyChoices();
      return;
    }
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
   * A dependency picker's choices show while its field has the focus; once
   * the field is gone (the panel closed) the search goes with it. The
   * highlighted choice is kept in sight as the arrow keys move it.
   */
  #syncDependencyChoices(): void {
    const field = this.renderRoot instanceof ShadowRoot ? this.renderRoot.activeElement : null;
    if (!field?.matches('.sp-dep-search')) {
      this.mode = IDLE_MODE;
      return;
    }
    const active = field.getAttribute('aria-activedescendant');
    if (active) this.renderRoot.querySelector(`#${CSS.escape(active)}`)?.scrollIntoView?.({ block: 'nearest' });
  }

  #panel(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.story-panel');
  }

  /**
   * A press on the page outside the panel closes it. A press on a card opens
   * that card's story instead, and one on a popover (the step picker) or on
   * the review rail beside the page keeps the panel open.
   */
  #closesPanel(path: readonly EventTarget[]): boolean {
    const panel = this.#panel();
    const main = this.renderRoot.querySelector('.dpk-main');
    if (!panel || !main || path.includes(panel) || !path.includes(main)) return false;
    return !path.some(
      (node) =>
        node instanceof Element && (node.localName === 'dpk-internal-usm-story-card' || node.hasAttribute('popover')),
    );
  }

  /**
   * The panel takes the focus when it opens on a story, so the keyboard goes
   * on from there; once it closes, the focus goes back to the story's card
   * unless the reader already put it elsewhere.
   */
  #syncPanelFocus(): void {
    const panel = this.#panel();
    const shown = panel?.dataset['story'] ?? null;
    const previous = this.#panelShown;
    if (shown === previous) return;
    this.#panelShown = shown;
    const active = this.shadowRoot?.activeElement ?? null;
    if (panel) {
      if (!active || !panel.contains(active)) panel.focus({ preventScroll: true });
      return;
    }
    if (previous === null || (active !== null && active.isConnected)) return;
    this.renderRoot
      .querySelector<HTMLElement>(`dpk-internal-usm-story-card[data-story="${CSS.escape(previous)}"]`)
      ?.focus({ preventScroll: true });
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
      ${this.#renderTab(m, context, tab)} ${this.#renderPanel(m, context, tab)}
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

  /** The story panel, on the map only: the stories live there. */
  #renderPanel(m: UsmMessages, context: ViewRenderContext<UsmState>, tab: UsmTab): TemplateResult | typeof nothing {
    if (tab !== 'map' && tab !== 'table') return nothing;
    const story = panelStoryOf(context);
    if (!story) return nothing;
    const picker: DependencyPicker = {
      search: this.mode.kind === 'picking-dependency' ? this.mode.search : null,
      set: (search) => (this.mode = search ? { kind: 'picking-dependency', search } : IDLE_MODE),
    };
    const copy: StoryCopy = {
      copied: this.#copied,
      copy: (text) => void this.#copy(text),
    };
    const manage: StoryManage = { open: (section) => this.openSettings(section) };
    return renderStoryPanel(m, context, story, picker, copy, manage);
  }

  /** Puts `text` on the clipboard and lets the panel say so for a moment. */
  async #copy(text: string): Promise<void> {
    if (!(await copyText(text))) return;
    clearTimeout(this.#copiedTimer);
    this.#copied = text;
    this.requestUpdate();
    this.#copiedTimer = setTimeout(() => {
      this.#copied = null;
      this.requestUpdate();
    }, COPIED_MS);
  }

  #renderTab(m: UsmMessages, context: ViewRenderContext<UsmState>, tab: UsmTab): TemplateResult {
    switch (tab) {
      case 'table':
        return renderStoryTable(m, context);
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
  defineInternalUsmSettingsSection();
  defineUsmBurndownChart();
  defineUsmWeightBar();
  if (!customElements.get('dpk-view-usm')) customElements.define('dpk-view-usm', DpkViewUsm);
};
