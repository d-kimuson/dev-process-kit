import type { DiffMessages } from './messages';

import { highlight, type TokenKind } from '../code/highlight';
import { lineIdOf, type DiffData, type DiffFile, type DiffHunk, type DiffLine, type LineId } from './model';

/** A run of a line's text: its syntax kind, and whether it is the part of the line that changed. */
export type Segment = { readonly kind: TokenKind | null; readonly text: string; readonly changed: boolean };

/** One line as the table shows it. */
export type LineCell = {
  readonly line: DiffLine;
  readonly id: LineId;
  readonly segments: readonly Segment[];
  /** A comment target sits on this cell; in the split layout a context line's left half has none. */
  readonly target: boolean;
};

export type UnifiedRow =
  | { readonly kind: 'hunk'; readonly hunk: DiffHunk }
  | { readonly kind: 'line'; readonly cell: LineCell };

export type SplitRow =
  | { readonly kind: 'hunk'; readonly hunk: DiffHunk }
  | { readonly kind: 'pair'; readonly left: LineCell | null; readonly right: LineCell | null };

/** Where an element comment points, before the component prefixes its own id. */
export type DiffTarget =
  | { readonly kind: 'file'; readonly path: string }
  | { readonly kind: 'line'; readonly path: string; readonly line: LineId };

export const targetSegments = (target: DiffTarget): readonly [string, ...string[]] =>
  target.kind === 'file' ? ['file', target.path] : ['line', target.path, target.line];

/** The highlighter's grammar for a file, from its extension. */
export const languageForPath = (path: string): string | null => {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? null : name.slice(dot + 1);
};

const WORD = /[\p{L}\p{N}_$]/u;

/** Moves a cut back to the start of the word it falls in, so a change reads as whole words. */
const snapStart = (text: string, at: number): number => {
  let index = at;
  while (index > 0 && WORD.test(text.charAt(index - 1)) && WORD.test(text.charAt(index))) index -= 1;
  return index;
};

const snapEnd = (text: string, at: number): number => {
  let index = at;
  while (index < text.length && WORD.test(text.charAt(index)) && WORD.test(text.charAt(index - 1))) index += 1;
  return index;
};

export type Range = readonly [start: number, end: number];

/**
 * The part of a deleted line and of the added line that replaced it which
 * differs: whatever lies between their common start and their common end,
 * widened to whole words. `null` when the lines share too little for the
 * mark to help — then the whole line is the change.
 */
export const changedRanges = (before: string, after: string): { before: Range; after: Range } | null => {
  if (before === after) return null;
  const limit = Math.min(before.length, after.length);
  let prefix = 0;
  while (prefix < limit && before.charAt(prefix) === after.charAt(prefix)) prefix += 1;
  let suffix = 0;
  while (
    suffix < limit - prefix &&
    before.charAt(before.length - 1 - suffix) === after.charAt(after.length - 1 - suffix)
  )
    suffix += 1;
  const kept = before.slice(0, prefix).trim().length + before.slice(before.length - suffix).trim().length;
  if (kept * 4 < Math.max(before.trim().length, after.trim().length)) return null;
  const range = (text: string): Range => {
    const start = snapStart(text, prefix);
    const end = snapEnd(text, text.length - suffix);
    return [start, Math.max(start, end)];
  };
  return { before: range(before), after: range(after) };
};

/** Splits the highlighted tokens of a line at the edges of its changed range. */
export const segmentsOf = (text: string, language: string | null, range: Range | null): readonly Segment[] => {
  const segments: Segment[] = [];
  let offset = 0;
  for (const token of highlight(text, language)) {
    const end = offset + token.text.length;
    const cuts = range === null ? [] : range.filter((cut) => cut > offset && cut < end);
    let from = offset;
    for (const cut of [...cuts, end]) {
      const piece = token.text.slice(from - offset, cut - offset);
      const changed = range !== null && from >= range[0] && cut <= range[1] && range[0] < range[1];
      if (piece !== '') segments.push({ kind: token.kind, text: piece, changed });
      from = cut;
    }
    offset = end;
  }
  return segments;
};

/**
 * The changed range of every line in a hunk that has a partner: in each run
 * of deletions followed by additions, the n-th deletion pairs with the n-th
 * addition, as git's own word diff reads a replaced block.
 */
const hunkRanges = (blocks: readonly Block[]): ReadonlyMap<DiffLine, Range> => {
  const ranges = new Map<DiffLine, Range>();
  for (const block of blocks) {
    if (block.kind === 'context') continue;
    for (const [pairIndex, del] of block.dels.entries()) {
      const add = block.adds[pairIndex];
      if (add === undefined) break;
      const changed = changedRanges(del.text, add.text);
      if (changed === null) continue;
      ranges.set(del, changed.before);
      ranges.set(add, changed.after);
    }
  }
  return ranges;
};

