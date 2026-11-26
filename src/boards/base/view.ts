import { svg, nothing, type TemplateResult } from 'lit';

import type { LayoutPoint } from '../../lib/layout/layered';

export const pathData = (points: readonly LayoutPoint[]): string =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');

/** The corner radius every orthogonal diagram line turns with. */
export const CORNER_RADIUS = 6;

/** Path data with every corner rounded, so a bend reads as one line turning rather than two lines meeting. */
export const roundedPathData = (points: readonly LayoutPoint[], radius = CORNER_RADIUS): string => {
  const first = points[0];
  if (first === undefined) return '';
  let data = `M${first.x} ${first.y}`;
  for (let index = 1; index < points.length; index++) {
    const point = points[index]!;
    const before = points[index - 1]!;
    const after = points[index + 1];
    if (after === undefined) {
      data += ` L${point.x} ${point.y}`;
      continue;
    }
    const inLength = Math.abs(point.x - before.x) + Math.abs(point.y - before.y);
    const outLength = Math.abs(after.x - point.x) + Math.abs(after.y - point.y);
    const r = Math.min(radius, inLength / 2, outLength / 2);
    const enter = { x: point.x - Math.sign(point.x - before.x) * r, y: point.y - Math.sign(point.y - before.y) * r };
    const leave = { x: point.x + Math.sign(after.x - point.x) * r, y: point.y + Math.sign(after.y - point.y) * r };
    data += ` L${enter.x} ${enter.y} Q${point.x} ${point.y} ${leave.x} ${leave.y}`;
  }
  return data;
};

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
