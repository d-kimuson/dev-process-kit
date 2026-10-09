import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { StatusOverview, StatusRow } from '../status-overview';

import { iconTrash } from '../../../core/icons';
import { onCommit } from '../../../lib/dom/events';
import { addStatus } from '../commands';
import { STATUS_ICONS, STATUS_TONES, type UsmState } from '../model';
import { statusIcon, statusToneStyle } from './tone';

/**
 * The statuses tab: the statuses a story can stand in, in order, each with its
 * color and how many stories stand there. Names, colors and order are edited
 * here; which status a story has is set on its card.
 */
/** The one icon menu the tab may have open, and how to open or close it. */
export type IconMenu = {
  readonly openFor: string | null;
  readonly toggle: (statusId: string) => void;
  readonly close: () => void;
};

export const renderStatusOverview = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  overview: StatusOverview,
  iconMenu: IconMenu,
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
          (row) => renderStatusRow(m, context, row, iconMenu),
        )}
      </ol>
      <div>
        <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addStatus(m, context)}>
          ${m.newStatusButton}
        </button>
      </div>
    </section>
  `;
};

const renderStatusRow = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  row: StatusRow,
  iconMenu: IconMenu,
): TemplateResult => {
  const open = iconMenu.openFor === row.id;
  const target = { type: 'status', id: row.id };
  const reorder = (after: string | null): void => {
    context.dispatch({ type: 'REORDER_STATUS', target, payload: { after } });
  };
  return html`
    <li class="st-row" data-status=${row.id} style=${statusToneStyle(row.tone)}>
      <button
        class="st-icon-trigger"
        type="button"
        data-icon-trigger=${row.id}
        aria-haspopup="menu"
        aria-expanded=${String(open)}
        aria-label=${`${m.statusIconLabel}: ${m.iconName(row.icon)}`}
        title=${m.iconName(row.icon)}
        @click=${() => iconMenu.toggle(row.id)}
      >
        ${statusIcon(row)}
      </button>
      ${open ? renderIconMenu(m, context, row, iconMenu) : nothing}
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

/** Every icon a status can take, drawn in its own color; picking one sets it and closes the menu. */
const renderIconMenu = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  row: StatusRow,
  iconMenu: IconMenu,
): TemplateResult => html`<div
  id="icon-menu"
  class="comment-pop icon-menu"
  popover="manual"
  role="menu"
  aria-label=${m.statusIconLabel}
  style=${statusToneStyle(row.tone)}
  @keydown=${(event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    iconMenu.close();
  }}
>
  ${STATUS_ICONS.map(
    (icon) => html`<button
      class="icon-option"
      type="button"
      role="menuitemradio"
      data-icon=${icon}
      title=${m.iconName(icon)}
      aria-label=${m.iconName(icon)}
      aria-checked=${String(icon === row.icon)}
      @click=${() => {
        if (icon !== row.icon) {
          context.dispatch({ type: 'SET_STATUS_ICON', target: { type: 'status', id: row.id }, payload: { icon } });
        }
        iconMenu.close();
      }}
    >
      ${statusIcon({ icon, progress: row.progress })}
    </button>`,
  )}
</div>`;

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
