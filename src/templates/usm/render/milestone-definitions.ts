import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { UsmMessages } from '../messages';
import type { MilestoneDefinitions } from '../milestone-definitions';

/** The legend under the map: one row per milestone, only the columns somebody filled. */
export const renderMilestoneDefinitions = (
  m: UsmMessages,
  definitions: MilestoneDefinitions | null,
): TemplateResult | typeof nothing => {
  if (definitions === null) return nothing;
  const { columns, rows } = definitions;
  return html`
    <section class="milestone-defs" data-testid="usm-milestone-definitions">
      <h2 class="dpk-label">${m.milestoneDefinitionsTitle}</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">${m.milestoneGroup}</th>
            ${columns.timeframe ? html`<th scope="col">${m.timeframeColumn}</th>` : nothing}
            ${columns.description ? html`<th scope="col">${m.descriptionColumn}</th>` : nothing}
          </tr>
        </thead>
        <tbody>
          ${repeat(
            rows,
            (row) => row.id,
            (row) => html`
              <tr>
                <th scope="row">${row.name}</th>
                ${columns.timeframe ? html`<td class="timeframe">${row.timeframe}</td>` : nothing}
                ${columns.description ? html`<td class="description">${row.description}</td>` : nothing}
              </tr>
            `,
          )}
        </tbody>
      </table>
    </section>
  `;
};
