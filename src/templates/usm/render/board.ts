import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { DragController, Drop } from '../../../lib/dom/drag';
import type { CellRef } from '../drop';
import type { UsmMessages } from '../messages';

import {
  cellSlot,
  columnHeadSlot,
  CORNER_SLOT,
  CORNER_SUB_SLOT,
  rowHeadSlot,
  subColumnHeadSlot,
  type MatrixColumn,
  type MatrixReorderColumnDetail,
  type MatrixReorderRowDetail,
  type MatrixReorderSubColumnDetail,
  type MatrixRow,
} from '../../../components/matrix';
import { grillMark } from '../../../core/grill';
import { iconPlus } from '../../../core/icons';
import { targetRef } from '../../../core/target';
import { onCommit } from '../../../lib/dom/events';
import { addActivity, addMilestone, addStep, addStory } from '../commands';
import { dependencyOf } from '../dependencies';
import { mapFilterOf, passesMapFilter } from '../map-filter';
import {
  assigneeOf,
  type BackboneStep,
  findEstimate,
  hasFeature,
  flatSteps,
  labelsOfStory,
  stepRefOf,
  storiesInActivity,
  storiesInCell,
  storyCountForStep,
  type UserStory,
  type UsmState,
} from '../model';
import { statusDistribution, statusViewOf, statusViews } from '../status-view';
import { statusBar, statusToneStyle } from './tone';

/**
 * The one kind of thing that still drags through USM's own `DragController`:
 * a story card, between cells. Rows, activity columns and step columns drag
 * through `<dpk-matrix>` instead (see `reorderMilestone`/`reorderActivity`/
 * `reorderStep` below), which owns that mechanism itself.
 */
export type UsmDragType = 'story';

/** Non-draggable trailing rows/columns and the activity view's dash placeholder; never a real id. */
const UNASSIGNED_ROW_ID = '__unassigned__';
const ADD_MILESTONE_ROW_ID = '__add-milestone__';
const ADD_ACTIVITY_COLUMN_ID = '__add-activity__';
const ADD_ACTIVITY_SUB_COLUMN_ID = '__add-activity-step__';

export type BoardHandlers = {
  /** A card was clicked: open its story in the panel. */
  readonly selectStory: (storyId: string) => void;
  readonly dropOnCell: (cell: CellRef, drop: Drop<'story'>) => void;
  readonly dropOnGroupCell: (activityId: string, milestoneId: string | undefined, drop: Drop<'story'>) => void;
  /** `<dpk-matrix>` reordered a row/column/sub-column; `after` is already the landing anchor. */
  readonly reorderMilestone: (detail: MatrixReorderRowDetail) => void;
  readonly reorderActivity: (detail: MatrixReorderColumnDetail) => void;
  readonly reorderStep: (detail: MatrixReorderSubColumnDetail) => void;
};

export type BoardProps = {
  readonly m: UsmMessages;
  readonly context: TemplateRenderContext<UsmState>;
  readonly drag: DragController<UsmDragType>;
  readonly handlers: BoardHandlers;
  /** The stories the map highlights; `null` while it highlights nothing (the others dim while it does). */
  readonly highlighted: ReadonlySet<string> | null;
};

/** A milestone row of the map; the trailing `undefined` row collects unassigned stories. */
export type MilestoneRow = {
  readonly id: string | undefined;
  readonly name: string;
  /** `''` when the milestone leaves it out. */
  readonly timeframe: string;
  readonly storyCount: number;
  readonly questions?: string;
};

/** Every milestone in map order, then Unassigned. */
export const milestoneRows = (m: UsmMessages, state: UsmState): readonly MilestoneRow[] => {
  const countOf = (id: string | undefined): number => state.stories.filter((story) => story.milestoneId === id).length;
  return [
    ...state.milestones.map(({ id, name, timeframe, questions }) => ({
      id,
      name,
      timeframe: timeframe?.trim() ?? '',
      storyCount: countOf(id),
      ...(questions === undefined ? {} : { questions }),
    })),
    { id: undefined, name: m.unassigned, timeframe: '', storyCount: countOf(undefined) },
  ];
};

/** `<dpk-matrix>`'s row id for a milestone row: the unassigned row gets a stable sentinel, since matrix rows need a real id. */
const matrixRowIdOf = (row: MilestoneRow): string => row.id ?? UNASSIGNED_ROW_ID;

