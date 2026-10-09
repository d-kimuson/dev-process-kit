/** The link label's type (9px mono, spaced): about how far one character reaches. */
const NARROW_W = 6;
const WIDE_W = 10;
const ELLIPSIS = '…';

/** CJK, kana, Hangul, full-width forms and emoji take about a square; the rest is mono. */
const WIDE_RANGES: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f],
  [0x2e80, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1faff],
  [0x20000, 0x3fffd],
];
const widthOf = (char: string): number => {
  const code = char.codePointAt(0) ?? 0;
  return WIDE_RANGES.some(([low, high]) => code >= low && code <= high) ? WIDE_W : NARROW_W;
};

/**
 * SVG text cannot ellipsize: a link's label is cut to the room its route
 * leaves (in px), so it never runs over the notes beside it. Its title keeps it whole.
 */
export const clipLabel = (label: string, room: number): string => {
  const chars = Array.from(label);
  if (chars.reduce((sum, char) => sum + widthOf(char), 0) <= room) return label;
  let used = widthOf(ELLIPSIS);
  let kept = '';
  for (const char of chars) {
    used += widthOf(char);
    if (used > room) break;
    kept += char;
  }
  return `${kept}${ELLIPSIS}`;
};
