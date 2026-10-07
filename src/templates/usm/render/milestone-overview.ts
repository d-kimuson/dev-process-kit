import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { MilestoneCard } from '../milestone-overview';
import type { UsmState } from '../model';

import { onCommit } from '../../../lib/dom/events';
import { activityTones } from '../activity-tone';
import { addMilestone } from '../commands';
import { toneStyle } from './tone';

/**
 * The milestones tab: the release slices as a timeline, one node per slice on
 * a single rail, each saying when it is due, what it is for and how big it
 * is. The stories themselves stay on the map; the next slice is added at the
 * end of the rail.
 */
export const renderMilestoneOverview = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  cards: readonly MilestoneCard[],
): TemplateResult => {
  const tones = activityTones(context.state);
  return html`
    <section class="ms-overview" data-testid="usm-milestones">
      ${
        cards.length === 0
          ? html`<div class="empty">
              <h2>${m.noMilestonesTitle}</h2>
              <p>${m.noMilestonesBody}</p>
            </div>`
          : html`<p class="ms-lead">${m.milestonesLead}</p>`
      }
      <ol class="ms-timeline">
        ${repeat(
          cards,
          (card) => card.id,
          (card) => renderMilestoneEntry(m, context, tones, card),
        )}
        <li class="ms-add">
          <span class="ms-when" aria-hidden="true"></span>
          <span class="ms-rail" aria-hidden="true"><span class="ms-node ms-node--add"></span></span>
          <div class="ms-body">
            <button class="dpk-btn dpk-btn--ghost" type="button" @click=${() => addMilestone(m, context)}>
              ${m.newMilestoneButton}
            </button>
          </div>
        </li>
      </ol>
    </section>
  `;
};

const renderMilestoneEntry = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  tones: ReturnType<typeof activityTones>,
  card: MilestoneCard,
): TemplateResult => {
  const id = card.id;
  return html`
    <li class="ms-entry" data-milestone-card=${id}>
      <div class="ms-when">
        ${
          card.timeframe === ''
            ? html`<span class="ms-timeframe" data-empty="true">${m.timeframeUnset}</span>`
            : html`<span class="ms-timeframe">${card.timeframe}</span>`
        }
      </div>
      <span class="ms-rail" aria-hidden="true"><span class="ms-node">${card.ordinal}</span></span>
      <article class="ms-body">
        <h3 class="ms-name">
          <dpk-component-inline-edit
            .value=${card.name}
            .label=${m.milestoneNameLabel}
            @dpk-commit=${onCommit((name) =>
              context.dispatch({ type: 'SET_MILESTONE_NAME', target: { type: 'milestone', id }, payload: { name } }),
            )}
          ></dpk-component-inline-edit>
        </h3>
        ${
          card.description === ''
            ? html`<p class="ms-description" data-empty="true">${m.milestoneNoDescription}</p>`
            : html`<p class="ms-description">${card.description}</p>`
        }
        <dl class="ms-facts">
          <div>
            <dt>${m.storiesLabel}</dt>
            <dd>
              <strong>${card.storyCount}</strong>
              <span>${m.shareOfStories(Math.round(card.share * 100))}</span>
            </dd>
          </div>
          <div>
            <dt>${m.coverageLabel}</dt>
            <dd>
              <strong>${m.coverage(card.coverage.covered, card.coverage.total)}</strong>
              <span class="ms-meter" aria-hidden="true">
                <span
                  style=${`width:${card.coverage.total === 0 ? 0 : (card.coverage.covered / card.coverage.total) * 100}%`}
                ></span>
              </span>
            </dd>
          </div>
        </dl>
        ${card.breakdown.length === 0 ? nothing : renderBreakdown(m, tones, card)}
      </article>
    </li>
  `;
};

/** How the slice's stories spread over the activities: one bar, then a legend that names each share. */
const renderBreakdown = (
  m: UsmMessages,
  tones: ReturnType<typeof activityTones>,
  card: MilestoneCard,
): TemplateResult => html`
  <div class="ms-breakdown">
    <span class="ms-bar" aria-hidden="true">
      ${card.breakdown.map(
        (share) =>
          html`<span
            class="ms-bar-part"
            style=${`${toneStyle(tones.get(share.activityId))};flex-grow:${share.count}`}
          ></span>`,
      )}
    </span>
    <ul class="ms-legend" aria-label=${m.breakdownLabel}>
      ${card.breakdown.map(
        (share) =>
          html`<li
            data-activity=${share.activityId}
            style=${toneStyle(tones.get(share.activityId))}
            aria-label=${m.breakdownItem(share.name, share.count)}
          >
            <span class="ms-dot" aria-hidden="true"></span>
            <span class="ms-breakdown-name" aria-hidden="true">${share.name}</span>
            <span class="ms-breakdown-count" aria-hidden="true">${share.count}</span>
          </li>`,
      )}
    </ul>
  </div>
`;
