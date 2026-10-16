import { css, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { CircleHelp, TriangleAlert } from 'lucide';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';

import { iconTrash, lucide } from '../../../core/icons';
import { targetRef } from '../../../core/target';
import { onCommit, onInputChange, onSelectChange } from '../../../lib/dom/events';
import {
  BURNDOWN_UNITS,
  burndownMilestoneOf,
  burndownOf,
  burndownUnitOf,
  momentLabel,
  type BurndownPoint,
} from '../burndown';
import { type ChartSize } from '../burndown-chart';
import { addEstimate, recordSnapshot } from '../commands';
import { type Estimate, type Milestone, type StatusTone, type UsmState } from '../model';
import { onNumberChange } from './number-input';
import { renderRowTools } from './status-overview';

const iconAbout = lucide(CircleHelp);
const iconWarning = lucide(TriangleAlert);

const COMBINED_SIZE: ChartSize = { width: 720, height: 240, inset: { top: 16, right: 20, bottom: 26, left: 40 } };
const STATUS_SIZE: ChartSize = { width: 340, height: 150, inset: { top: 12, right: 14, bottom: 24, left: 32 } };

/**
 * The burndown tab: for one milestone, the work left over time — weighted by
 * how far each story still has to go, then once per status — drawn from the
 * snapshots and the map as it stands now. The estimate scale and the
 * snapshots themselves are kept here too.
 */
export const renderBurndown = (m: UsmMessages, context: TemplateRenderContext<UsmState>, now: Date): TemplateResult => {
  const { state, navigation } = context;
  const milestone = burndownMilestoneOf(state, navigation);
  return html`
    <section class="bd-overview" data-testid="usm-burndown">
      ${
        milestone
          ? renderCharts(m, context, milestone, now)
          : html`<div class="empty">
              <h2>${m.burndownTab}</h2>
              <p>${m.noMilestonesForBurndown}</p>
            </div>`
      }
      <div class="bd-side">${renderSnapshots(m, context)} ${renderEstimates(m, context)}</div>
    </section>
  `;
};

const renderCharts = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  milestone: Milestone,
  now: Date,
): TemplateResult => {
  const { state, navigation } = context;
  const unit = burndownUnitOf(state, navigation);
  const burndown = burndownOf(state, milestone.id, unit, now.getTime());
  const unestimated = state.stories.filter(
    (story) => story.milestoneId === milestone.id && story.estimateId === undefined,
  ).length;
  return html`
    <header class="bd-bar">
      <label class="bd-control">
        <span>${m.burndownMilestoneLabel}</span>
        <select
          class="dpk-select"
          data-role="milestone"
          @change=${onSelectChange((milestoneId) => context.navigate({ milestone: milestoneId }))}
        >
          ${state.milestones.map(
            (option) =>
              html`<option value=${option.id} ?selected=${option.id === milestone.id}>${option.name}</option>`,
          )}
        </select>
      </label>
      <label class="bd-control" data-dpk-target=${targetRef({ type: 'milestone', id: milestone.id })}>
        <span>${m.dueDateLabel}</span>
        <input
          class="dpk-input"
          type="date"
          data-role="due-date"
          .value=${milestone.dueDate ?? ''}
          @change=${onInputChange((value) => {
            const dueDate = value === '' ? null : value;
            if (dueDate === (milestone.dueDate ?? null)) return;
            context.dispatch({
              type: 'SET_MILESTONE_DUE_DATE',
              target: { type: 'milestone', id: milestone.id },
              payload: { dueDate },
            });
          })}
        />
      </label>
      <span class="bd-control">
        <span id="bd-unit-label">${m.unitLabel}</span>
        <span class="bd-units" role="radiogroup" aria-labelledby="bd-unit-label">
          ${BURNDOWN_UNITS.map(
            (option) =>
              html`<a
                class="bd-unit"
                role="radio"
                data-unit=${option}
                aria-checked=${String(option === unit)}
                href=${context.hashFor({ unit: option })}
                >${m.unitName(option)}</a
              >`,
          )}
        </span>
      </span>
      <span class="bd-record">
        <button
          class="dpk-btn dpk-btn--primary"
          type="button"
          data-role="record-snapshot"
          title=${m.recordSnapshotHint}
          @click=${() => recordSnapshot(context, new Date())}
        >
          ${m.recordSnapshotButton}
        </button>
      </span>
    </header>
    ${
      unit === 'points' && unestimated > 0
        ? html`<p class="bd-warning" role="note" data-testid="usm-unestimated-warning">
            ${iconWarning()}<span>${m.unestimatedNote(unestimated)}</span>
          </p>`
        : nothing
    }
    <figure class="bd-chart bd-chart--combined">
      <figcaption>
        <span class="bd-chart-title">${m.combinedChartTitle}</span>
        <span class="bd-about">
          <button class="bd-about-btn" type="button" aria-label=${m.chartAbout} aria-describedby="bd-about-tip">
            ${iconAbout()}
          </button>
          <span class="bd-about-tip" id="bd-about-tip" role="tooltip">${m.combinedChartHint(m.unitName(unit))}</span>
        </span>
        <span class="bd-chart-latest">${m.chartLatest(latest(burndown.combined))}</span>
      </figcaption>
      ${renderChart({
        chart: 'combined',
        title: m.combinedChartTitle,
        points: burndown.combined,
        due: burndown.due,
        now: now.getTime(),
        size: COMBINED_SIZE,
        tone: 'accent',
      })}
    </figure>
    ${
      burndown.byStatus.length === 0
        ? nothing
        : html`<section class="bd-multiples" aria-label=${m.statusChartsLabel}>
            <h3>${m.statusChartsLabel}</h3>
            <div class="bd-grid">
              ${burndown.byStatus.map(
                ({ status, points }) => html`<figure class="bd-chart" data-status=${status.id}>
                  <figcaption>
                    <span class="bd-chart-title">${m.statusChartTitle(status.name)}</span>
                    <span class="bd-chart-latest">${m.chartLatest(latest(points))}</span>
                  </figcaption>
                  ${renderChart({
                    chart: 'status',
                    statusId: status.id,
                    title: m.statusChartTitle(status.name),
                    points,
                    due: burndown.due,
                    now: now.getTime(),
                    size: STATUS_SIZE,
                    tone: status.tone,
                  })}
                </figure>`,
              )}
            </div>
          </section>`
    }
  `;
};