/** Every milestone row, plus the trailing "add milestone" row (not draggable, not a drop anchor). */
const matrixRowsOf = (rows: readonly MilestoneRow[]): readonly MatrixRow[] => [
  ...rows.map((row) => ({ id: matrixRowIdOf(row), draggable: row.id !== undefined })),
  { id: ADD_MILESTONE_ROW_ID, draggable: false },
];

/**
 * The activity view's columns: one per activity, banded over its steps (every
 * real activity always has at least one, so it always qualifies for the
 * two-level header), plus the trailing "add activity" column. That column
 * still needs one (non-draggable) sub-column of its own: with any column in
 * two-level mode, a column without sub-columns of its own would render no
 * second header row at all, misaligning it against its own body cells.
 */
const activityMatrixColumns = (state: UsmState): readonly MatrixColumn[] => [
  ...state.activities.map((activity) => ({
    id: activity.id,
    subColumns: activity.steps.map((step) => ({ id: step.id })),
  })),
  {
    id: ADD_ACTIVITY_COLUMN_ID,
    draggable: false,
    subColumns: [{ id: ADD_ACTIVITY_SUB_COLUMN_ID, draggable: false }],
  },
];

/** The group view's columns: one per activity, no sub-columns (the group view bands no steps), plus "add activity". */
const groupMatrixColumns = (state: UsmState): readonly MatrixColumn[] => [
  ...state.activities.map((activity) => ({ id: activity.id })),
  { id: ADD_ACTIVITY_COLUMN_ID, draggable: false },
];

export const renderEmptyBoard = (m: UsmMessages, context: TemplateRenderContext<UsmState>): TemplateResult => {
  return html`
    <div class="empty">
      <h2>${m.emptyTitle}</h2>
      <p>${m.emptyBody}</p>
      <button class="dpk-btn dpk-btn--accent" type="button" @click=${() => addActivity(m, context)}>
        ${m.firstActivityButton}
      </button>
    </div>
  `;
};

/** The map in the requested grouping (`view`), or the empty state before there is a backbone. */
export const renderBoard = (props: BoardProps): TemplateResult => {
  const { m, context } = props;
  const columns = flatSteps(context.state);
  if (columns.length === 0) return renderEmptyBoard(m, context);
  return usmViewOf(context) === 'activity' ? renderActivityView(props, columns) : renderGroupView(props);
};

export const usmViewOf = (context: TemplateRenderContext<UsmState>): 'group' | 'activity' => {
  return context.navigation['view'] === 'group' ? 'group' : 'activity';
};

/** Activity columns vs one column per activity group; only shown on the map tab. */
export const renderViewTabs = (m: UsmMessages, context: TemplateRenderContext<UsmState>): TemplateResult => {
  const view = usmViewOf(context);
  return html`<div class="dpk-segmented view-tabs" role="tablist" aria-label=${m.groupingLabel}>
    ${renderViewTab(context, 'activity', view, m.activityGroup)}
    ${renderViewTab(context, 'group', view, m.groupViewTab)}
  </div>`;
};

const renderViewTab = (
  context: TemplateRenderContext<UsmState>,
  tab: 'activity' | 'group',
  current: 'activity' | 'group',
  label: string,
): TemplateResult => {
  const selected = tab === current;
  return html`<a role="tab" aria-selected=${selected ? 'true' : 'false'} href=${context.hashFor({ view: tab })}
    >${label}</a
  >`;
};

/**
 * One column per backbone step, activity groups banded on top. Milestone rows
 * stay identical in both views. The grid, its sticky head/lead column and
 * every drag mechanic are `<dpk-matrix>`'s; every head and cell here is this
 * template's own content, placed through a named slot.
 */
