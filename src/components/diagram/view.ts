import { html, svg, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { LayoutPoint } from '../../lib/layout/layered';
import type { DiagramMessages } from './messages';
import type { DiagramIntent, SelectionRef, TagMatch } from './model';
import type { TagViewModel } from './present';

export type DiagramSend<S extends SelectionRef = SelectionRef> = (intent: DiagramIntent<S>) => void;

export const pathData = (points: readonly LayoutPoint[]): string =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');

export type ArrowDefinition = {
  readonly id: string;
  /** Omit to paint the head from the stylesheet (tokens, not literals). */
  readonly color?: string;
  /** Open (hollow) arrow heads mark asynchronous messages. */
  readonly open?: boolean;
};

export const arrowDefinitions = (definitions: readonly ArrowDefinition[]): TemplateResult => svg`
  <defs>
    ${definitions.map(
      (definition) => svg`
        <marker
          id=${definition.id}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path
            class="diagram-arrow"
            d=${definition.open === true ? 'M1 1 L9 5 L1 9' : 'M1 1 L9 5 L1 9 Z'}
            fill=${definition.open === true || definition.color === undefined ? nothing : definition.color}
            stroke=${definition.color ?? nothing}
            stroke-width="1.3"
          ></path>
        </marker>
      `,
    )}
  </defs>
`;

export const renderTagBar = <S extends SelectionRef>(
  m: DiagramMessages,
  tags: readonly TagViewModel[],
  match: TagMatch,
  send: DiagramSend<S>,
): TemplateResult => html`
  <div class="diagram-tags" role="group" aria-label=${m.tagFilter}>
    <div class="diagram-match" role="group" aria-label=${m.tagMatch}>
      ${(
        [
          ['single', 'Single'],
          ['all', 'AND'],
          ['any', 'OR'],
        ] as const
      ).map(
        ([id, label]) => html`
          <button
            type="button"
            data-match=${id}
            aria-pressed=${match === id ? 'true' : 'false'}
            @click=${() => send({ kind: 'match', match: id })}
          >
            ${label}
          </button>
        `,
      )}
    </div>
    ${repeat(
      tags,
      (tag) => tag.tag,
      (tag) => html`
        <button
          type="button"
          class="dpk-tag"
          data-tag=${tag.tag}
          aria-pressed=${tag.selected ? 'true' : 'false'}
          @click=${() => send({ kind: 'tag', tag: tag.tag })}
        >
          ${tag.tag}<span class="dpk-tag-count">${tag.count}</span>
        </button>
      `,
    )}
    ${
      tags.some((tag) => tag.selected)
        ? html`<button type="button" class="dpk-tag-clear" @click=${() => send({ kind: 'clear-tags' })}>
            ${m.clearTags}
          </button>`
        : nothing
    }
  </div>
`;

export const renderZoom = <S extends SelectionRef>(m: DiagramMessages, send?: DiagramSend<S>): TemplateResult => html`
  <div class="diagram-zoom">
    <button
      type="button"
      aria-label=${m.zoomOut}
      @click=${(event: Event) => {
        event.stopPropagation();
        send?.({ kind: 'zoom', factor: 1 / 1.1 });
      }}
    >
      −
    </button>
    <button
      type="button"
      class="diagram-zoom-value"
      title=${m.fit}
      aria-label=${m.fit}
      @click=${() => send?.({ kind: 'fit' })}
    >
      100%
    </button>
    <button
      type="button"
      aria-label=${m.zoomIn}
      @click=${(event: Event) => {
        event.stopPropagation();
        send?.({ kind: 'zoom', factor: 1.1 });
      }}
    >
      +
    </button>
  </div>
`;