type ChartSpec = {
  readonly chart: 'combined' | 'status';
  readonly statusId?: string;
  readonly title: string;
  readonly points: readonly BurndownPoint[];
  readonly due: number | null;
  readonly now: number;
  readonly size: ChartSize;
  readonly tone: StatusTone;
};

const renderChart = (spec: ChartSpec): TemplateResult =>
  html`<dpk-internal-usm-burndown-chart
    data-chart=${spec.chart}
    data-status=${spec.statusId ?? nothing}
    .points=${spec.points}
    .due=${spec.due}
    .now=${spec.now}
    .size=${spec.size}
    .tone=${spec.tone}
    .label=${spec.title}
  ></dpk-internal-usm-burndown-chart>`;

/** The snapshots, newest first; each can be dropped again. */
const renderSnapshots = (m: UsmMessages, context: TemplateRenderContext<UsmState>): TemplateResult => {
  const snapshots = [...context.state.snapshots].reverse();
  return html`<section class="bd-panel">
    <h3>${m.snapshotsLabel}<span class="bd-count">${snapshots.length}</span></h3>
    ${
      snapshots.length === 0
        ? html`<p class="bd-empty">${m.noSnapshots} ${m.chartNeedsSnapshot}</p>`
        : html`<ol class="bd-snapshots">
            ${repeat(
              snapshots,
              (snapshot) => snapshot.id,
              (snapshot) => {
                const target = { type: 'snapshot', id: snapshot.id };
                const at = momentLabel(snapshot.at);
                const stories = snapshot.tally.reduce((sum, row) => sum + row.stories, 0);
                return html`<li data-snapshot=${snapshot.id} data-dpk-target=${targetRef(target)}>
                  <span class="bd-snapshot-at">${at}</span>
                  <span class="bd-snapshot-sum">${m.storyCount(stories)}</span>
                  <button
                    class="dpk-icon-btn"
                    type="button"
                    data-role="delete-snapshot"
                    aria-label=${m.deleteSnapshotAria(at)}
                    @click=${() => context.dispatch({ type: 'DELETE_SNAPSHOT', target, payload: {} })}
                  >
                    ${iconTrash()}
                  </button>
                </li>`;
              },
            )}
          </ol>`
    }
  </section>`;
};

