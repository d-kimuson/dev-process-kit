import type { BpmnNode } from './model';

/** A node's text placed outside it: its lines, and the box the layout reserves. */
export type BpmnNodeLabel = {
  readonly lines: readonly string[];
  readonly width: number;
  readonly height: number;
};

/**
 * Geometry and text measurement shared by the BPMN model, layout and router.
 *
 * The text estimator is the state diagram's (its router cannot be imported:
 * a board's pure modules may not depend on another board). It is only an
 * estimate: the chip that is drawn is measured by the browser, and the router
 * keeps a margin for the difference.
 */

export const EVENT_SIZE = 36;
export const GATEWAY_SIZE = 50;
export const DATA_OBJECT_SIZE = { width: 36, height: 46 } as const;
export const TASK_WIDTH = 144;
export const TASK_PADDING_X = 8;
export const TASK_MIN_HEIGHT = 72;
export const TASK_LINE_HEIGHT = 18;
export const TASK_MAX_LINES = 4;
export const ANNOTATION_WIDTH = 120;
export const ANNOTATION_FONT = 12;
export const ANNOTATION_LINE_HEIGHT = 16;
/** The note text's horizontal padding (bracket side and far side), plus a pixel of slack. */
export const ANNOTATION_INSET = 32;

/** Font sizes the estimates are made at. */
export const NODE_LABEL_FONT = 12;
export const NODE_LABEL_LINE_HEIGHT = 15;
export const TASK_FONT = 13;
export const FLOW_LABEL_FONT = 12;
export const NODE_LABEL_MAX_WIDTH = 74;

const charWidth = (char: string, font: number): number => {
  const code = char.codePointAt(0) ?? 0;
  if (code >= 0x2e80) return font;
  if (char === ' ') return font * 0.32;
  if (/[A-Z]/.test(char)) return font * 0.68;
  if (/[a-z0-9]/.test(char)) return font * 0.58;
  return font * 0.5;
};

export const textWidth = (text: string, font = FLOW_LABEL_FONT): number => {
  let width = 0;
  for (const char of text) width += charWidth(char, font);
  return width;
};

const wide = /[\u2e80-\uffff]/u;
/** Punctuation that Japanese line breaking never puts at the start of a line. */
const closing = /[、。，．）」』】！？ー]/u;

const breakToken = (token: string, maxWidth: number, font: number): string[] => {
  const pieces: string[] = [];
  let line = '';
  for (const char of token) {
    if (line !== '' && textWidth(line + char, font) > maxWidth) {
      pieces.push(line);
      line = char;
    } else line += char;
  }
  if (line !== '') pieces.push(line);
  return pieces;
};

/**
 * Greedy wrapping that breaks between words when it can and inside a word only
 * when that word alone is wider than the line (CJK text has no spaces, so its
 * words are single characters and every break is a valid one).
 */
export const wrapLines = (text: string, maxWidth: number, font = FLOW_LABEL_FONT, maxLines = Infinity): string[] => {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word !== '');
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line === '' ? word : `${line} ${word}`;
    if (textWidth(candidate, font) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (wide.test(word)) {
      // CJK text may break between any two characters, so the word first fills the rest of this line.
      const chars = Array.from(word);
      const lead = line === '' ? '' : `${line} `;
      let taken = 0;
      while (taken < chars.length && textWidth(lead + chars.slice(0, taken + 1).join(''), font) <= maxWidth) taken += 1;
      while (taken > 1 && taken < chars.length && closing.test(chars[taken] ?? '')) taken -= 1;
      if (taken > 0) line = lead + chars.slice(0, taken).join('');
      if (line !== '') lines.push(line);
      const pieces = breakToken(chars.slice(taken).join(''), maxWidth, font);
      line = pieces.pop() ?? '';
      lines.push(...pieces);
      continue;
    }
    if (line !== '') lines.push(line);
    const pieces = breakToken(word, maxWidth, font);
    line = pieces.pop() ?? '';
    lines.push(...pieces);
  }
  if (line !== '') lines.push(line);
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  const last = clipped[maxLines - 1] ?? '';
  clipped[maxLines - 1] = `${last}…`;
  return clipped;
};

/**
 * Wrapping into as few lines as `wrapLines`, but as even as they can be: a
 * two-line label splits near its middle rather than leaving one character on
 * its second line.
 */
export const balancedLines = (
  text: string,
  maxWidth: number,
  font = FLOW_LABEL_FONT,
  maxLines = Infinity,
): string[] => {
  let best = wrapLines(text, maxWidth, font, maxLines);
  if (best.length < 2) return best;
  for (let width = Math.floor(maxWidth) - 1; width > maxWidth / 2; width -= 1) {
    const lines = wrapLines(text, width, font, maxLines);
    if (lines.length === best.length && !lines.some((line) => line.endsWith('…'))) best = lines;
  }
  return best;
};

/** Space a task type icon keeps clear of the name text at the card's left. */
export const TASK_ICON_GUTTER = 22;

/** The label lines on a task or subprocess's own box. */
export const taskLabelLines = (name: string, task = 'none'): readonly string[] =>
  wrapLines(
    name,
    TASK_WIDTH - TASK_PADDING_X * 2 - (task === 'none' ? 0 : TASK_ICON_GUTTER),
    TASK_FONT,
    TASK_MAX_LINES,
  );

