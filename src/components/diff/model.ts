/**
 * Domain model of a diff: the output of `git diff` (or `diff -u`) read into
 * files, their hunks and their lines, with both line numbers on every line.
 *
 * The parser reads the text as git prints it and nothing more: the files'
 * headers (new / deleted / renamed / mode / binary), each hunk's `@@` range,
 * and the `+` / `-` / ` ` lines it counts. Text before the first file (a
 * commit header of `git show`, a mail of `git format-patch`) is skipped.
 */

export type DiffLineKind = 'context' | 'add' | 'del';

export type DiffLine = {
  readonly kind: DiffLineKind;
  /** The line without its `+` / `-` / ` ` prefix. */
  readonly text: string;
  /** Its number in the old file; `null` for an added line. */
  readonly oldLine: number | null;
  /** Its number in the new file; `null` for a deleted line. */
  readonly newLine: number | null;
  /** `\ No newline at end of file` followed it. */
  readonly noNewline: boolean;
};

export type DiffHunk = {
  readonly oldStart: number;
  readonly oldCount: number;
  readonly newStart: number;
  readonly newCount: number;
  /** What git prints after the second `@@` (the enclosing function, usually). */
  readonly section: string;
  readonly lines: readonly DiffLine[];
};

export type DiffFileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'copied';

export type DiffFile = {
  /** The path a reader knows the file by (the new one, or the old one of a deleted file); its key. */
  readonly path: string;
  readonly oldPath: string | null;
  readonly newPath: string | null;
  readonly status: DiffFileStatus;
  readonly binary: boolean;
  readonly oldMode: string | null;
  readonly newMode: string | null;
  readonly hunks: readonly DiffHunk[];
  readonly additions: number;
  readonly deletions: number;
};

export type DiffData = { readonly files: readonly DiffFile[] };

export const emptyDiffData = (): DiffData => ({ files: [] });

/** The line ids a comment or a suggestion points at: `R<n>` on the new side, `L<n>` on the old. */
export type LineId = `${'L' | 'R'}${number}`;

/** Context and added lines are addressed on the new side, as a reviewer reads the result. */
export const lineIdOf = (line: DiffLine): LineId =>
  line.newLine === null ? `L${line.oldLine ?? 0}` : `R${line.newLine}`;

type FileDraft = {
  headerOld: string | null;
  headerNew: string | null;
  oldPath: string | null | undefined;
  newPath: string | null | undefined;
  status: DiffFileStatus | null;
  binary: boolean;
  oldMode: string | null;
  newMode: string | null;
  hunks: HunkDraft[];
  /** Its `---` / `+++` lines were read (a `rename` line sets the paths too). */
  sawOld: boolean;
  sawNew: boolean;
  /** Inside `GIT binary patch` data, which runs until the next file. */
  skipping: boolean;
};

type HunkDraft = {
  readonly oldStart: number;
  readonly oldCount: number;
  readonly newStart: number;
  readonly newCount: number;
  readonly section: string;
  readonly lines: DiffLine[];
  oldLeft: number;
  newLeft: number;
};

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/;

/**
 * The text as written into a page: CRLF folded, a `<\/script` (the only way
 * to write `</script` inside a script element) read back, the blank lines
 * around it dropped, and the indentation of the HTML around it removed — a
 * diff's first line is a header and never starts with a space, so its
 * indentation is the page's.
 */
export const normalizeDiffSource = (source: string): readonly string[] => {
  const lines = source
    .replace(/\r\n?/g, '\n')
    .replace(/<\\\/script/gi, '</script')
    .split('\n');
  const first = lines.findIndex((line) => line.trim() !== '');
  if (first === -1) return [];
  let last = lines.length - 1;
  while (last > first && (lines[last] ?? '').trim() === '') last -= 1;
  const body = lines.slice(first, last + 1);
  const indent = /^[ \t]*/.exec(body[0] ?? '')?.[0] ?? '';
  return indent === '' ? body : body.map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line));
};

/** git quotes a path with special or non-ASCII characters as a C string, bytes as octal escapes. */
const unquote = (quoted: string): string => {
  const bytes: number[] = [];
  const encoder = new TextEncoder();
  const simple: Readonly<Record<string, string>> = { n: '\n', t: '\t', '"': '"', '\\': '\\', a: '\x07', b: '\b' };
  for (let index = 1; index < quoted.length - 1; index += 1) {
    const char = quoted.charAt(index);
    if (char !== '\\') {
      bytes.push(...encoder.encode(char));
      continue;
    }
    const octal = /^[0-7]{3}/.exec(quoted.slice(index + 1))?.[0];
    if (octal !== undefined) {
      bytes.push(Number.parseInt(octal, 8));
      index += 3;
      continue;
    }
    const next = quoted.charAt(index + 1);
    bytes.push(...encoder.encode(simple[next] ?? next));
    index += 1;
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
};

/** One path of a `---` / `+++` / `rename` line: quoted or not, a `diff -u` timestamp cut off. */
const readPath = (raw: string): string => {
  const text = raw.trimEnd();
  if (text.startsWith('"')) {
    const end = /^"(?:\\.|[^\\"])*"/.exec(text)?.[0];
    if (end !== undefined) return unquote(end);
  }
  const tab = text.indexOf('\t');
  return tab === -1 ? text : text.slice(0, tab);
};