/** The estimate scale: each size's name and points, in order. */
const renderEstimates = (m: UsmMessages, context: TemplateRenderContext<UsmState>): TemplateResult => {
  const { estimates } = context.state;
  return html`<section class="bd-panel" data-testid="usm-estimates">
    <h3>${m.estimatesLabel}<span class="bd-count">${estimates.length}</span></h3>
    <p class="bd-empty">${m.estimatesHint}</p>
    ${
      estimates.length === 0
        ? nothing
        : html`<ol class="bd-estimates">
            ${repeat(
              estimates,
              (estimate) => estimate.id,
              (estimate, index) => renderEstimateRow(m, context, estimate, index),
            )}
          </ol>`
    }
    <div>
      <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addEstimate(m, context)}>
        ${m.newEstimateButton}
      </button>
    </div>
  </section>`;
};

const renderEstimateRow = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  estimate: Estimate,
  index: number,
): TemplateResult => {
  const { estimates } = context.state;
  const target = { type: 'estimate', id: estimate.id };
  return html`<li data-estimate=${estimate.id} data-dpk-target=${targetRef(target)}>
    <span class="bd-estimate-name">
      <dpk-component-inline-edit
        .value=${estimate.name}
        .label=${m.estimateNameLabel}
        @dpk-commit=${onCommit((name) => context.dispatch({ type: 'SET_ESTIMATE_NAME', target, payload: { name } }))}
      ></dpk-component-inline-edit>
    </span>
    <label class="bd-estimate-points">
      <input
        class="dpk-input"
        type="number"
        min="0"
        step="any"
        inputmode="decimal"
        data-role="points"
        aria-label=${m.estimatePointsLabel}
        .value=${String(estimate.points)}
        @change=${onNumberChange(estimate.points, (points) =>
          context.dispatch({ type: 'SET_ESTIMATE_POINTS', target, payload: { points } }),
        )}
      />
      <span>pt</span>
    </label>
    ${renderRowTools(m, {
      ids: estimates.map((each) => each.id),
      row: { previousId: estimates[index - 1]?.id ?? null, nextId: estimates[index + 1]?.id ?? null },
      deleteLabel: m.deleteEstimateAria,
      reorder: (after) => context.dispatch({ type: 'REORDER_ESTIMATE', target, payload: { after } }),
      remove: () => context.dispatch({ type: 'DELETE_ESTIMATE', target, payload: {} }),
    })}
  </li>`;
};

const latest = (points: readonly BurndownPoint[]): number => points.at(-1)?.value ?? 0;