/** A hunk's lines as a reader takes them in: an unchanged line, or a run of deletions with the additions after it. */
type Block =
  | { readonly kind: 'context'; readonly line: DiffLine }
  | { readonly kind: 'change'; readonly dels: DiffLine[]; readonly adds: DiffLine[] };

const blocksOf = (hunk: DiffHunk): readonly Block[] => {
  const blocks: Block[] = [];
  let change: Extract<Block, { kind: 'change' }> | null = null;
  for (const line of hunk.lines) {
    if (line.kind === 'context') {
      change = null;
      blocks.push({ kind: 'context', line });
      continue;
    }
    // A deletion after additions starts the next replaced block.
    if (change === null || (line.kind === 'del' && change.adds.length > 0)) {
      change = { kind: 'change', dels: [], adds: [] };
      blocks.push(change);
    }
    (line.kind === 'del' ? change.dels : change.adds).push(line);
  }
  return blocks;
};

const cellOf = (
  line: DiffLine,
  language: string | null,
  ranges: ReadonlyMap<DiffLine, Range>,
  target = true,
): LineCell => ({
  line,
  id: lineIdOf(line),
  segments: segmentsOf(line.text, language, ranges.get(line) ?? null),
  target,
});

export const unifiedRows = (file: DiffFile): readonly UnifiedRow[] => {
  const language = languageForPath(file.path);
  return file.hunks.flatMap((hunk): UnifiedRow[] => {
    const ranges = hunkRanges(blocksOf(hunk));
    return [
      { kind: 'hunk', hunk },
      ...hunk.lines.map((line): UnifiedRow => ({ kind: 'line', cell: cellOf(line, language, ranges) })),
    ];
  });
};

/**
 * The side-by-side layout: a context line on both halves (its target on the
 * right, the new side, only), a replaced block's deletions beside its
 * additions, and a half left blank where one side has fewer lines.
 */
export const splitRows = (file: DiffFile): readonly SplitRow[] => {
  const language = languageForPath(file.path);
  return file.hunks.flatMap((hunk): SplitRow[] => {
    const blocks = blocksOf(hunk);
    const ranges = hunkRanges(blocks);
    const rows: SplitRow[] = [{ kind: 'hunk', hunk }];
    for (const block of blocks) {
      if (block.kind === 'context') {
        rows.push({
          kind: 'pair',
          left: cellOf(block.line, language, ranges, false),
          right: cellOf(block.line, language, ranges),
        });
        continue;
      }
      for (let pair = 0; pair < Math.max(block.dels.length, block.adds.length); pair += 1) {
        const del = block.dels[pair];
        const add = block.adds[pair];
        rows.push({
          kind: 'pair',
          left: del === undefined ? null : cellOf(del, language, ranges),
          right: add === undefined ? null : cellOf(add, language, ranges),
        });
      }
    }
    return rows;
  });
};

const SNIPPET = 40;

const snippet = (text: string): string => {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > SNIPPET ? `${trimmed.slice(0, SNIPPET - 1)}…` : trimmed;
};

/** How a reader names a line: its number on the new side, or the old number of a deleted line. */
export const lineName = (m: DiffMessages, id: LineId): string =>
  id.startsWith('R') ? id.slice(1) : m.deletedLine(`-${id.slice(1)}`);

export const lineLabel = (m: DiffMessages, path: string, line: DiffLine): string =>
  m.lineLabel(path, lineName(m, lineIdOf(line)), snippet(line.text));

/** Every file and every line, as targets with the label the review rail shows. */
export const diffTargets = (
  m: DiffMessages,
  data: DiffData,
): readonly { readonly target: DiffTarget; readonly label: string }[] =>
  data.files.flatMap((file) => [
    { target: { kind: 'file', path: file.path } as const, label: file.path },
    ...file.hunks.flatMap((hunk) =>
      hunk.lines.map((line) => ({
        target: { kind: 'line', path: file.path, line: lineIdOf(line) } as const,
        label: lineLabel(m, file.path, line),
      })),
    ),
  ]);

/** The whole diff's totals, for the toolbar. */
export const diffStats = (data: DiffData): { files: number; additions: number; deletions: number } => ({
  files: data.files.length,
  additions: data.files.reduce((sum, file) => sum + file.additions, 0),
  deletions: data.files.reduce((sum, file) => sum + file.deletions, 0),
});
