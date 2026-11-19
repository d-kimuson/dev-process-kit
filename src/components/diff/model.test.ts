import { describe, expect, it } from 'vitest';

import { lineIdOf, normalizeDiffSource, parseUnifiedDiff } from './model';

const MODIFIED = `diff --git a/src/total.ts b/src/total.ts
index 3b18e51..a9f2c3d 100644
--- a/src/total.ts
+++ b/src/total.ts
@@ -1,4 +1,5 @@ export const total
 import { sum } from './sum';
-export const total = (xs) => sum(xs);
+export const total = (xs: number[]) => sum(xs);
+export const empty = 0;

 // end`;

describe('parseUnifiedDiff', () => {
  it('reads a modified file into hunks whose lines carry both line numbers', () => {
    const [file] = parseUnifiedDiff(MODIFIED).files;
    expect(file).toMatchObject({
      path: 'src/total.ts',
      oldPath: 'src/total.ts',
      newPath: 'src/total.ts',
      status: 'modified',
      additions: 2,
      deletions: 1,
    });
    const [hunk] = file?.hunks ?? [];
    expect(hunk).toMatchObject({ oldStart: 1, oldCount: 4, newStart: 1, newCount: 5, section: 'export const total' });
    expect(hunk?.lines.map((line) => [line.kind, line.oldLine, line.newLine, line.text])).toEqual([
      ['context', 1, 1, "import { sum } from './sum';"],
      ['del', 2, null, 'export const total = (xs) => sum(xs);'],
      ['add', null, 2, 'export const total = (xs: number[]) => sum(xs);'],
      ['add', null, 3, 'export const empty = 0;'],
      ['context', 3, 4, ''],
      ['context', 4, 5, '// end'],
    ]);
  });

  it('addresses context and added lines on the new side, deleted lines on the old', () => {
    const lines = parseUnifiedDiff(MODIFIED).files[0]?.hunks[0]?.lines ?? [];
    expect(lines.map(lineIdOf)).toEqual(['R1', 'L2', 'R2', 'R3', 'R4', 'R5']);
  });

  it('tells added, deleted, renamed and binary files from their headers', () => {
    const files = parseUnifiedDiff(`diff --git a/new.md b/new.md
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/new.md
@@ -0,0 +1 @@
+hello
diff --git a/old.md b/old.md
deleted file mode 100644
--- a/old.md
+++ /dev/null
@@ -1 +0,0 @@
-bye
diff --git a/a.ts b/b.ts
similarity index 90%
rename from a.ts
rename to b.ts
--- a/a.ts
+++ b/b.ts
@@ -1 +1 @@
-x
+y
diff --git a/logo.png b/logo.png
index 1111111..2222222 100644
Binary files a/logo.png and b/logo.png differ
diff --git a/run.sh b/run.sh
old mode 100644
new mode 100755`).files;
    expect(files.map((file) => [file.path, file.status, file.oldPath, file.newPath, file.binary])).toEqual([
      ['new.md', 'added', null, 'new.md', false],
      ['old.md', 'deleted', 'old.md', null, false],
      ['b.ts', 'renamed', 'a.ts', 'b.ts', false],
      ['logo.png', 'modified', 'logo.png', 'logo.png', true],
      ['run.sh', 'modified', 'run.sh', 'run.sh', false],
    ]);
    expect(files[4]).toMatchObject({ oldMode: '100644', newMode: '100755', hunks: [] });
  });

  it('reads a plain diff -u without git headers, timestamps cut off', () => {
    const files = parseUnifiedDiff(`--- a.txt\t2026-01-01 00:00:00
+++ b.txt\t2026-01-02 00:00:00
@@ -1,2 +1,2 @@
 keep
--- gone
+++ come
--- c.txt
+++ c.txt
@@ -1 +1 @@
-1
+2`).files;
    expect(files.map((file) => [file.oldPath, file.newPath, file.additions, file.deletions])).toEqual([
      ['a.txt', 'b.txt', 1, 1],
      ['c.txt', 'c.txt', 1, 1],
    ]);
    // `--- gone` is a deleted line ("-- gone") inside the counted hunk, not a header.
    expect(files[0]?.hunks[0]?.lines.map((line) => line.text)).toEqual(['keep', '-- gone', '++ come']);
  });

  it('marks the line before "No newline at end of file"', () => {
    const lines =
      parseUnifiedDiff(`--- a/x
+++ b/x
@@ -1 +1 @@
-a
\\ No newline at end of file
+a`).files[0]?.hunks[0]?.lines ?? [];
    expect(lines.map((line) => line.noNewline)).toEqual([true, false]);
  });

  it('skips the commit header of git show and reads quoted non-ASCII paths', () => {
    const files = parseUnifiedDiff(`commit 49a2173
Author: someone

    fix: a thing

diff --git "a/docs/\\346\\227\\245.md" "b/docs/\\346\\227\\245.md"
--- "a/docs/\\346\\227\\245.md"
+++ "b/docs/\\346\\227\\245.md"
@@ -1 +1 @@
-a
+b`).files;
    expect(files.map((file) => file.path)).toEqual(['docs/日.md']);
  });

  it('keeps an empty context line an editor trimmed', () => {
    const lines = parseUnifiedDiff('--- a/x\n+++ b/x\n@@ -1,3 +1,3 @@\n a\n\n-b\n+c').files[0]?.hunks[0]?.lines ?? [];
    expect(lines.map((line) => line.kind)).toEqual(['context', 'context', 'del', 'add']);
  });

  it('gives no files for an empty text and refuses text that holds no diff', () => {
    expect(parseUnifiedDiff('  \n ').files).toEqual([]);
    expect(() => parseUnifiedDiff('hello world')).toThrow(/no file diff/);
  });

  it('refuses an unreadable hunk header, a merge diff and a path given twice', () => {
    expect(() => parseUnifiedDiff('--- a/x\n+++ b/x\n@@ nope @@\n')).toThrow(/line 3: unreadable hunk header/);
    expect(() => parseUnifiedDiff('diff --cc x\n')).toThrow(/combined/);
    expect(() =>
      parseUnifiedDiff('--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n--- a/x\n+++ b/x\n@@ -5 +5 @@\n-c\n+d'),
    ).toThrow(/x twice/);
  });
});

describe('normalizeDiffSource', () => {
  it('drops the indentation and blank lines of the HTML around it, and reads <\\/script back', () => {
    expect(normalizeDiffSource('\n    --- a/x\n    +++ b/x\n    @@ -1 +1 @@\n    -<\\/script>\n     \n  ')).toEqual([
      '--- a/x',
      '+++ b/x',
      '@@ -1 +1 @@',
      '-</script>',
    ]);
  });
});
