import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { MemberOverview, MemberRow } from '../member-overview';
import type { UsmMessages } from '../messages';
import type { UsmState } from '../model';

import { targetRef } from '../../../core/target';
import { onCommit } from '../../../lib/dom/events';
import { addMember } from '../commands';
import { initialOf } from './avatar';
import { renderRowTools, renderShare, renderTonePicker } from './status-overview';
import { statusToneStyle } from './tone';

/**
 * The members, in the settings dialog: the people stories may be assigned to,
 * in order, each with their color and how many stories they are assigned.
 * Names, colors and order are edited here; who a story is assigned to is set
 * in its panel.
 */
export const renderMemberOverview = (
  m: UsmMessages,
  context: ViewRenderContext<UsmState>,
  overview: MemberOverview,
): TemplateResult => {
  return html`
    <section class="st-overview" data-testid="usm-members">
      ${
        overview.rows.length === 0
          ? html`<div class="empty">
              <h2>${m.noMembersTitle}</h2>
              <p>${m.noMembersBody}</p>
            </div>`
          : nothing
      }
      <ol class="st-list">
        ${repeat(
          overview.rows,
          (row) => row.id,
          (row) => renderMemberRow(m, context, row),
        )}
      </ol>
      <div>
        <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addMember(m, context)}>
          ${m.newMemberButton}
        </button>
      </div>
    </section>
  `;
};

const renderMemberRow = (m: UsmMessages, context: ViewRenderContext<UsmState>, row: MemberRow): TemplateResult => {
  const target = { type: 'member', id: row.id };
  return html`
    <li class="st-row" data-member=${row.id} data-dpk-target=${targetRef(target)} style=${statusToneStyle(row.tone)}>
      <span class="member-avatar" aria-hidden="true">${initialOf(row.name)}</span>
      <span class="st-name">
        <dpk-inline-edit
          .value=${row.name}
          .label=${m.memberNameLabel}
          @dpk-commit=${onCommit((name) => context.dispatch({ type: 'SET_MEMBER_NAME', target, payload: { name } }))}
        ></dpk-inline-edit>
      </span>
      ${renderShare(m, row.storyCount, row.share)}
      ${renderTonePicker(m, row.tone, (tone) => context.dispatch({ type: 'SET_MEMBER_TONE', target, payload: { tone } }))}
      ${renderRowTools(m, {
        ids: context.state.members.map((member) => member.id),
        row,
        deleteLabel: m.deleteMemberAria,
        reorder: (after) => context.dispatch({ type: 'REORDER_MEMBER', target, payload: { after } }),
        remove: () => context.dispatch({ type: 'DELETE_MEMBER', target, payload: {} }),
      })}
    </li>
  `;
};
