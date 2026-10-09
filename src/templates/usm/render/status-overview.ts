import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { StatusOverview, StatusRow } from '../status-overview';

import { iconTrash } from '../../../core/icons';
import { onCommit } from '../../../lib/dom/events';
import { addStatus } from '../commands';
import { STATUS_TONES, type UsmState } from '../model';
import { statusIcon, statusToneStyle } from './tone';

/**
 * The statuses tab: the statuses a story can stand in, in order, each with its
 * color and how many stories stand there. Names, colors and order are edited
 * here; which status a story has is set on its card.
 */
export const renderStatusOverview = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  overview: StatusOverview,
): TemplateResult => {
  return html`
    <section class="st-overview" data-testid="usm-statuses">
      ${
        overview.rows.length === 0
          ? html`<div class="empty">
              <h2>${m.noStatusesTitle}</h2>
              <p>${m.noStatusesBody}</p>
            </div>`
          : nothing
      }
      <ol class="st-list">
        ${repeat(
          overview.rows,
          (row) => row.id,
          (row) => renderStatusRow(m, context, row),
        )}
        <li class="st-row st-row--unset" style=${statusToneStyle(undefined)}>
          ${statusIcon(undefined)}
          <span class="st-name">${m.statusUnset}</span>
          ${renderShare(m, overview.unsetCount, overview.unsetShare)}
        </li>
      </ol>
      <div>
        <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addStatus(m, context)}>
          ${m.newStatusButton}
        </button>
      </div>
    </section>
  `;
};

const renderStatusRow = (m: UsmMessages, context: TemplateRenderContext<UsmState>, row: StatusRow): TemplateResult => {
  const target = { type: 'status', id: row.id };
  const reorder = (after: string | null): void => {
    context.dispatch({ type: 'REORDER_STATUS', target, payload: { after } });
  };
  return html`
    <li class="st-row" data-status=${row.id} style=${statusToneStyle(row.tone)}>
      ${statusIcon(row.progress)}
      <span class="st-name">
        <dpk-component-inline-edit
          .value=${row.name}
          .label=${m.statusNameLabel}
          @dpk-commit=${onCommit((name) => context.dispatch({ type: 'SET_STATUS_NAME', target, payload: { name } }))}
        ></dpk-component-inline-edit>
      </span>
      ${renderShare(m, row.storyCount, row.share)}
      <span class="st-tones" role="radiogroup" aria-label=${m.statusToneLabel}>
        ${STATUS_TONES.map(
          (tone) => html`<button
            class="st-tone"
            type="button"
            role="radio"
            data-tone=${tone}
            style=${statusToneStyle(tone)}
            title=${m.toneName(tone)}
            aria-label=${m.toneName(tone)}
            aria-checked=${tone === row.tone ? 'true' : 'false'}
            @click=${() => {
              if (tone !== row.tone) context.dispatch({ type: 'SET_STATUS_TONE', target, payload: { tone } });
            }}
          ></button>`,
        )}
      </span>
      <span class="st-tools">
        <button
          class="dpk-icon-btn"
          type="button"
          aria-label=${m.moveUpAria}
          ?disabled=${row.previousId === null}
          @click=${() => reorder(beforePrevious(context.state, row))}
        >
          ↑
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          aria-label=${m.moveDownAria}
          ?disabled=${row.nextId === null}
          @click=${() => reorder(row.nextId)}
        >
          ↓
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="delete"
          aria-label=${m.deleteStatusAria}
          @click=${() => context.dispatch({ type: 'DELETE_STATUS', target, payload: {} })}
        >
          ${iconTrash()}
        </button>
      </span>
    </li>
  `;
};

/** Moving up places the status right after the one two places above (or first). */
const beforePrevious = (state: UsmState, row: StatusRow): string | null => {
  const index = state.statuses.findIndex((status) => status.id === row.previousId);
  return index <= 0 ? null : (state.statuses[index - 1]?.id ?? null);
};

const renderShare = (m: UsmMessages, count: number, share: number): TemplateResult => html`
  <span class="st-share">
    <span class="st-share-text">${m.statusShare(count, Math.round(share * 100))}</span>
    <span class="st-meter" aria-hidden="true"><span style=${`width:${share * 100}%`}></span></span>
  </span>
`;
