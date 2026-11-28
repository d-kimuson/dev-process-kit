import type { LayoutPoint } from './layered';

export type GridItem = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly col: number;
  readonly row: number;
};

export type GridOptions = { readonly columnGap: number; readonly rowGap: number };

/**
 * Each item's top-left corner when it is centred in its cell. A column is as
 * wide as its widest item and a row as tall as its tallest, so the cells of
 * one column line up and the gaps between them stay equal. An empty column or
 * row in the middle keeps no width of its own.
 */
export const gridPositions = (items: readonly GridItem[], options: GridOptions): ReadonlyMap<string, LayoutPoint> => {
  const widths = new Map<number, number>();
  const heights = new Map<number, number>();
  for (const item of items) {
    widths.set(item.col, Math.max(widths.get(item.col) ?? 0, item.width));
    heights.set(item.row, Math.max(heights.get(item.row) ?? 0, item.height));
  }
  const starts = (sizes: ReadonlyMap<number, number>, gap: number): ReadonlyMap<number, number> => {
    const result = new Map<number, number>();
    let at = 0;
    for (const index of [...sizes.keys()].sort((a, b) => a - b)) {
      result.set(index, at);
      at += (sizes.get(index) ?? 0) + gap;
    }
    return result;
  };
  const columnStarts = starts(widths, options.columnGap);
  const rowStarts = starts(heights, options.rowGap);
  return new Map(
    items.map((item) => [
      item.id,
      {
        x: (columnStarts.get(item.col) ?? 0) + ((widths.get(item.col) ?? 0) - item.width) / 2,
        y: (rowStarts.get(item.row) ?? 0) + ((heights.get(item.row) ?? 0) - item.height) / 2,
      },
    ]),
  );
};