const renderActivityView = (props: BoardProps, columns: ReturnType<typeof flatSteps>): TemplateResult => {
  const { m, context, handlers } = props;
  const { state } = context;
  const rows = milestoneRows(m, state);
  return html`
    <dpk-matrix
      data-testid="usm-map"
      .rows=${matrixRowsOf(rows)}
      .columns=${activityMatrixColumns(state)}
      @dpk-matrix-reorder-row=${(event: CustomEvent<MatrixReorderRowDetail>) => handlers.reorderMilestone(event.detail)}
      @dpk-matrix-reorder-column=${(event: CustomEvent<MatrixReorderColumnDetail>) =>
        handlers.reorderActivity(event.detail)}
      @dpk-matrix-reorder-sub-column=${(event: CustomEvent<MatrixReorderSubColumnDetail>) =>
        handlers.reorderStep(event.detail)}
    >
      <div class="corner" slot=${CORNER_SLOT}><span class="dpk-label">${m.groupAxisHeader}</span></div>
      ${repeat(
        state.activities,
        (activity) => activity.id,
        (activity) => renderActivityHead(props, activity.id),
      )}
      ${renderAddActivityHead(m, context)} ${renderAxisCorner(m, CORNER_SUB_SLOT)}
      ${repeat(
        columns,
        ({ activity, step }) => `${activity.id}.${step.id}`,
        ({ activity, step }) => renderStepHead(props, activity.id, step),
      )}
      ${renderAddActivitySubHead()}
      ${repeat(
        rows,
        (row) => row.id,
        (row) => renderMilestoneRowHead(props, row),
      )}
      ${repeat(
        rows,
        (row) => row.id,
        (row) =>
          html`${repeat(
            columns,
            ({ activity, step }) => `${activity.id}.${step.id}`,
            ({ activity, step }) =>
              renderCell(props, matrixRowIdOf(row), { activityId: activity.id, stepId: step.id, milestoneId: row.id }),
          )}`,
      )}
      ${renderAddMilestoneRowHead(m, context)}
    </dpk-matrix>
  `;
};

/**
 * One column per activity: the activity's stories are stacked by milestone
 * without the step subdivision. Dropping here keeps the dragged story's own
 * step and only changes the milestone and the position.
 */
const renderGroupView = (props: BoardProps): TemplateResult => {
  const { m, context, handlers } = props;
  const { state } = context;
  const rows = milestoneRows(m, state);
  return html`
    <dpk-matrix
      data-testid="usm-map-group"
      .rows=${matrixRowsOf(rows)}
      .columns=${groupMatrixColumns(state)}
      @dpk-matrix-reorder-row=${(event: CustomEvent<MatrixReorderRowDetail>) => handlers.reorderMilestone(event.detail)}
      @dpk-matrix-reorder-column=${(event: CustomEvent<MatrixReorderColumnDetail>) =>
        handlers.reorderActivity(event.detail)}
    >
      ${renderAxisCorner(m, CORNER_SLOT)}
      ${repeat(
        state.activities,
        (activity) => activity.id,
        (activity) => renderActivityHead(props, activity.id, true),
      )}
      ${renderAddActivityHead(m, context)}
      ${repeat(
        rows,
        (row) => row.id,
        (row) => renderMilestoneRowHead(props, row),
      )}
      ${repeat(
        rows,
        (row) => row.id,
        (row) =>
          html`${repeat(
            state.activities,
            (activity) => activity.id,
            (activity) => renderGroupCell(props, matrixRowIdOf(row), activity.id, row.id),
          )}`,
      )}
      ${renderAddMilestoneRowHead(m, context)}
    </dpk-matrix>
  `;
};

const renderAxisCorner = (m: UsmMessages, slot: string): TemplateResult => {
  return html`<div class="corner" slot=${slot}>
    <span class="dpk-label">${m.activityAxis}</span>
    <span class="dpk-label">${m.milestoneAxis}</span>
  </div>`;
};

/**
 * An activity group's head: its name, whose experience it is, how far its
 * stories have come (a bar in status colors along its bottom edge) and, in the
 * group view where the steps have no columns of their own, the steps it holds.
 * Placed through its column's slot; `<dpk-matrix>` is its drag handle's and
 * its lift's owner now, the way it owns a milestone row's.
 */