export const burndownStyles = css`
  .bd-overview {
    display: grid;
    gap: 18px;
    max-width: 1040px;
    padding: 28px 0 40px;
  }
  .bd-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 12px 16px;
  }
  .bd-control {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .bd-control > span:first-child {
    color: var(--dpk-ink-faint);
    font-size: 11px;
    font-weight: 600;
  }
  .bd-control .dpk-select {
    min-width: 160px;
  }
  .bd-control .dpk-input {
    width: 160px;
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
  }
  .bd-units {
    display: inline-flex;
    padding: 2px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }
  .bd-unit {
    padding: 4px 12px;
    border-radius: calc(var(--dpk-radius-sm) - 2px);
    color: var(--dpk-ink-soft);
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: none;
  }
  .bd-unit[aria-checked='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    box-shadow: var(--dpk-shadow-xs);
  }
  .bd-unit:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .bd-record {
    margin-left: auto;
  }
  .bd-warning {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0;
    padding: 8px 12px;
    border: 1px solid color-mix(in oklab, var(--dpk-amber) 40%, var(--dpk-rule));
    border-radius: var(--dpk-radius-sm);
    background: color-mix(in oklab, var(--dpk-amber) 10%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    font-size: 12.5px;
    line-height: 1.5;
  }
  .bd-warning svg {
    flex: none;
    width: 15px;
    height: 15px;
    margin-top: 2px;
    color: var(--dpk-amber);
  }
  .bd-empty {
    margin: 0;
    color: var(--dpk-ink-faint);
    font-size: 12px;
    line-height: 1.5;
  }
  .bd-chart {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 14px 16px 10px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
  }
  .bd-chart figcaption {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
  }
  .bd-chart-title {
    font-size: 13.5px;
    font-weight: 650;
  }
  .bd-chart-latest {
    margin-left: auto;
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .bd-about {
    position: relative;
    display: inline-flex;
    align-self: center;
  }
  .bd-about-btn {
    display: inline-grid;
    place-items: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--dpk-ink-faint);
    cursor: help;
  }
  .bd-about-btn:hover,
  .bd-about-btn:focus-visible {
    outline: none;
    color: var(--dpk-ink);
  }
  .bd-about-btn:focus-visible {
    box-shadow: var(--dpk-focus);
  }
  .bd-about-btn svg {
    width: 15px;
    height: 15px;
  }
  .bd-about-tip {
    position: absolute;
    top: calc(100% + 6px);
    left: -8px;
    z-index: 2;
    width: max-content;
    max-width: 360px;
    padding: 8px 10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-sm);
    color: var(--dpk-ink-soft);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    visibility: hidden;
    opacity: 0;
    transition: opacity 120ms var(--dpk-ease);
  }
  .bd-about:hover .bd-about-tip,
  .bd-about-btn:focus-visible + .bd-about-tip {
    visibility: visible;
    opacity: 1;
  }
  .bd-multiples {
    display: grid;
    gap: 10px;
  }
  .bd-multiples h3,
  .bd-panel h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.02em;
  }
  .bd-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .bd-side {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 12px;
    align-items: start;
  }
  .bd-panel {
    display: grid;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
  }
  .bd-count {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-weight: 500;
  }
  .bd-snapshots,
  .bd-estimates {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .bd-snapshots li,
  .bd-estimates li {
    display: grid;
    align-items: center;
    gap: 10px;
    min-height: 34px;
  }
  .bd-snapshots li {
    grid-template-columns: minmax(0, 1fr) auto 26px;
  }
  .bd-estimates li {
    grid-template-columns: minmax(0, 1fr) 96px auto;
  }
  .bd-snapshots li + li,
  .bd-estimates li + li {
    border-top: 1px solid var(--dpk-rule);
  }
  .bd-snapshot-at,
  .bd-snapshot-sum {
    font-family: var(--dpk-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .bd-snapshot-sum {
    color: var(--dpk-ink-faint);
  }
  .bd-snapshots .dpk-icon-btn {
    width: 26px;
    height: 26px;
  }
  .bd-estimate-name {
    min-width: 0;
    font-family: var(--dpk-mono);
    font-size: 13px;
    font-weight: 650;
  }
  .bd-estimate-points {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--dpk-ink-faint);
    font-size: 11px;
  }
  .bd-estimate-points .dpk-input {
    min-height: 28px;
    padding: 3px 8px;
    font-family: var(--dpk-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 640px) {
    .bd-record {
      margin-left: 0;
    }
    .bd-control .dpk-select,
    .bd-control .dpk-input {
      width: 100%;
      min-width: 0;
    }
  }
`;
