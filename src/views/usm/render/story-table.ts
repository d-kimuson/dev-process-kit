import { html, type TemplateResult } from 'lit';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { UsmState } from '../model';

import { presentStoryTable, STORY_TABLE_ID } from '../story-table';

/**
 * The table tab: a flat, filterable and sortable view of every story on the
 * map, alongside the 2D board — the same stories, read-only (moving, sizing
 * and other changes stay on the map and in each story's panel). Selecting a
 * row opens that story's panel, the same as clicking its card on the map.
 */
export const renderStoryTable = (m: UsmMessages, context: ViewRenderContext<UsmState>): TemplateResult => {
  const data = presentStoryTable(m, context.state);
  return html`
    <section class="story-table" data-testid="usm-table">
      <dpk-table
        id=${STORY_TABLE_ID}
        readonly
        .data=${data}
        @dpk-table-select=${(event: CustomEvent<{ readonly id: string }>) => {
          const story = context.state.stories.find((candidate) => candidate.id === event.detail.id);
          if (story) context.navigate({ step: story.stepId, story: story.id });
        }}
      ></dpk-table>
    </section>
  `;
};