const renderActivityHead = (props: BoardProps, activityId: string, listSteps = false): TemplateResult => {
  const { m, context } = props;
  const { state } = context;
  const activity = state.activities.find((candidate) => candidate.id === activityId);
  if (!activity) return html`<div class="act-head"></div>`;
  const stories = state.stories.filter((story) => story.activityId === activity.id);
  const progress = statusDistribution(state, stories);
  return html`
    <div
      class="act-head"
      data-activity=${activity.id}
      data-column=${activity.id}
      data-dpk-target=${targetRef({ type: 'activity', id: activity.id })}
      data-grill-questions=${ifDefined(grillMark(activity.questions))}
      slot=${columnHeadSlot(activity.id)}
    >
      <div class="act-title">
        <span class="act-name">
          <dpk-inline-edit
            draggable="false"
            .value=${activity.name}
            .label=${m.activityNameLabel}
            @dpk-commit=${onCommit((name) =>
              context.dispatch({
                type: 'SET_ACTIVITY_NAME',
                target: { type: 'activity', id: activity.id },
                payload: { name },
              }),
            )}
          ></dpk-inline-edit>
          <span class="act-actor" data-empty=${String(activity.actor === undefined)}>
            <dpk-inline-edit
              draggable="false"
              truncate
              .value=${activity.actor ?? ''}
              .label=${m.activityActorLabel}
              .placeholder=${m.activityActorLabel}
              @dpk-commit=${onCommit((actor) =>
                context.dispatch({
                  type: 'SET_ACTIVITY_ACTOR',
                  target: { type: 'activity', id: activity.id },
                  payload: { actor },
                }),
              )}
            ></dpk-inline-edit>
          </span>
        </span>
        <span class="dpk-count" data-size="sm">${stories.length}</span>
        <button
          class="dpk-icon-btn"
          type="button"
          aria-label=${m.addStepAria}
          @click=${() => addStep(m, context, activity.id)}
        >
          ${iconPlus()}
        </button>
      </div>
      ${statusBar(progress, m.progressAria(progress.map((part) => `${part.name} ${part.count}`).join(', ')))}
      ${
        listSteps && activity.steps.length > 0
          ? html`<ol class="act-steps">
              ${activity.steps.map((step) => html`<li>${step.name}</li>`)}
            </ol>`
          : nothing
      }
    </div>
  `;
};

/**
 * A step's column head, placed through its sub-column's slot. It only moves
 * inside its own activity: `<dpk-matrix>` already confines a sub-column drag
 * to its own column, so nothing here has to guard against a cross-activity drop.
 */
const renderStepHead = (props: BoardProps, activityId: string, step: BackboneStep): TemplateResult => {
  const { m, context } = props;
  const ref = stepRefOf(activityId, step.id);
  return html`
    <div
      class="col-head"
      data-step=${ref}
      data-column=${activityId}
      data-column-step=${step.id}
      data-current=${String(context.navigation['step'] === step.id)}
      data-dpk-target=${targetRef({ type: 'step', id: ref })}
      data-grill-questions=${ifDefined(grillMark(step.questions))}
      slot=${subColumnHeadSlot(activityId, step.id)}
    >
      <h4>
        <dpk-inline-edit
          draggable="false"
          .value=${step.name}
          .label=${m.stepNameLabel}
          @dpk-commit=${onCommit((name) =>
            context.dispatch({
              type: 'SET_STEP_NAME',
              target: { type: 'step', id: step.id },
              payload: { name },
            }),
          )}
          @click=${(e: Event) => e.stopPropagation()}
        ></dpk-inline-edit>
      </h4>
      <span class="dpk-count" data-size="sm">${storyCountForStep(context.state, step.id)}</span>
    </div>
  `;
};

const renderAddActivityHead = (m: UsmMessages, context: TemplateRenderContext<UsmState>): TemplateResult => {
  return html`<div class="act-head" slot=${columnHeadSlot(ADD_ACTIVITY_COLUMN_ID)}>
    <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addActivity(m, context)}>
      ${m.newActivityButton}
    </button>
  </div>`;
};

/** The dash the add-activity column's lone sub-column shows under its button, where a real column shows its steps. */
const renderAddActivitySubHead = (): TemplateResult => {
  return html`<div class="corner" slot=${subColumnHeadSlot(ADD_ACTIVITY_COLUMN_ID, ADD_ACTIVITY_SUB_COLUMN_ID)}>
    <span class="dpk-label">—</span>
  </div>`;
};

const renderAddMilestoneRowHead = (m: UsmMessages, context: TemplateRenderContext<UsmState>): TemplateResult => {
  return html`<div class="row-lead" slot=${rowHeadSlot(ADD_MILESTONE_ROW_ID)}>
    <div class="row-head">
      <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addMilestone(m, context)}>
        ${m.newMilestoneButton}
      </button>
    </div>
  </div>`;
};

/**
 * A milestone row's head (and meta), placed through the row's slot.
 * `<dpk-matrix>` is the row's drag target and its handle now; the unassigned
 * row is simply not draggable (its matrix row says so), as it always was.
 */
