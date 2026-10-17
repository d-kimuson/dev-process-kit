import { css, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { CircleHelp, TriangleAlert } from 'lucide';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';

import { iconTrash, lucide } from '../../../core/icons';
import { targetRef } from '../../../core/target';
import { onCommit, onInputChange, onSelectChange } from '../../../lib/dom/events';
import { burndownMilestoneOf, burndownOf, measureOf, momentLabel, type BurndownPoint } from '../burndown';
import { type ChartSize } from '../burndown-chart';
import { addEstimate, recordSnapshot } from '../commands';
import { statusesToDone } from '../done-status';
import { USM_MEASURES, type Estimate, type Milestone, type StatusTone, type UsmMeasure, type UsmState } from '../model';
import { statusViews } from '../status-view';
import { weightChangesOf, weightDividersOf, weightsBetween } from '../weight-split';
import { onNumberChange } from './number-input';
import { renderRowTools } from './status-overview';

const iconAbout = lucide(CircleHelp);
const iconWarning = lucide(TriangleAlert);

const COMBINED_SIZE: ChartSize = { width: 720, height: 240, inset: { top: 16, right: 20, bottom: 26, left: 40 } };
const STATUS_SIZE: ChartSize = { width: 340, height: 150, inset: { top: 12, right: 14, bottom: 24, left: 32 } };

/**
 * The burndown tab: how the work left is measured and what that measure
 * takes, then for one milestone the work left over time — in total, then
 * once per status — drawn from the snapshots and the map as it stands now.
 * The snapshots themselves are kept here too.
 */
export const renderBurndown = (m: UsmMessages, context: TemplateRenderContext<UsmState>, now: Date): TemplateResult => {
  const { state, navigation } = context;
  const milestone = burndownMilestoneOf(state, navigation);
  const measure = measureOf(state);
  return html`
    <section class="bd-overview" data-testid="usm-burndown">
      <header class="bd-bar">
        ${milestone ? renderMilestoneControls(m, context, milestone) : nothing} ${renderMeasures(m, context, measure)}
        ${
          milestone
            ? html`<span class="bd-record">
                <button
                  class="dpk-btn dpk-btn--primary"
                  type="button"
                  data-role="record-snapshot"
                  title=${m.recordSnapshotHint}
                  @click=${() => recordSnapshot(context, new Date())}
                >
                  ${m.recordSnapshotButton}
                </button>
              </span>`
            : nothing
        }
      </header>
      ${measure === 'stories' ? nothing : renderMeasureSettings(m, context, measure)}
      ${
        milestone
          ? renderCharts(m, context, milestone, measure, now)
          : html`<div class="empty">
              <h2>${m.burndownTab}</h2>
              <p>${m.noMilestonesForBurndown}</p>
            </div>`
      }
      <div class="bd-side">${renderSnapshots(m, context)}</div>
    </section>
  `;
};

const renderMilestoneControls = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  milestone: Milestone,
): TemplateResult => {
  const { state } = context;
  return html`<label class="bd-control">
      <span>${m.burndownMilestoneLabel}</span>
      <select
        class="dpk-select"
        data-role="milestone"
        @change=${onSelectChange((milestoneId) => context.navigate({ milestone: milestoneId }))}
      >
        ${state.milestones.map(
          (option) => html`<option value=${option.id} ?selected=${option.id === milestone.id}>${option.name}</option>`,
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
    </label>`;
};

/** The measures to pick from, one of them picked; picking another is a change to the map. */
const renderMeasures = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  measure: UsmMeasure,
): TemplateResult => html`<span class="bd-control">
  <span id="bd-measure-label">${m.measureLabel}</span>
  <span class="bd-measures" role="radiogroup" aria-labelledby="bd-measure-label">
    ${USM_MEASURES.map(
      (option) =>
        html`<label class="bd-measure"
          ><input
            type="radio"
            name="bd-measure"
            value=${option}
            .checked=${option === measure}
            @change=${() =>
              context.dispatch({
                type: 'SET_MEASURE',
                target: { type: 'page', id: 'usm' },
                payload: { measure: option },
              })}
          />${m.measureName(option)}</label
        >`,
    )}
  </span>
</span>`;

/**
 * What the measure takes, folded away under a line that sums it up: the
 * estimate scale for points, and the status weights besides once those
 * points are weighted. It opens when a measure that takes settings is
 * picked, and stays as the reader leaves it while the measure moves between
 * those. Measuring by stories takes none, so it is not shown.
 */
const renderMeasureSettings = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  measure: Exclude<UsmMeasure, 'stories'>,
): TemplateResult => {
  const { state } = context;
  const statuses = statusesToDone(state);
  const dividers = weightDividersOf(statuses);
  const scale = state.estimates.map((estimate) => `${estimate.name} ${estimate.points}`).join(' · ');
  const weights = weightsBetween(dividers)
    .map((weight, index) => `${statuses[index]?.name ?? ''} ${Math.round(weight * 10) / 10}`)
    .join(' · ');
  return html`<details class="bd-settings" data-testid="usm-measure-settings" open>
    <summary class="bd-settings-summary">
      <span class="bd-settings-chevron" aria-hidden="true"></span>
      <span class="bd-settings-title">${m.measureSettingsLabel}</span>
      <span class="bd-settings-gist">
        <span>${m.estimatesLabel}: ${scale === '' ? '—' : `${scale} pt`}</span>
        ${measure === 'weighted' ? html`<span>${m.statusWeightLabel}: ${dividers.length === 0 ? '—' : weights}</span>` : nothing}
      </span>
    </summary>
    <div class="bd-settings-body">
      ${renderEstimates(m, context)} ${measure === 'weighted' ? renderWeights(m, context) : nothing}
    </div>
  </details>`;
};

