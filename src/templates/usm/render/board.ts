import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { DragController, Drop, DropTargetHandlers } from '../../../lib/dom/drag';
import type { CellRef } from '../drop';
import type { UsmMessages } from '../messages';

import { iconGrip, iconPlus } from '../../../core/icons';
import { targetRef } from '../../../core/target';
import { setCompositeDragImage } from '../../../lib/dom/drag-image';
import { onCommit } from '../../../lib/dom/events';
import { addActivity, addMilestone, addStep, addStory } from '../commands';
import { dependencyOf } from '../dependencies';
import { mapFilterOf, passesMapFilter } from '../map-filter';
import {
  assigneeOf,
  type BackboneStep,
  findEstimate,
  findStep,
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

/** The kinds of things that move on the board: cards, rows and the two kinds of columns. */
export type UsmDragType = 'story' | 'milestone' | 'activity' | 'step';

export type BoardHandlers = {
  /** A card was clicked: open its story in the panel. */
  readonly selectStory: (storyId: string) => void;
  readonly dropOnCell: (cell: CellRef, drop: Drop<'story'>) => void;
  readonly dropOnGroupCell: (activityId: string, milestoneId: string | undefined, drop: Drop<'story'>) => void;
  readonly dropOnMilestoneRow: (milestoneId: string, drop: Drop<'milestone'>) => void;
  /** An activity group's column was dropped on another's (its head or any of its cells). */
  readonly dropOnActivity: (drop: Drop<'activity'>) => void;
  /** Likewise a step's column; the drop names steps by their qualified ref (`activity.step`). */
  readonly dropOnStep: (drop: Drop<'step'>) => void;
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
};

/** Every milestone in map order, then Unassigned. */
export const milestoneRows = (m: UsmMessages, state: UsmState): readonly MilestoneRow[] => {
  const countOf = (id: string | undefined): number => state.stories.filter((story) => story.milestoneId === id).length;
  return [
    ...state.milestones.map(({ id, name, timeframe }) => ({
      id,
      name,
      timeframe: timeframe?.trim() ?? '',
      storyCount: countOf(id),
    })),
    { id: undefined, name: m.unassigned, timeframe: '', storyCount: countOf(undefined) },
  ];
};

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
  return html`<div class="segmented view-tabs" role="tablist" aria-label=${m.groupingLabel}>
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
  return html`<a
    class="tab"
    role="tab"
    data-current=${String(selected)}
    aria-selected=${selected ? 'true' : 'false'}
    href=${context.hashFor({ view: tab })}
    >${label}</a
  >`;
};

/**
 * One column per backbone step, activity groups banded on top.
 * Milestone rows stay identical in both views.
 */
const renderActivityView = (props: BoardProps, columns: ReturnType<typeof flatSteps>): TemplateResult => {
  const { m, context } = props;
  const { state } = context;
  const rows = milestoneRows(m, state);
  return html`
    <div class="map-scroll">
      <div class="map" style=${`--cols:${columns.length + 1}`} data-testid="usm-map">
        <div class="map-head">
          <div class="map-row">
            <div class="corner">
              <span class="dpk-label">${m.groupAxisHeader}</span>
            </div>
            ${repeat(
              state.activities,
              (activity) => activity.id,
              (activity) =>
                renderActivityHead(props, activity.id, `grid-column: span ${Math.max(activity.steps.length, 1)}`),
            )}
            ${renderAddActivityHead(m, context)}
          </div>
          <div class="map-row">
            ${renderAxisCorner(m)}
            ${repeat(
              columns,
              ({ activity, step }) => `${activity.id}.${step.id}`,
              ({ activity, step }) => renderStepHead(props, activity.id, step),
            )}
            <div class="corner"><span class="dpk-label">—</span></div>
          </div>
        </div>
        ${repeat(
          rows,
          (row) => row.id,
          (row) =>
            renderMilestoneRow(
              props,
              row,
              html`${repeat(
                columns,
                ({ activity, step }) => `${activity.id}.${step.id}`,
                ({ activity, step }) =>
                  renderCell(props, { activityId: activity.id, stepId: step.id, milestoneId: row.id }),
              )}`,
            ),
        )}
        ${renderAddMilestoneRow(m, context, columns.length)}
      </div>
    </div>
  `;
};

/**
 * One column per activity: the activity's stories are stacked by milestone
 * without the step subdivision. Dropping here keeps the dragged story's own
 * step and only changes the milestone and the position.
 */
const renderGroupView = (props: BoardProps): TemplateResult => {
  const { m, context } = props;
  const { state } = context;
  const rows = milestoneRows(m, state);
  return html`
    <div class="map-scroll">
      <div class="map" style=${`--cols:${state.activities.length + 1}`} data-testid="usm-map-group">
        <div class="map-head">
          <div class="map-row">
            ${renderAxisCorner(m)}
            ${repeat(
              state.activities,
              (activity) => activity.id,
              (activity) => renderActivityHead(props, activity.id, undefined, true),
            )}
            ${renderAddActivityHead(m, context)}
          </div>
        </div>
        ${repeat(
          rows,
          (row) => row.id,
          (row) =>
            renderMilestoneRow(
              props,
              row,
              html`${repeat(
                state.activities,
                (activity) => activity.id,
                (activity) => renderGroupCell(props, activity.id, row.id),
              )}`,
            ),
        )}
        ${renderAddMilestoneRow(m, context, state.activities.length)}
      </div>
    </div>
  `;
};

const renderAxisCorner = (m: UsmMessages): TemplateResult => {
  return html`<div class="corner">
    <span class="dpk-label">${m.activityAxis}</span>
    <span class="dpk-label">${m.milestoneAxis}</span>
  </div>`;
};

/**
 * An activity group's head: its name, whose experience it is, how far its
 * stories have come (a bar in status colors along its bottom edge) and, in the
 * group view where the steps have no columns of their own, the steps it holds.
 * The head is the group's drag handle, like a milestone's row head: the whole
 * column lifts, and dropped anywhere on another group's column it moves to
 * that slot.
 */
const renderActivityHead = (
  props: BoardProps,
  activityId: string,
  style?: string,
  listSteps = false,
): TemplateResult => {
  const { m, context, drag } = props;
  const { state } = context;
  const activity = state.activities.find((candidate) => candidate.id === activityId);
  if (!activity) return html`<div class="act-head"></div>`;
  const stories = state.stories.filter((story) => story.activityId === activity.id);
  const progress = statusDistribution(state, stories);
  const target = drag.combine('activity', columnTargets(props, activity.id));
  const source = drag.source({ type: 'activity', id: activity.id });
  return html`
    <div
      class="act-head"
      style=${style ?? ''}
      data-activity=${activity.id}
      data-column=${activity.id}
      data-dpk-target=${targetRef({ type: 'activity', id: activity.id })}
      draggable="true"
      data-col-dragging=${String(drag.isDragging('activity', activity.id))}
      data-col-drop=${columnDrop(drag, activity.id)}
      @dragstart=${(event: DragEvent) => {
        liftColumn(event, activity.id);
        source.dragstart(event);
      }}
      @dragend=${source.dragend}
      @dragenter=${target.dragenter}
      @dragover=${target.dragover}
      @dragleave=${target.dragleave}
      @drop=${target.drop}
    >
      <div class="act-title">
        <span class="col-grip" aria-hidden="true">${iconGrip()}</span>
        <span class="act-name">
          <dpk-component-inline-edit
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
          ></dpk-component-inline-edit>
          <span class="act-actor" data-empty=${String(activity.actor === undefined)}>
            <dpk-component-inline-edit
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
            ></dpk-component-inline-edit>
          </span>
        </span>
        <span class="count">${stories.length}</span>
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
 * A step's column head. It is the step's drag handle: the column lifts, and
 * moves only inside its own activity, so the other activities' columns do
 * not take it.
 */
const renderStepHead = (props: BoardProps, activityId: string, step: BackboneStep): TemplateResult => {
  const { m, context, drag } = props;
  const ref = stepRefOf(activityId, step.id);
  const target = drag.combine('step', columnTargets(props, activityId, step.id));
  const source = drag.source({ type: 'step', id: ref });
  return html`
    <div
      class="col-head"
      data-step=${ref}
      data-column=${activityId}
      data-column-step=${step.id}
      data-current=${String(context.navigation['step'] === step.id)}
      data-dpk-target=${targetRef({ type: 'step', id: ref })}
      draggable="true"
      data-col-dragging=${String(columnDragging(drag, activityId, step.id))}
      data-col-drop=${columnDrop(drag, activityId, step.id)}
      data-step-edge=${stepEdgeOf(context.state, activityId, step.id)}
      @dragstart=${(event: DragEvent) => {
        liftColumn(event, activityId, step.id);
        source.dragstart(event);
      }}
      @dragend=${source.dragend}
      @dragenter=${target.dragenter}
      @dragover=${target.dragover}
      @dragleave=${target.dragleave}
      @drop=${target.drop}
    >
      <span class="col-grip" aria-hidden="true">${iconGrip()}</span>
      <h4>
        <dpk-component-inline-edit
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
        ></dpk-component-inline-edit>
      </h4>
      <span class="count">${storyCountForStep(context.state, step.id)}</span>
    </div>
  `;
};

/**
 * The drop targets every part of a column (its heads and cells) carries, as a
 * milestone row's whole row is its target: an activity group's column takes
 * the other groups, and a step's column also the steps of its own activity.
 */
const columnTargets = (
  props: BoardProps,
  activityId: string,
  stepId?: string,
): (readonly [UsmDragType, DropTargetHandlers])[] => {
  const { context, drag, handlers } = props;
  const activity = drag.target({
    key: `activity:${activityId}`,
    accepts: 'activity',
    hovered: hoveredColumn(activityId),
    onDrop: (drop) => handlers.dropOnActivity(drop),
  });
  if (stepId === undefined) return [['activity', activity]];
  const dragged = drag.item;
  const foreign = dragged?.type === 'step' && findStep(context.state, dragged.id)?.activity.id !== activityId;
  if (foreign) return [['activity', activity]];
  const ref = stepRefOf(activityId, stepId);
  const step = drag.target({
    key: `step:${ref}`,
    accepts: 'step',
    hovered: hoveredColumn(ref),
    onDrop: (drop) => handlers.dropOnStep(drop),
  });
  return [
    ['activity', activity],
    ['step', step],
  ];
};

/**
 * Which column a part lights up as the drop target, if any: its activity
 * group's (spanning its steps) or its step's. All the column's parts light up.
 */
const columnDrop = (
  drag: DragController<UsmDragType>,
  activityId: string,
  stepId?: string,
): 'activity' | 'step' | 'none' => {
  if (drag.isOver(`activity:${activityId}`)) return 'activity';
  if (stepId !== undefined && drag.isOver(`step:${stepRefOf(activityId, stepId)}`)) return 'step';
  return 'none';
};

/**
 * Where a step stands in its activity group's span (`first`, `last`, both or
 * neither): a lit group draws its sides only along its outer steps.
 */
const stepEdgeOf = (state: UsmState, activityId: string, stepId: string): string => {
  const steps = state.activities.find((activity) => activity.id === activityId)?.steps ?? [];
  return [steps[0]?.id === stepId ? 'first' : '', steps.at(-1)?.id === stepId ? 'last' : '']
    .filter((edge) => edge !== '')
    .join(' ');
};

/** Whether the column (an activity's, or one step's in it) is being dragged: it fades like a dragged row. */
const columnDragging = (drag: DragController<UsmDragType>, activityId: string, stepId?: string): boolean => {
  return (
    drag.isDragging('activity', activityId) ||
    (stepId !== undefined && drag.isDragging('step', stepRefOf(activityId, stepId)))
  );
};

const renderAddActivityHead = (m: UsmMessages, context: TemplateRenderContext<UsmState>): TemplateResult => {
  return html`<div class="act-head">
    <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addActivity(m, context)}>
      ${m.newActivityButton}
    </button>
  </div>`;
};

const renderAddMilestoneRow = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  columnCount: number,
): TemplateResult => {
  return html`<div class="map-row">
    <div class="row-lead">
      <div class="row-head">
        <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addMilestone(m, context)}>
          ${m.newMilestoneButton}
        </button>
      </div>
    </div>
    ${Array.from({ length: columnCount + 1 }, () => html`<div class="cell"></div>`)}
  </div>`;
};