const stripPrefix = (path: string, prefix: 'a/' | 'b/'): string =>
  path.startsWith(prefix) ? path.slice(prefix.length) : path;

/** `/dev/null` is no file at all: the file is added or deleted. */
const sidePath = (raw: string, prefix: 'a/' | 'b/'): string | null => {
  const path = readPath(raw);
  return path === '/dev/null' ? null : stripPrefix(path, prefix);
};

/**
 * The two paths of `diff --git a/<old> b/<new>`. Unquoted paths may hold
 * spaces, so the line is ambiguous in general; it is read as the same path
 * twice when it can be (the usual case), else split at ` b/`. The `---` /
 * `+++` and `rename` lines, when there are any, say it exactly.
 */
const headerPaths = (rest: string): readonly [string | null, string | null] => {
  if (rest.startsWith('"')) {
    const old = /^"(?:\\.|[^\\"])*"/.exec(rest)?.[0];
    if (old === undefined) return [null, null];
    const tail = rest.slice(old.length).trimStart();
    return [stripPrefix(unquote(old), 'a/'), stripPrefix(readPath(tail), 'b/')];
  }
  const middle = (rest.length - 1) / 2;
  if (Number.isInteger(middle) && rest.charAt(middle) === ' ') {
    const old = rest.slice(0, middle);
    const next = rest.slice(middle + 1);
    if (old.startsWith('a/') && next.startsWith('b/') && old.slice(2) === next.slice(2))
      return [old.slice(2), next.slice(2)];
  }
  const split = rest.indexOf(' b/');
  if (split === -1) return [null, null];
  return [stripPrefix(rest.slice(0, split), 'a/'), stripPrefix(readPath(rest.slice(split + 1)), 'b/')];
};

const newFile = (): FileDraft => ({
  headerOld: null,
  headerNew: null,
  oldPath: undefined,
  newPath: undefined,
  status: null,
  binary: false,
  oldMode: null,
  newMode: null,
  hunks: [],
  sawOld: false,
  sawNew: false,
  skipping: false,
});

const finishFile = (draft: FileDraft): DiffFile => {
  const oldPath = draft.oldPath === undefined ? draft.headerOld : draft.oldPath;
  const newPath = draft.newPath === undefined ? draft.headerNew : draft.newPath;
  const status: DiffFileStatus =
    draft.status ?? (oldPath === null && newPath !== null ? 'added' : newPath === null ? 'deleted' : 'modified');
  const path = (status === 'deleted' ? oldPath : newPath) ?? oldPath ?? newPath;
  if (path === null) throw new Error('a file in the diff has no path');
  const hunks = draft.hunks.map((hunk): DiffHunk => ({
    oldStart: hunk.oldStart,
    oldCount: hunk.oldCount,
    newStart: hunk.newStart,
    newCount: hunk.newCount,
    section: hunk.section,
    lines: hunk.lines,
  }));
  const lines = hunks.flatMap((hunk) => hunk.lines);
  return {
    path,
    oldPath: status === 'added' ? null : oldPath,
    newPath: status === 'deleted' ? null : newPath,
    status,
    binary: draft.binary,
    oldMode: draft.oldMode,
    newMode: draft.newMode,
    hunks,
    additions: lines.filter((line) => line.kind === 'add').length,
    deletions: lines.filter((line) => line.kind === 'del').length,
  };
};

const readHunkHeader = (line: string, number: number): HunkDraft => {
  const match = HUNK_HEADER.exec(line);
  if (match === null) throw new Error(`line ${number}: unreadable hunk header "${line}"`);
  const [, oldStart = '0', oldCount = '1', newStart = '0', newCount = '1', section = ''] = match;
  const counts = { oldCount: Number(oldCount), newCount: Number(newCount) };
  return {
    oldStart: Number(oldStart),
    newStart: Number(newStart),
    ...counts,
    section: section.trim(),
    lines: [],
    oldLeft: counts.oldCount,
    newLeft: counts.newCount,
  };
};

/** Reads one line inside a hunk; `false` when the line is not one (the hunk ended early). */
const readHunkLine = (hunk: HunkDraft, line: string): boolean => {
  const prefix = line.charAt(0);
  // An empty line is a context line whose single space an editor trimmed away.
  const kind: DiffLineKind | null =
    prefix === ' ' || line === '' ? 'context' : prefix === '+' ? 'add' : prefix === '-' ? 'del' : null;
  if (kind === null) return false;
  const oldLine = kind === 'add' ? null : hunk.oldStart + (hunk.oldCount - hunk.oldLeft);
  const newLine = kind === 'del' ? null : hunk.newStart + (hunk.newCount - hunk.newLeft);
  if (kind !== 'add') hunk.oldLeft -= 1;
  if (kind !== 'del') hunk.newLeft -= 1;
  hunk.lines.push({ kind, text: line.slice(1), oldLine, newLine, noNewline: false });
  return true;
};

