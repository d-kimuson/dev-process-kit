import { describe, expect, it } from 'vitest';

import { gridPositions } from './grid';

describe('gridPositions', () => {
  it('centres each item in a cell as wide as its column and as tall as its row', () => {
    const positions = gridPositions(
      [
        { id: 'a', width: 100, height: 40, col: 0, row: 0 },
        { id: 'b', width: 60, height: 40, col: 0, row: 1 },
        { id: 'c', width: 80, height: 60, col: 1, row: 1 },
      ],
      { columnGap: 50, rowGap: 30 },
    );
    expect(positions.get('a')).toEqual({ x: 0, y: 0 });
    expect(positions.get('b')).toEqual({ x: 20, y: 80 });
    expect(positions.get('c')).toEqual({ x: 150, y: 70 });
  });

  it('closes an empty column between two used ones', () => {
    const positions = gridPositions(
      [
        { id: 'a', width: 40, height: 40, col: 0, row: 0 },
        { id: 'b', width: 40, height: 40, col: 4, row: 0 },
      ],
      { columnGap: 10, rowGap: 10 },
    );
    expect(positions.get('b')).toEqual({ x: 50, y: 0 });
  });
});
