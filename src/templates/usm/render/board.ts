import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { DragController, Drop } from '../../../lib/dom/drag';
import type { CellRef } from '../drop';

import { iconGrip, iconPlus } from '../../../core/icons';
import { onCommit } from '../../../lib/dom/events';
import { addActivity, addMilestone, addStep, addStory } from '../commands';
import { flatSteps, storiesInActivity, storiesInCell, type UserStory, type UsmState } from '../model';
import { cardModeOf, type CardIntent, type UsmUiMode } from '../ui-mode';

/** The two kinds of things that move on the board. */
export type UsmDragType = 'story' | 'milestone';

export type BoardHandlers = {
  readonly cardIntent: (storyId: string, intent: CardIntent) => void;
  readonly dropOnCell: (cell: CellRef, drop: Drop<'story'>) => void;
  readonly dropOnGroupCell: (activityId: string, milestoneId: string | undefined, drop: Drop<'story'>) => void;
  readonly dropOnMilestoneRow: (milestoneId: string, drop: Drop<'milestone'>) => void;
};

export type BoardProps = {
  readonly context: TemplateRenderContext<UsmState>;
  readonly mode: UsmUiMode;
  readonly drag: DragController<UsmDragType>;
  readonly handlers: BoardHandlers;
};

/** A milestone row of the map; the trailing `undefined` row collects unassigned stories. */
export type MilestoneRow = {
  readonly id: string | undefined;
  readonly name: string;
};

export const milestoneRows = (state: UsmState): readonly MilestoneRow[] => {
  return [...state.milestones.map(({ id, name }) => ({ id, name })), { id: undefined, name: '未割当' }];
};

export const renderEmptyBoard = (context: TemplateRenderContext<UsmState>): TemplateResult => {
  return html`
    <div class="empty">
      <h2>バックボーンがまだありません</h2>
      <p>アクティビティとステップを追加すると、ここにストーリーマップが現れます。</p>
      <button class="dpk-btn dpk-btn--accent" type="button" @click=${() => addActivity(context)}>
        ＋ 最初のアクティビティ
      </button>
    </div>
  `;
};