const markNoNewline = (hunk: HunkDraft | undefined): void => {
  const last = hunk?.lines.at(-1);
  if (hunk !== undefined && last !== undefined) hunk.lines[hunk.lines.length - 1] = { ...last, noNewline: true };
};

/**
 * Parses unified diff text. Throws on what it cannot read as a diff: an
 * unreadable `@@` header, a combined (merge) diff, no file at all in a
 * non-empty text, or two files under the same path.
 */
export const parseUnifiedDiff = (source: string): DiffData => {
  const lines = normalizeDiffSource(source);
  const files: DiffFile[] = [];
  let file: FileDraft | null = null;
  let hunk: HunkDraft | null = null;
  const close = (): void => {
    if (file !== null) files.push(finishFile(file));
    file = null;
    hunk = null;
  };

  for (const [index, line] of lines.entries()) {
    const number = index + 1;
    const current: HunkDraft | null = hunk;
    if (current !== null) {
      if (current.oldLeft > 0 || current.newLeft > 0) {
        if (line.startsWith('\\')) {
          markNoNewline(current);
          continue;
        }
        if (readHunkLine(current, line)) continue;
      } else if (line.startsWith('\\')) {
        markNoNewline(current);
        continue;
      }
      hunk = null;
    }

    if (line.startsWith('diff --git ')) {
      close();
      const next = newFile();
      [next.headerOld, next.headerNew] = headerPaths(line.slice('diff --git '.length));
      file = next;
      continue;
    }
    if (line.startsWith('diff --cc ') || line.startsWith('diff --combined ')) {
      throw new Error(`line ${number}: combined (merge) diffs are not supported`);
    }
    if (line.startsWith('--- ') && (lines[index + 1] ?? '').startsWith('+++ ')) {
      const open: FileDraft | null = file;
      // A `---` after a file's hunks starts the next file of a plain `diff -u`.
      if (open === null || open.hunks.length > 0 || open.sawOld) {
        close();
        file = newFile();
      }
      if (file !== null) {
        file.oldPath = sidePath(line.slice(4), 'a/');
        file.sawOld = true;
      }
      continue;
    }
    const open: FileDraft | null = file;
    if (open === null || open.skipping) continue;
    if (line.startsWith('+++ ') && open.hunks.length === 0 && !open.sawNew) {
      open.newPath = sidePath(line.slice(4), 'b/');
      open.sawNew = true;
      continue;
    }
    if (line.startsWith('@@ ')) {
      const next = readHunkHeader(line, number);
      open.hunks.push(next);
      hunk = next;
      continue;
    }
    if (open.hunks.length > 0) continue;
    readFileHeader(open, line);
  }
  close();

  if (files.length === 0 && lines.length > 0) throw new Error('no file diff found (expected the output of git diff)');
  const seen = new Set<string>();
  for (const entry of files) {
    if (seen.has(entry.path)) throw new Error(`the diff has ${entry.path} twice`);
    seen.add(entry.path);
  }
  return { files };
};

/** The extended header lines git prints between `diff --git` and the first hunk. */
const readFileHeader = (file: FileDraft, line: string): void => {
  const value = (prefix: string): string | null => (line.startsWith(prefix) ? line.slice(prefix.length) : null);
  const added = value('new file mode ');
  if (added !== null) {
    file.status = 'added';
    file.newMode = added.trim();
    return;
  }
  const deleted = value('deleted file mode ');
  if (deleted !== null) {
    file.status = 'deleted';
    file.oldMode = deleted.trim();
    return;
  }
  const oldMode = value('old mode ');
  if (oldMode !== null) {
    file.oldMode = oldMode.trim();
    return;
  }
  const newMode = value('new mode ');
  if (newMode !== null) {
    file.newMode = newMode.trim();
    return;
  }
  for (const [prefix, side, status] of [
    ['rename from ', 'old', 'renamed'],
    ['rename to ', 'new', 'renamed'],
    ['copy from ', 'old', 'copied'],
    ['copy to ', 'new', 'copied'],
  ] as const) {
    const path = value(prefix);
    if (path === null) continue;
    file.status = status;
    if (side === 'old') file.oldPath = readPath(path);
    else file.newPath = readPath(path);
    return;
  }
  if (line.startsWith('Binary files ') && line.endsWith(' differ')) {
    file.binary = true;
    return;
  }
  if (line === 'GIT binary patch') {
    file.binary = true;
    file.skipping = true;
  }
};