/** A task's height: room for its name, never smaller than the rounded minimum. */
export const taskHeight = (name: string, task = 'none'): number => {
  const lines = Math.min(TASK_MAX_LINES, taskLabelLines(name, task).length);
  return Math.max(TASK_MIN_HEIGHT, 20 + lines * TASK_LINE_HEIGHT);
};

export const annotationLabelLines = (text: string): readonly string[] =>
  balancedLines(text, ANNOTATION_WIDTH - ANNOTATION_INSET, ANNOTATION_FONT, 6);

export const annotationHeight = (text: string): number => {
  const lines = Math.max(1, annotationLabelLines(text).length);
  return Math.max(32, lines * ANNOTATION_LINE_HEIGHT + 8);
};

/** The text drawn outside an event, gateway or data object, wrapped to the width the layout reserves. */
export const externalLabel = (node: BpmnNode): BpmnNodeLabel | null => {
  if (node.kind === 'task' || node.kind === 'subprocess' || node.kind === 'annotation') return null;
  if (node.name === null || node.name === '') return null;
  const lines = balancedLines(node.name, NODE_LABEL_MAX_WIDTH, NODE_LABEL_FONT, 2);
  // A pixel of slack: the measured advance and the browser's own subpixel
  // layout can differ by a fraction, and `text-overflow: ellipsis` would turn
  // "在庫あり?" into "在庫あ…" at the rounded width.
  const width = Math.min(
    NODE_LABEL_MAX_WIDTH,
    Math.ceil(Math.max(...lines.map((line) => textWidth(line, NODE_LABEL_FONT)))) + 2,
  );
  return { lines, width, height: lines.length * NODE_LABEL_LINE_HEIGHT };
};

/** A flow label's chip width, for the column spacing and the label placer. */
export const flowLabelSize = (label: string): { readonly width: number; readonly height: number } => ({
  width: Math.min(196, Math.ceil(textWidth(label, FLOW_LABEL_FONT)) + 16),
  height: 22,
});

/** The outline a node's ports and end points are projected onto. */
export type BpmnShape = 'circle' | 'diamond' | 'roundRect' | 'document' | 'bracket';

export const nodeShape = (node: BpmnNode): BpmnShape => {
  if (node.kind === 'event') return 'circle';
  if (node.kind === 'gateway') return 'diamond';
  if (node.kind === 'dataObject') return 'document';
  if (node.kind === 'annotation') return 'bracket';
  return 'roundRect';
};

export type OutlineBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/** Distance a rounded box's port stays from a corner. */
const ROUND_INSET = 10;
/** Width of the fold on a document's right edge, where no port may sit. */
const DOCUMENT_FOLD = 10;

/**
 * A point on a node's outline, on `side` and `along` from the side's middle.
 * `along` is measured on the side's own axis (vertical for left/right), and is
 * clamped where the outline cannot hold it, so every returned point lies on
 * the outline.
 */
export const outlinePoint = (
  shape: BpmnShape,
  box: OutlineBox,
  side: 'left' | 'right' | 'top' | 'bottom',
  along: number,
): { x: number; y: number } => {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  if (shape === 'circle') {
    const rx = box.width / 2;
    const ry = box.height / 2;
    if (side === 'left' || side === 'right') {
      const offset = clamp(along, -ry + 0.5, ry - 0.5);
      const reach = rx * Math.sqrt(Math.max(0, 1 - (offset / ry) ** 2));
      return { x: side === 'left' ? cx - reach : cx + reach, y: cy + offset };
    }
    const offset = clamp(along, -rx + 0.5, rx - 0.5);
    const reach = ry * Math.sqrt(Math.max(0, 1 - (offset / rx) ** 2));
    return { x: cx + offset, y: side === 'top' ? cy - reach : cy + reach };
  }
  if (shape === 'diamond') {
    const halfW = box.width / 2;
    const halfH = box.height / 2;
    if (side === 'left' || side === 'right') {
      const offset = clamp(along, -halfH, halfH);
      const reach = halfW * (1 - Math.abs(offset) / halfH);
      return { x: side === 'left' ? cx - reach : cx + reach, y: cy + offset };
    }
    const offset = clamp(along, -halfW, halfW);
    const reach = halfH * (1 - Math.abs(offset) / halfW);
    return { x: cx + offset, y: side === 'top' ? cy - reach : cy + reach };
  }
  if (shape === 'bracket') {
    const offset = clamp(along, -box.height / 2 + ROUND_INSET, box.height / 2 - ROUND_INSET);
    return { x: box.x, y: cy + offset };
  }
  if (side === 'left' || side === 'right') {
    const high = shape === 'document' && side === 'right' ? box.height - DOCUMENT_FOLD : box.height - ROUND_INSET;
    const offset = clamp(along, -box.height / 2 + ROUND_INSET, -box.height / 2 + high);
    return { x: side === 'left' ? box.x : box.x + box.width, y: cy + offset };
  }
  const offset = clamp(along, -box.width / 2 + ROUND_INSET, box.width / 2 - ROUND_INSET);
  return { x: cx + offset, y: side === 'top' ? box.y : box.y + box.height };
};