/**
 * A milestone row: the `.map-row` is the drop target and carries the visual
 * drag state; drag *start* fires from the `.row-head` grip so it never
 * competes with the draggable cards inside the cells. The unassigned row is
 * neither draggable nor a drop target.
 */
const renderMilestoneRow = (props: BoardProps, row: MilestoneRow, cells: TemplateResult): TemplateResult => {
  const { m, context, drag, handlers } = props;
  const milestoneId = row.id;
  if (milestoneId === undefined) {
    return html`<div
      class="map-row"
      data-unassigned="true"
      data-draggable="false"
      data-row-dragging="false"
      data-row-drop="false"
    >
      <div class="row-lead">
        <div class="row-head" data-milestone="" draggable="false"><span>${row.name}</span></div>
        ${renderRowMeta(m, row)}
      </div>
      ${cells}
      <div class="cell"></div>
    </div>`;
  }
  const rename = renderMilestoneName(m, context, milestoneId, row.name);
  const key = `row:${milestoneId}`;
  const target = drag.target({
    key,
    accepts: 'milestone',
    hovered: hoveredMilestoneRow,
    onDrop: (drop) => handlers.dropOnMilestoneRow(milestoneId, drop),
  });
  const source = drag.source({ type: 'milestone', id: milestoneId });
  return html`
    <div
      class="map-row"
      data-draggable="true"
      data-row-dragging=${String(drag.isDragging('milestone', milestoneId))}
      data-row-drop=${String(drag.isOver(key))}
      @dragenter=${target.dragenter}
      @dragover=${target.dragover}
      @dragleave=${target.dragleave}
      @drop=${target.drop}
    >
      <div class="row-lead">
        <div
          class="row-head"
          data-milestone=${milestoneId}
          data-dpk-target=${targetRef({ type: 'milestone', id: milestoneId })}
          draggable="true"
          @dragstart=${(event: DragEvent) => {
            liftRow(event);
            source.dragstart(event);
          }}
          @dragend=${source.dragend}
        >
          <span class="row-grip" aria-hidden="true">${iconGrip()}</span>${rename}
        </div>
        ${renderRowMeta(m, row)}
      </div>
      ${cells}
      <div class="cell"></div>
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
  return html`<dpk-component-inline-edit
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
  ></dpk-component-inline-edit>`;
};

const renderCell = (props: BoardProps, cell: CellRef): TemplateResult => {
  const { m, context, drag, handlers } = props;
  const filter = mapFilterOf(context.state, context.navigation);
  const stories = storiesInCell(context.state, cell.stepId, cell.milestoneId).filter((story) =>
    passesMapFilter(filter, story),
  );
  const key = `cell:${cell.stepId}:${cell.milestoneId ?? ''}`;
  const target = drag.combine('story', [
    [
      'story',
      drag.target({ key, accepts: 'story', hovered: hoveredCard, onDrop: (drop) => handlers.dropOnCell(cell, drop) }),
    ],
    ...columnTargets(props, cell.activityId, cell.stepId),
  ]);
  return html`
    <div
      class="cell"
      data-step=${cell.stepId}
      data-milestone=${cell.milestoneId ?? ''}
      data-column=${cell.activityId}
      data-column-step=${cell.stepId}
      data-drop=${String(drag.isOver(key))}
      data-col-dragging=${String(columnDragging(drag, cell.activityId, cell.stepId))}
      data-col-drop=${columnDrop(drag, cell.activityId, cell.stepId)}
      data-step-edge=${stepEdgeOf(context.state, cell.activityId, cell.stepId)}
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
        class="dpk-btn dpk-btn--ghost add-cell"
        type="button"
        title=${m.addStoryCellAria}
        @click=${() => addStory(m, context, cell.activityId, cell.stepId, cell.milestoneId)}
      >
        ${m.addCellButton}
      </button>
    </div>
  `;
};

const renderGroupCell = (props: BoardProps, activityId: string, milestoneId: string | undefined): TemplateResult => {
  const { m, context, drag, handlers } = props;
  const { state } = context;
  const filter = mapFilterOf(state, context.navigation);
  const stories = storiesInActivity(state, activityId, milestoneId).filter((story) => passesMapFilter(filter, story));
  const steps = state.activities.find((candidate) => candidate.id === activityId)?.steps ?? [];
  const firstStep = steps[0];
  const stepNameOf = (stepId: string): string => steps.find((step) => step.id === stepId)?.name ?? '';
  const key = `group:${activityId}:${milestoneId ?? ''}`;
  const target = drag.combine('story', [
    [
      'story',
      drag.target({
        key,
        accepts: 'story',
        hovered: hoveredCard,
        onDrop: (drop) => handlers.dropOnGroupCell(activityId, milestoneId, drop),
      }),
    ],
    ...columnTargets(props, activityId),
  ]);
  return html`
    <div
      class="cell"
      data-activity=${activityId}
      data-milestone=${milestoneId ?? ''}
      data-column=${activityId}
      data-drop=${String(drag.isOver(key))}
      data-col-dragging=${String(columnDragging(drag, activityId))}
      data-col-drop=${columnDrop(drag, activityId)}
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
              class="dpk-btn dpk-btn--ghost add-cell"
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

/**
 * The pointer grabs the `.row-head`, but the ghost that follows it is the whole
 * `.map-row`, anchored where the row was picked up.
 */
const liftRow = (event: DragEvent): void => {
  const head = event.currentTarget instanceof Element ? event.currentTarget : null;
  const row = head?.closest('.map-row');
  if (!row || !event.dataTransfer) return;
  const rect = row.getBoundingClientRect();
  event.dataTransfer.setDragImage(row, event.clientX - rect.left, event.clientY - rect.top);
};

/** Every part of a column stands for the same slot: the column itself is what is hovered. */
const hoveredColumn =
  (id: string) =>
  (event: DragEvent): { id: string; element: Element } | null =>
    event.currentTarget instanceof Element ? { id, element: event.currentTarget } : null;

/**
 * Lifts a whole column as the drag image, the way a milestone's row lifts:
 * its heads and every cell under them (`data-column`, and `data-column-step`
 * for a step's), as far as the map shows them. The sticky heads go last so
 * they paint over the cells scrolled under them.
 */
const liftColumn = (event: DragEvent, activityId: string, stepId?: string): void => {
  const head = event.currentTarget instanceof Element ? event.currentTarget : null;
  const frame = head?.closest('.map-scroll');
  if (!frame) return;
  const parts = [...frame.querySelectorAll('[data-column]')].filter(
    (part) =>
      part.getAttribute('data-column') === activityId &&
      (stepId === undefined || part.getAttribute('data-column-step') === stepId),
  );
  const heads = parts.filter((part) => part.closest('.map-head'));
  const cells = parts.filter((part) => !part.closest('.map-head'));
  setCompositeDragImage(event, [...cells, ...heads], frame);
};

const hoveredMilestoneRow = (event: DragEvent): { id: string | null; element: Element } | null => {
  const row = event.target instanceof Element ? event.target.closest('.map-row') : null;
  const head = row?.querySelector('.row-head[data-milestone]');
  if (!row || !head) return null;
  const id = head.getAttribute('data-milestone');
  return { id: id === '' ? null : id, element: row };
};
