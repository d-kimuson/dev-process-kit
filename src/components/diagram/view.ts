import { svg, nothing, type TemplateResult } from 'lit';

import type { LayoutPoint } from '../../lib/layout/layered';

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
