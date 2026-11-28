import type { LayoutPoint } from '../../lib/layout/layered';

export const pathData = (points: readonly LayoutPoint[]): string =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');

/** The corner radius every orthogonal diagram line turns with. */
export const CORNER_RADIUS = 6;