const renderCharts = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  milestone: Milestone,
  measure: UsmMeasure,
  now: Date,
): TemplateResult => {
  const { state } = context;
  const burndown = burndownOf(state, milestone.id, now.getTime());
  const weighted = measure === 'weighted';
  const unestimated = state.stories.filter(
    (story) => story.milestoneId === milestone.id && story.estimateId === undefined,
  ).length;
  return html`
    ${
      measure !== 'stories' && unestimated > 0
        ? html`<p class="bd-warning" role="note" data-testid="usm-unestimated-warning">
            ${iconWarning()}<span>${m.unestimatedNote(unestimated)}</span>
          </p>`
        : nothing
    }
    <figure class="bd-chart bd-chart--combined">
      <figcaption>
        <span class="bd-chart-title">${m.combinedChartTitle(weighted)}</span>
        <span class="bd-about">
          <button class="bd-about-btn" type="button" aria-label=${m.chartAbout} aria-describedby="bd-about-tip">
            ${iconAbout()}
          </button>
          <span class="bd-about-tip" id="bd-about-tip" role="tooltip">${m.combinedChartHint(measure)}</span>
        </span>
        <span class="bd-chart-latest">${m.chartLatest(latest(burndown.combined))}</span>
      </figcaption>
      ${renderChart({
        chart: 'combined',
        title: m.combinedChartTitle(weighted),
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

/**
 * A bar of how a story's work is shared out between the statuses before the
 * done one. While fewer than two of them share it there is no line to move,
 * so a note on what it takes shows instead.
 */
const renderWeights = (m: UsmMessages, context: TemplateRenderContext<UsmState>): TemplateResult => {
  const { state } = context;
  const statuses = statusesToDone(state);
  const dividers = weightDividersOf(statuses);
  return html`<section class="bd-panel" data-testid="usm-weights">
    <h3>${m.statusWeightLabel}</h3>
    <p class="bd-empty">${m.statusWeightHint}</p>
    ${
      dividers.length > 0
        ? html`<dpk-internal-usm-weight-bar
            .statuses=${statusViews(state).slice(0, statuses.length)}
            .dividers=${dividers}
            .commit=${(dividers: readonly number[]) => {
              for (const { statusId, weight } of weightChangesOf(statuses, dividers))
                context.dispatch({
                  type: 'SET_STATUS_WEIGHT',
                  target: { type: 'status', id: statusId },
                  payload: { weight },
                });
            }}
          ></dpk-internal-usm-weight-bar>`
        : html`<p class="bd-empty">${m.weightsNeedStatuses}</p>`
    }
  </section>`;
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
  /* One row at any width: on a narrow screen each option wraps its own name instead of the row wrapping. */
  .bd-measures {
    display: inline-flex;
    max-width: 100%;
    padding: 2px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }
  .bd-measure {
    position: relative;
    display: grid;
    flex: 1 1 auto;
    place-items: center;
    min-width: 0;
    padding: 4px 12px;
    text-align: center;
    border-radius: calc(var(--dpk-radius-sm) - 2px);
    color: var(--dpk-ink-soft);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
  }
  /* The radio stays in the page for the keyboard and the reader; the label is what shows. */
  .bd-measure input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  .bd-measure:has(input:checked) {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    box-shadow: var(--dpk-shadow-xs);
  }
  .bd-measure:has(input:focus-visible) {
    box-shadow: var(--dpk-focus);
  }
  .bd-settings {
    display: grid;
    gap: 10px;
  }
  .bd-settings-summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    justify-self: start;
    padding: 4px 10px 4px 6px;
    border-radius: var(--dpk-radius-sm);
    color: var(--dpk-ink-soft);
    font-size: 12px;
    list-style: none;
    cursor: pointer;
    user-select: none;
  }
  .bd-settings-summary::-webkit-details-marker {
    display: none;
  }
  .bd-settings-summary:hover {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
  }
  .bd-settings-summary:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .bd-settings-chevron {
    width: 6px;
    height: 6px;
    margin: 0 3px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 160ms var(--dpk-ease);
  }
  .bd-settings[open] .bd-settings-chevron {
    transform: rotate(45deg);
  }
  .bd-settings-title {
    font-weight: 650;
  }
  .bd-settings-gist {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 2px 14px;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
  }
  /* Side by side while both fit; the scale alone takes the row. */
  .bd-settings-body {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(max(300px, calc((100% - 12px) / 2)), 1fr));
    gap: 12px;
    align-items: start;
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
  @media (prefers-reduced-motion: reduce) {
    .bd-settings-chevron {
      transition: none;
    }
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
