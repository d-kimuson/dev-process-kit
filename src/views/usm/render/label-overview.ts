import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { LabelOverview, LabelRow } from '../label-overview';
import type { UsmMessages } from '../messages';
import type { UsmState } from '../model';

import { targetRef } from '../../../core/target';
import { onCommit } from '../../../lib/dom/events';
import { addLabel } from '../commands';
import { renderRowTools, renderShare, renderTonePicker } from './status-overview';
import { statusToneStyle } from './tone';

/**
 * The labels tab: the labels a story may carry, in order, each with its color
 * and how many stories carry it. Names, colors and order are edited here;
 * which labels a story carries is set in its panel.
 */
export const renderLabelOverview = (
  m: UsmMessages,
  context: ViewRenderContext<UsmState>,
  overview: LabelOverview,
): TemplateResult => {
  return html`
    <section class="st-overview" data-testid="usm-labels">
      ${
        overview.rows.length === 0
          ? html`<div class="empty">
              <h2>${m.noLabelsTitle}</h2>
              <p>${m.noLabelsBody}</p>
            </div>`
          : nothing
      }
      <ol class="st-list">
        ${repeat(
          overview.rows,
          (row) => row.id,
          (row) => renderLabelRow(m, context, row),
        )}
      </ol>
      <div>
        <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addLabel(m, context)}>
          ${m.newLabelButton}
        </button>
      </div>
    </section>
  `;
};

const renderLabelRow = (m: UsmMessages, context: ViewRenderContext<UsmState>, row: LabelRow): TemplateResult => {
  const target = { type: 'label', id: row.id };
  return html`
    <li class="st-row" data-label=${row.id} data-dpk-target=${targetRef(target)} style=${statusToneStyle(row.tone)}>
      <span class="label-swatch" aria-hidden="true"></span>
      <span class="st-name">
        <dpk-inline-edit
          .value=${row.name}
          .label=${m.labelNameLabel}
          @dpk-commit=${onCommit((name) => context.dispatch({ type: 'SET_LABEL_NAME', target, payload: { name } }))}
        ></dpk-inline-edit>
      </span>
      ${renderShare(m, row.storyCount, row.share)}
      ${renderTonePicker(m, row.tone, (tone) => context.dispatch({ type: 'SET_LABEL_TONE', target, payload: { tone } }))}
      ${renderRowTools(m, {
        ids: context.state.labels.map((label) => label.id),
        row,
        deleteLabel: m.deleteLabelAria,
        reorder: (after) => context.dispatch({ type: 'REORDER_LABEL', target, payload: { after } }),
        remove: () => context.dispatch({ type: 'DELETE_LABEL', target, payload: {} }),
      })}
    </li>
  `;
};