/** View tabs plus the map in the requested grouping. */
export const renderBoard = (props: BoardProps): TemplateResult => {
  const { context } = props;
  const columns = flatSteps(context.state);
  if (columns.length === 0) return renderEmptyBoard(context);
  const view: 'group' | 'activity' = context.navigation['view'] === 'group' ? 'group' : 'activity';
  return html`
    <div class="view-tabs" role="tablist" aria-label="まとめる単位">
      ${renderViewTab(context, 'activity', view, 'アクティビティ')}
      ${renderViewTab(context, 'group', view, 'アクティビティグループ')}
    </div>
    ${view === 'activity' ? renderActivityView(props, columns) : renderGroupView(props)}
  `;
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
  const { context } = props;
  const { state } = context;
  const rows = milestoneRows(state);
  return html`
    <div class="map-scroll">
      <div class="map" style=${`--cols:${columns.length + 1}`} data-testid="usm-map">
        <div class="map-row">
          <div class="corner">
            <span class="dpk-label">アクティビティグループ →</span>
          </div>
          ${repeat(
            state.activities,
            (activity) => activity.id,
            (activity) =>
              renderActivityHead(context, activity.id, `grid-column: span ${Math.max(activity.steps.length, 1)}`),
          )}
          ${renderAddActivityHead(context)}
        </div>
        <div class="map-row">
          ${renderAxisCorner()}
          ${repeat(
            columns,
            ({ activity, step }) => `${activity.id}.${step.id}`,
            ({ step }) => html`
              <div class="col-head" data-current=${String(context.navigation['step'] === step.id)}>
                <h4>
                  <dpk-component-inline-edit
                    .value=${step.name}
                    .label=${'ステップ名'}
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
              </div>
            `,
          )}
          <div class="corner"><span class="dpk-label">—</span></div>
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
        ${renderAddMilestoneRow(context, columns.length)}
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
  const { context } = props;
  const { state } = context;
  const rows = milestoneRows(state);
  return html`
    <div class="map-scroll">
      <div class="map" style=${`--cols:${state.activities.length + 1}`} data-testid="usm-map-group">
        <div class="map-row">
          ${renderAxisCorner()}
          ${repeat(
            state.activities,
            (activity) => activity.id,
            (activity) => renderActivityHead(context, activity.id),
          )}
          ${renderAddActivityHead(context)}
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
        ${renderAddMilestoneRow(context, state.activities.length)}
      </div>
    </div>
  `;
};

const renderAxisCorner = (): TemplateResult => {
  return html`<div class="corner">
    <span class="dpk-label">アクティビティ →</span>
    <span class="dpk-label">マイルストーン ↓</span>
  </div>`;
};

const renderActivityHead = (
  context: TemplateRenderContext<UsmState>,
  activityId: string,
  style?: string,
): TemplateResult => {
  const activity = context.state.activities.find((candidate) => candidate.id === activityId);
  if (!activity) return html`<div class="act-head"></div>`;
  return html`
    <div class="act-head" style=${style ?? nothing}>
      <dpk-component-inline-edit
        .value=${activity.name}
        .label=${'アクティビティ名'}
        @dpk-commit=${onCommit((name) =>
          context.dispatch({
            type: 'SET_ACTIVITY_NAME',
            target: { type: 'activity', id: activity.id },
            payload: { name },
          }),
        )}
      ></dpk-component-inline-edit>
      <button
        class="dpk-icon-btn"
        type="button"
        aria-label="このアクティビティにステップを追加"
        @click=${() => addStep(context, activity.id)}
      >
        ${iconPlus()}
      </button>
    </div>
  `;
};

const renderAddActivityHead = (context: TemplateRenderContext<UsmState>): TemplateResult => {
  return html`<div class="act-head">
    <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addActivity(context)}>＋ アクティビティ</button>
  </div>`;
};

const renderAddMilestoneRow = (context: TemplateRenderContext<UsmState>, columnCount: number): TemplateResult => {
  return html`<div class="map-row">
    <div class="row-head">
      <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addMilestone(context)}>
        ＋ マイルストーン
      </button>
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
  const { context, drag, handlers } = props;
  const milestoneId = row.id;
  if (milestoneId === undefined) {
    return html`<div class="map-row" data-draggable="false" data-row-dragging="false" data-row-drop="false">
      <div class="row-head" data-milestone="" draggable="false"><span>${row.name}</span></div>
      ${cells}
      <div class="cell"></div>
    </div>`;
  }
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
        <span class="row-grip" aria-hidden="true">${iconGrip()}</span
        ><dpk-component-inline-edit
          draggable="false"
          .value=${row.name}
          .label=${'マイルストーン名'}
          @dpk-commit=${onCommit((name) =>
            context.dispatch({
              type: 'SET_MILESTONE_NAME',
              target: { type: 'milestone', id: milestoneId },
              payload: { name },
            }),
          )}
        ></dpk-component-inline-edit>
      </div>
      ${cells}
      <div class="cell"></div>
    </div>
  `;
};

const renderCell = (props: BoardProps, cell: CellRef): TemplateResult => {
  const { context, drag, handlers } = props;
  const stories = storiesInCell(context.state, cell.stepId, cell.milestoneId);
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
          (story) => renderCard(props, story),
        )}
      </div>
      <button
        class="dpk-btn dpk-btn--ghost add-cell"
        type="button"
        title="このマスにストーリーを追加"
        @click=${() => addStory(context, cell.activityId, cell.stepId, cell.milestoneId)}
      >
        ＋ 追加
      </button>
    </div>
  `;
};

const renderGroupCell = (props: BoardProps, activityId: string, milestoneId: string | undefined): TemplateResult => {
  const { context, drag, handlers } = props;
  const { state } = context;
  const stories = storiesInActivity(state, activityId, milestoneId);
  const firstStep = state.activities.find((candidate) => candidate.id === activityId)?.steps[0];
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
          (story) => renderCard(props, story),
        )}
      </div>
      ${
        firstStep
          ? html`<button
              class="dpk-btn dpk-btn--ghost add-cell"
              type="button"
              aria-label="このマスにストーリーを追加"
              @click=${() => addStory(context, activityId, firstStep.id, milestoneId)}
            >
              ＋ 追加
            </button>`
          : nothing
      }
    </div>
  `;
};

const renderCard = (props: BoardProps, story: UserStory): TemplateResult => {
  const { context, mode, drag, handlers } = props;
  const notes = context.comments.filter((c) => c.target.type === 'story' && c.target.id === story.id);
  const source = drag.source({ type: 'story', id: story.id });
  return html`<dpk-internal-usm-story-card
    data-story=${story.id}
    draggable="true"
    .story=${story}
    .notes=${notes}
    .mode=${cardModeOf(mode, story.id)}
    .onIntent=${(intent: CardIntent) => handlers.cardIntent(story.id, intent)}
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