const renderMilestoneRowHead = (props: BoardProps, row: MilestoneRow): TemplateResult => {
  const { m, context } = props;
  const milestoneId = row.id;
  const slot = rowHeadSlot(matrixRowIdOf(row));
  if (milestoneId === undefined) {
    return html`<div class="row-lead" slot=${slot}>
      <div class="row-head" data-unassigned="true" data-milestone=""><span>${row.name}</span></div>
      ${renderRowMeta(m, row)}
    </div>`;
  }
  const rename = renderMilestoneName(m, context, milestoneId, row.name);
  return html`
    <div class="row-lead" slot=${slot}>
      <div
        class="row-head"
        data-milestone=${milestoneId}
        data-dpk-target=${targetRef({ type: 'milestone', id: milestoneId })}
        data-grill-questions=${ifDefined(grillMark(row.questions))}
      >
        ${rename}
      </div>
      ${renderRowMeta(m, row)}
    </div>
  `;
};

/** When the slice is due and how much it holds, under its name. */
const renderRowMeta = (m: UsmMessages, row: MilestoneRow): TemplateResult => {
  return html`<div class="row-meta">
    ${row.timeframe === '' ? nothing : html`<span class="row-timeframe">${row.timeframe}</span>`}
    <span class="row-count">${m.storyCount(row.storyCount)}</span>
  </div>`;
};

const renderMilestoneName = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  milestoneId: string,
  name: string,
): TemplateResult => {
  return html`<dpk-inline-edit
    draggable="false"
    .value=${name}
    .label=${m.milestoneNameLabel}
    @dpk-commit=${onCommit((next) =>
      context.dispatch({
        type: 'SET_MILESTONE_NAME',
        target: { type: 'milestone', id: milestoneId },
        payload: { name: next },
      }),
    )}
  ></dpk-inline-edit>`;
};

const renderCell = (props: BoardProps, matrixRowId: string, cell: CellRef): TemplateResult => {
  const { m, context, drag, handlers } = props;
  const filter = mapFilterOf(context.state, context.navigation);
  const stories = storiesInCell(context.state, cell.stepId, cell.milestoneId).filter((story) =>
    passesMapFilter(filter, story),
  );
  const key = `cell:${cell.stepId}:${cell.milestoneId ?? ''}`;
  const target = drag.target({
    key,
    accepts: 'story',
    hovered: hoveredCard,
    onDrop: (drop) => handlers.dropOnCell(cell, drop),
  });
  return html`
    <div
      class="cell"
      data-step=${cell.stepId}
      data-milestone=${cell.milestoneId ?? ''}
      data-column=${cell.activityId}
      data-column-step=${cell.stepId}
      data-drop=${String(drag.isOver(key))}
      slot=${cellSlot(matrixRowId, { columnId: cell.activityId, subColumnId: cell.stepId })}
      @dragenter=${target.dragenter}
      @dragover=${target.dragover}
      @dragleave=${target.dragleave}
      @drop=${target.drop}
    >
      <div class="card-list" data-testid=${`cell-${cell.stepId}-${cell.milestoneId ?? 'unassigned'}`}>
        ${repeat(
          stories,
          (story) => story.id,
          (story) => renderCard(props, story, ''),
        )}
      </div>
      <button
        class="dpk-add add-cell"
        type="button"
        title=${m.addStoryCellAria}
        @click=${() => addStory(m, context, cell.activityId, cell.stepId, cell.milestoneId)}
      >
        ${m.addCellButton}
      </button>
    </div>
  `;
};

