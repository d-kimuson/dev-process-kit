import { describe, expect, it } from 'vitest';

import { layeredLayout } from './layered';
import { transposeLayout } from './transpose';

describe('transposeLayout', () => {
  it('turns a left-to-right layout into a top-to-bottom one', () => {
    const across = layeredLayout(
      [
        { id: 'a', width: 30, height: 80 },
        { id: 'b', width: 30, height: 80 },
      ],
      [{ id: 'e', from: 'a', to: 'b' }],
    );
    const down = transposeLayout(across);
    const [a, b] = down.nodes;
    expect(a).toMatchObject({ width: 80, height: 30 });
    expect(b!.y).toBeGreaterThan(a!.y + a!.height);
    expect(down.width).toBe(across.height);
    const route = down.routes[0]!.points;
    expect(route[0]!.y).toBe(a!.y + a!.height);
    expect(route.at(-1)!.y).toBe(b!.y);
  });
});
