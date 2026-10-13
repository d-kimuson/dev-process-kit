import { describe, expect, it } from 'vitest';

import { clipOutRects } from './clip';

describe('clipOutRects', () => {
  const box = new DOMRect(100, 50, 400, 300);

  it('keeps the whole box when nothing is cut out', () => {
    expect(clipOutRects(box, [])).toBe('none');
  });

  it('cuts each rect out of the box, in the box’s own coordinates', () => {
    expect(clipOutRects(box, [new DOMRect(420, 60, 70, 30)])).toBe(
      "path(evenodd, 'M0 0H400V300H0Z M320 10h70v30h-70Z')",
    );
  });

  it('cuts out only the part of a rect inside the box and skips one outside it', () => {
    expect(clipOutRects(box, [new DOMRect(450, 30, 100, 40), new DOMRect(0, 0, 20, 20)])).toBe(
      "path(evenodd, 'M0 0H400V300H0Z M350 0h50v20h-50Z')",
    );
  });
});
