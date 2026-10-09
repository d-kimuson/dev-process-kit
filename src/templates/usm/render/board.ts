import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { DragController, Drop } from '../../../lib/dom/drag';
import type { CellRef } from '../drop';
import type { UsmMessages } from '../messages';

import { iconGrip, iconPlus } from '../../../core/icons';
import { onCommit } from '../../../lib/dom/events';
import { addActivity, addMilestone, addStep, addStory } from '../commands';
import {
  flatSteps,
  storiesInActivity,
  storiesInCell,
  storyCountForStep,
  type UserStory,
  type UsmState,
} from '../model';
import {
  passesStatusFilter,
  statusDistribution,
  statusFilterOf,
  statusFilterParam,
  statusViewOf,
  statusViews,
  toggleStatusFilter,
  type StatusView,
} from '../status-view';
import { statusBar, statusIcon, statusToneStyle } from './tone';

/** The two kinds of things that move on the board. */
export type UsmDragType = 'story' | 'milestone';

export type BoardHandlers = {
  /** A card was clicked: open its story in the panel. */
  readonly selectStory: (storyId: string) => void;
  readonly dropOnCell: (cell: CellRef, drop: Drop<'story'>) => void;
  readonly dropOnGroupCell: (activityId: string, milestoneId: string | undefined, drop: Drop<'story'>) => void;
  readonly dropOnMilestoneRow: (milestoneId: string, drop: Drop<'milestone'>) => void;
};

export type BoardProps = {
  readonly m: UsmMessages;
  readonly context: TemplateRenderContext<UsmState>;
  readonly drag: DragController<UsmDragType>;
  readonly handlers: BoardHandlers;
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
  return html`${renderStatusFilter(m, context)}
  ${usmViewOf(context) === 'activity' ? renderActivityView(props, columns) : renderGroupView(props)}`;
};

/**
 * The grid's filter by status, one toggle per status with its icon and count.
 * Nothing on = every story; it doubles as the legend of the card colors.
 */
const renderStatusFilter = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
): TemplateResult | typeof nothing => {
  const { state } = context;
  if (state.statuses.length === 0) return nothing;
  const filter = statusFilterOf(state, context.navigation);
  const views = statusViews(state);
  const countOf = (id: string): number => state.stories.filter((story) => story.statusId === id).length;
  const option = (view: StatusView): TemplateResult => {
    const id = view.id;
    const on = filter.has(id);
    return html`<a
      class="filter-chip"
      role="checkbox"
      data-status=${id}
      aria-checked=${String(on)}
      style=${statusToneStyle(view.tone)}
      href=${context.hashFor({ status: statusFilterParam(state, toggleStatusFilter(filter, id)) })}
      >${statusIcon(view)}<span>${view.name}</span><span class="filter-count">${countOf(id)}</span></a
    >`;
  };
  return html`<div class="map-toolbar" role="group" aria-label=${m.statusFilterLabel} data-testid="usm-status-filter">
    <span class="filter-label">${m.statusFilterLabel}</span>
    ${views.map(option)}
    ${
      filter.size === 0
        ? nothing
        : html`<a class="filter-clear" href=${context.hashFor({ status: null })}>${m.clearFilter}</a>`
    }
  </div>`;
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
                renderActivityHead(m, context, activity.id, `grid-column: span ${Math.max(activity.steps.length, 1)}`),
            )}
            ${renderAddActivityHead(m, context)}
          </div>
          <div class="map-row">
            ${renderAxisCorner(m)}
            ${repeat(
              columns,
              ({ activity, step }) => `${activity.id}.${step.id}`,
              ({ step }) => html`
                <div class="col-head" data-current=${String(context.navigation['step'] === step.id)}>
                  <h4>
                    <dpk-component-inline-edit
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
                  <span class="count">${storyCountForStep(state, step.id)}</span>
                </div>
              `,
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
              (activity) => renderActivityHead(m, context, activity.id, undefined, true),
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
 * stories have come (a bar in status colors) and, in the group view where the
 * steps have no columns of their own, the steps it holds.
 */
const renderActivityHead = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  activityId: string,
  style?: string,
  listSteps = false,
): TemplateResult => {
  const { state } = context;
  const activity = state.activities.find((candidate) => candidate.id === activityId);
  if (!activity) return html`<div class="act-head"></div>`;
  const stories = state.stories.filter((story) => story.activityId === activity.id);
  const progress = statusDistribution(state, stories);
  return html`
    <div class="act-head" style=${style ?? ''} data-activity=${activity.id}>
      <div class="act-title">
        <dpk-component-inline-edit
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
      <div class="act-meta">
        <span class="act-actor" data-empty=${String(activity.actor === undefined)}>
          <dpk-component-inline-edit
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
        ${statusBar(progress, m.progressAria(progress.map((part) => `${part.name} ${part.count}`).join(', ')))}
      </div>
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
  const filter = statusFilterOf(context.state, context.navigation);
  const stories = storiesInCell(context.state, cell.stepId, cell.milestoneId).filter((story) =>
    passesStatusFilter(filter, story),
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
      data-drop=${String(drag.isOver(key))}
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
  const filter = statusFilterOf(state, context.navigation);
  const stories = storiesInActivity(state, activityId, milestoneId).filter((story) =>
    passesStatusFilter(filter, story),
  );
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
      data-drop=${String(drag.isOver(key))}
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
  const notes = context.comments.filter((c) => c.target.type === 'story' && c.target.id === story.id);
  const source = drag.source({ type: 'story', id: story.id });
  return html`<dpk-internal-usm-story-card
    data-story=${story.id}
    data-status=${story.statusId ?? ''}
    draggable="true"
    style=${statusToneStyle(statusViewOf(views, story)?.tone)}
    .story=${story}
    .stepName=${stepName}
    .statuses=${views}
    .notes=${notes}
    @click=${() => handlers.selectStory(story.id)}
    ?focused=${context.navigation['story'] === story.id}
    ?dragging=${drag.isDragging('story', story.id)}
    @dragstart=${source.dragstart}
    @dragend=${source.dragend}
  ></dpk-internal-usm-story-card>`;
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

const hoveredMilestoneRow = (event: DragEvent): { id: string | null; element: Element } | null => {
  const row = event.target instanceof Element ? event.target.closest('.map-row') : null;
  const head = row?.querySelector('.row-head[data-milestone]');
  if (!row || !head) return null;
  const id = head.getAttribute('data-milestone');
  return { id: id === '' ? null : id, element: row };
};
