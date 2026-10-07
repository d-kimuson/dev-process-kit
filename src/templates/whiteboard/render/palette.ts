import type { WbColor } from '../model';

/**
 * The single source of the board's colors: sticky paper, its ink, and the
 * stroke shapes and frames are drawn with. Sticky paper keeps its color in the
 * dark theme (it is paper on a wall); shapes and frames mix the stroke into the
 * theme's own surface instead.
 */
const PALETTE = {
  yellow: { paper: '#fff0a3', ink: '#4a3a06', stroke: '#d9a900' },
  orange: { paper: '#ffd1a0', ink: '#4a2503', stroke: '#ec7f1d' },
  pink: { paper: '#ffc9dd', ink: '#4b1029', stroke: '#de4479' },
  purple: { paper: '#ddcbf8', ink: '#32195c', stroke: '#8a5bd6' },
  blue: { paper: '#c0ddf7', ink: '#0e2c4b', stroke: '#3a80d4' },
  green: { paper: '#cdeba5', ink: '#22380a', stroke: '#55a42c' },
  gray: { paper: '#e3e6eb', ink: '#2a2f38', stroke: '#868d99' },
} as const satisfies Record<WbColor, { readonly paper: string; readonly ink: string; readonly stroke: string }>;

/** The color travels as custom properties, so items and swatches share it. */
export const colorStyle = (color: WbColor): string => {
  const { paper, ink, stroke } = PALETTE[color];
  return `--wb-paper:${paper};--wb-ink:${ink};--wb-stroke:${stroke}`;
};
