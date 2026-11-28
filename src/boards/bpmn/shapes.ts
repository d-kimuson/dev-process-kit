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
export const TASK_WIDTH = 128;
export const TASK_PADDING_X = 12;
export const TASK_MIN_HEIGHT = 72;
export const TASK_LINE_HEIGHT = 16;
export const TASK_MAX_LINES = 4;
export const ANNOTATION_WIDTH = 140;
export const ANNOTATION_FONT = 11.5;
export const ANNOTATION_LINE_HEIGHT = 16;

/** Font sizes the estimates are made at. */
export const NODE_LABEL_FONT = 14;
export const FLOW_LABEL_FONT = 11.5;
export const NODE_LABEL_MAX_WIDTH = 112;

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

/** The label lines on a task or subprocess's own box. */
export const taskLabelLines = (name: string): readonly string[] =>
  wrapLines(name, TASK_WIDTH - TASK_PADDING_X * 2, FLOW_LABEL_FONT, TASK_MAX_LINES);

/** A task's height: room for its name, never smaller than the rounded minimum. */
export const taskHeight = (name: string): number => {
  const lines = Math.min(TASK_MAX_LINES, taskLabelLines(name).length);
  return Math.max(TASK_MIN_HEIGHT, 16 + lines * TASK_LINE_HEIGHT);
};

export const annotationLabelLines = (text: string): readonly string[] =>
  wrapLines(text, ANNOTATION_WIDTH - 16, ANNOTATION_FONT, 6);

export const annotationHeight = (text: string): number => {
  const lines = Math.max(1, annotationLabelLines(text).length);
  return Math.max(32, lines * ANNOTATION_LINE_HEIGHT + 8);
};

/** The text drawn outside an event, gateway or data object, wrapped to the width the layout reserves. */
export const externalLabel = (node: BpmnNode): BpmnNodeLabel | null => {
  if (node.kind === 'task' || node.kind === 'subprocess' || node.kind === 'annotation') return null;
  if (node.name === null || node.name === '') return null;
  const lines = wrapLines(node.name, NODE_LABEL_MAX_WIDTH, NODE_LABEL_FONT, 2);
  const width = Math.min(
    NODE_LABEL_MAX_WIDTH,
    Math.ceil(Math.max(...lines.map((line) => textWidth(line, NODE_LABEL_FONT)))),
  );
  return { lines, width, height: lines.length * 16 };
};

/** A flow label's chip width, for the column spacing and the label placer. */
export const flowLabelSize = (label: string): { readonly width: number; readonly height: number } => ({
  width: Math.min(168, Math.ceil(textWidth(label, FLOW_LABEL_FONT)) + 16),
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