const renderGroupCell = (
  props: BoardProps,
  matrixRowId: string,
  activityId: string,
  milestoneId: string | undefined,
): TemplateResult => {
  const { m, context, drag, handlers } = props;
  const { state } = context;
  const filter = mapFilterOf(state, context.navigation);
  const stories = storiesInActivity(state, activityId, milestoneId).filter((story) => passesMapFilter(filter, story));
  const steps = state.activities.find((candidate) => candidate.id === activityId)?.steps ?? [];
  const firstStep = steps[0];
  const stepNameOf = (stepId: string): string => steps.find((step) => step.id === stepId)?.name ?? '';
  const key = `group:${activityId}:${milestoneId ?? ''}`;
  const target = drag.target({
    key,
    accepts: 'story',
    hovered: hoveredCard,
    onDrop: (drop) => handlers.dropOnGroupCell(activityId, milestoneId, drop),
  });
  return html`
    <div
      class="cell"
      data-activity=${activityId}
      data-milestone=${milestoneId ?? ''}
      data-column=${activityId}
      data-drop=${String(drag.isOver(key))}
      slot=${cellSlot(matrixRowId, { columnId: activityId })}
      @dragenter=${target.dragenter}
      @dragover=${target.dragover}
      @dragleave=${target.dragleave}
      @drop=${target.drop}
    >
      <div class="card-list" data-testid=${`group-cell-${activityId}-${milestoneId ?? 'unassigned'}`}>
        ${repeat(
          stories,
          (story) => story.id,
          (story) => renderCard(props, story, stepNameOf(story.stepId)),
        )}
      </div>
      ${
        firstStep
          ? html`<button
              class="dpk-add add-cell"
              type="button"
              aria-label=${m.addStoryCellAria}
              @click=${() => addStory(m, context, activityId, firstStep.id, milestoneId)}
            >
              ${m.addCellButton}
            </button>`
          : nothing
      }
    </div>
  `;
};

/**
 * A card takes its status's color; the column already says the activity.
 * `stepName` names the step where the column does not (the group view).
 */
const renderCard = (props: BoardProps, story: UserStory, stepName: string): TemplateResult => {
  const { context, drag, handlers } = props;
  const views = statusViews(context.state);
  const source = drag.source({ type: 'story', id: story.id });
  const dependency = dependencyOf(context.state, story.id);
  return html`<dpk-internal-usm-story-card
    data-story=${story.id}
    data-status=${story.statusId ?? ''}
    data-relation=${relationTo(context.state, context.navigation['story'], story) ?? nothing}
    data-highlight=${cardHighlightOf(props.highlighted, story.id) ?? nothing}
    data-dpk-target=${targetRef({ type: 'story', id: story.id })}
    data-grill-questions=${ifDefined(grillMark(story.questions))}
    draggable="true"
    tabindex="0"
    role="button"
    aria-haspopup="dialog"
    aria-label=${story.name}
    style=${statusToneStyle(statusViewOf(views, story)?.tone)}
    .story=${story}
    .stepName=${stepName}
    .statuses=${views}
    .labels=${labelsOfStory(context.state, story)}
    .reviewCount=${context.commentCount({ type: 'story', id: story.id })}
    .estimate=${hasFeature(context.state, 'estimates') ? (findEstimate(context.state, story.estimateId) ?? null) : null}
    .assignee=${hasFeature(context.state, 'assignees') ? (assigneeOf(context.state, story) ?? null) : null}
    .blocks=${dependency.dependents.length}
    .waits=${dependency.openBlockers}
    @click=${() => handlers.selectStory(story.id)}
    @keydown=${(event: KeyboardEvent) => {
      // Only the card's own keys: a link inside it keeps Enter for itself.
      if (event.composedPath()[0] !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      handlers.selectStory(story.id);
    }}
    ?focused=${context.navigation['story'] === story.id}
    ?dragging=${drag.isDragging('story', story.id)}
    @dragstart=${source.dragstart}
    @dragend=${source.dragend}
  ></dpk-internal-usm-story-card>`;
};

/** How a card stands in the map's highlight: on it, dimmed beside it, or (with none) neither. */
const cardHighlightOf = (highlighted: ReadonlySet<string> | null, storyId: string): 'on' | 'dimmed' | undefined => {
  if (highlighted === null) return undefined;
  return highlighted.has(storyId) ? 'on' : 'dimmed';
};

/** How a card relates to the open story: one it waits on, or one waiting on it. */
const relationTo = (
  state: UsmState,
  openId: string | undefined,
  story: UserStory,
): 'blocker' | 'dependent' | undefined => {
  if (openId === undefined || openId === story.id) return undefined;
  if (story.blockedBy?.includes(openId)) return 'dependent';
  return state.stories.find((candidate) => candidate.id === openId)?.blockedBy?.includes(story.id)
    ? 'blocker'
    : undefined;
};

/** The card under the pointer; events from inside its shadow root retarget to the host. */
const hoveredCard = (event: DragEvent): { id: string | null; element: Element } | null => {
  const card = event.target instanceof Element ? event.target.closest('dpk-internal-usm-story-card') : null;
  return card ? { id: card.getAttribute('data-story'), element: card } : null;
};
