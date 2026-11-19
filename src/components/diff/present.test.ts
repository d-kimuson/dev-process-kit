import { describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';

import { diffMessages } from './messages';
import { parseUnifiedDiff } from './model';
import { changedRanges, diffStats, diffTargets, languageForPath, segmentsOf, splitRows, unifiedRows } from './present';
import { replaySuggestions, SUGGEST_CHANGE } from './suggestions';

const m = diffMessages('en');

const DATA = parseUnifiedDiff(`--- a/src/total.ts
+++ b/src/total.ts
@@ -1,4 +1,4 @@
 import { sum } from './sum';
-export const total = (xs) => sum(xs);
-export const unused = 1;
+export const total = (xs: number[]) => sum(xs);
 // end
+// more`);

const FILE = DATA.files[0];
if (FILE === undefined) throw new Error('no file');

describe('languageForPath', () => {
  it('names the grammar by the extension, none for a dotfile or a bare name', () => {
    expect(languageForPath('src/a.test.ts')).toBe('ts');
    expect(languageForPath('.gitignore')).toBeNull();
    expect(languageForPath('Makefile')).toBeNull();
  });
});

describe('changedRanges', () => {
  it('marks the differing words between the common start and end', () => {
    const ranges = changedRanges('const total = 1;', 'const amount = 1;');
    expect(ranges).toEqual({ before: [6, 11], after: [6, 12] });
  });

  it('marks nothing when the lines share too little', () => {
    expect(changedRanges('alpha', 'omega beta gamma')).toBeNull();
    expect(changedRanges('same', 'same')).toBeNull();
  });
});

describe('segmentsOf', () => {
  it('joins back into the line and flags only the changed range', () => {
    const segments = segmentsOf('const amount = 1;', 'ts', [6, 12]);
    expect(segments.map((segment) => segment.text).join('')).toBe('const amount = 1;');
    expect(
      segments
        .filter((segment) => segment.changed)
        .map((segment) => segment.text)
        .join(''),
    ).toBe('amount');
    expect(segments.find((segment) => segment.text === 'const')?.kind).toBe('keyword');
  });
});

describe('unifiedRows', () => {
  it('puts a hunk header before its lines, pairing a replaced line with its replacement', () => {
    const rows = unifiedRows(FILE);
    expect(rows.map((row) => (row.kind === 'hunk' ? 'hunk' : row.cell.id))).toEqual([
      'hunk',
      'R1',
      'L2',
      'L3',
      'R2',
      'R3',
      'R4',
    ]);
    const changed = rows.flatMap((row) =>
      row.kind === 'line' && row.cell.segments.some((segment) => segment.changed) ? [row.cell.id] : [],
    );
    // `(xs)` → `(xs: number[])` only inserts, so the deleted line has nothing to mark.
    expect(changed).toEqual(['R2']);
  });
});

describe('splitRows', () => {
  it('sets deletions beside additions, a context line on both halves with its target on the right', () => {
    const rows = splitRows(FILE).flatMap((row) =>
      row.kind === 'pair'
        ? [[row.left?.id ?? null, row.left?.target ?? null, row.right?.id ?? null, row.right?.target ?? null]]
        : [],
    );
    expect(rows).toEqual([
      ['R1', false, 'R1', true],
      ['L2', true, 'R2', true],
      ['L3', true, null, null],
      ['R3', false, 'R3', true],
      [null, null, 'R4', true],
    ]);
  });
});

describe('diffTargets', () => {
  it('names each file by its path and each line by path, number and a snippet', () => {
    const targets = diffTargets(m, DATA);
    expect(targets[0]).toEqual({ target: { kind: 'file', path: 'src/total.ts' }, label: 'src/total.ts' });
    expect(targets.find((entry) => entry.target.kind === 'line' && entry.target.line === 'L3')?.label).toBe(
      'src/total.ts:-3 (deleted) export const unused = 1;',
    );
    expect(targets.find((entry) => entry.target.kind === 'line' && entry.target.line === 'R4')?.label).toBe(
      'src/total.ts:4 // more',
    );
  });

  it('counts the whole diff', () => {
    expect(diffStats(DATA)).toEqual({ files: 1, additions: 2, deletions: 2 });
  });
});

describe('replaySuggestions', () => {
  const action = (id: string, target: string, payload: unknown, type = SUGGEST_CHANGE): DraftAction => ({
    id,
    type,
    target: { type: 'element', id: target },
    payload,
    createdAt: '2026-01-01T00:00:00Z',
  });

  it('lands a suggestion on its new-side line and reports it as an update', () => {
    const { byLine, results } = replaySuggestions(m, DATA, [
      action('a1', 'diff/line/src%2Ftotal.ts/R2', { text: 'export const total = (xs: readonly number[]) => sum(xs);' }),
    ]);
    expect([...byLine.values()].flat()).toEqual([
      { action: 'a1', text: 'export const total = (xs: readonly number[]) => sum(xs);' },
    ]);
    expect(results).toEqual([
      {
        id: 'a1',
        title: 'Suggested change: src/total.ts:2',
        summary: 'export const total = (xs: readonly number[]) => sum(xs);',
        tone: 'update',
      },
    ]);
  });

  it('keeps as stale a suggestion it cannot place', () => {
    const { byLine, results } = replaySuggestions(m, DATA, [
      action('gone', 'diff/line/src%2Ftotal.ts/R40', { text: 'x' }),
      action('old', 'diff/line/src%2Ftotal.ts/L2', { text: 'x' }),
      action('bad', 'diff/line/src%2Ftotal.ts/R2', { text: 3 }),
      action('other', 'diff/line/src%2Ftotal.ts/R2', {}, 'RENAME'),
    ]);
    expect(byLine.size).toBe(0);
    expect(results.map((result) => [result.id, result.stale])).toEqual([
      ['gone', 'target-missing'],
      ['old', 'target-missing'],
      ['bad', 'constraint-violated'],
      ['other', 'unsupported-action-type'],
    ]);
  });
});
