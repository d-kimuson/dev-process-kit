import { LitElement, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { ContextMenuGroup, ContextMenuRequest } from '../../core/context-menu/types';
import type { ElementActionResult } from '../../core/element-actions';
import type { CommentTargetOption, DraftAction } from '../../core/types';

import { commentBody } from '../../core/comment';
import { contextMenuMessages } from '../../core/context-menu/messages';
import { iconChevronRight, iconComment, iconPencil, iconPlus } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { targetRef } from '../../core/target';
import { CommentPopoverController, reviewCommentMenuGroup } from '../comment-composer/controller';
import { diffMessages, type DiffMessages } from './messages';
import {
  emptyDiffData,
  lineIdOf,
  parseUnifiedDiff,
  type DiffData,
  type DiffFile,
  type DiffHunk,
  type DiffLine,
} from './model';
import {
  diffStats,
  diffTargets,
  lineLabel,
  splitRows,
  targetSegments,
  unifiedRows,
  type DiffTarget,
  type LineCell,
} from './present';
import { diffStyles } from './styles';
import { lineKey, replaySuggestions, SUGGEST_CHANGE, type Suggestion } from './suggestions';

const SOURCE_SELECTOR = 'script[type="text/x-diff"], script[type="text/plain"]';

export type DiffView = 'unified' | 'split';

/** A line a reader can write on: its target, and how the review rail names it. */
type LineTarget = { readonly ref: string; readonly path: string; readonly line: DiffLine; readonly label: string };

export type ComposerTab = 'comment' | 'suggest';

/** The line whose composer is open under it, on which tab. */
type Composing = LineTarget & { readonly tab: ComposerTab };

/** Only a line of the new side takes a suggestion, as on GitHub. */
const canSuggest = (line: DiffLine): boolean => line.newLine !== null;

const draftKey = (ref: string, tab: ComposerTab): string => `${ref}#${tab}`;

const replyKey = (ref: string): string => `${ref}#reply`;

const UNIFIED_COLUMNS = 4;
const SPLIT_COLUMNS = 6;

/**
 * `<dpk-diff>` — the output of `git diff`, laid out for review the way a
 * code host shows a pull request: files with their status and counts, hunks
 * with both line numbers, syntax colors, and the changed words of a replaced
 * line marked. Unified or side by side.
 *
 * Every file and every line is a comment target. A line of the new side also
 * takes a suggested change (`SUGGEST_CHANGE`), recorded as an element action
 * in the enclosing view's draft and shown under its line.
 */
export class DpkDiff extends LitElement {
  static override styles: CSSResultGroup = diffStyles;
  static override properties = {
    id: { type: String, reflect: true },
    heading: { type: String },
    view: { type: String, reflect: true },
    diff: { type: String, attribute: false },
  };

  declare heading: string | null;
  declare view: DiffView;
  /** Used when the element has no diff script of its own. */
  declare diff: string;

  readonly #i18n = new LocaleController(this, () => {
    this.#targetSignature = '';
    this.#replay();
  });
  readonly #commentPopover = new CommentPopoverController(this);
  readonly #observer = new MutationObserver(() => {
    this.#read();
  });
  #source: string | null = null;
  #data: DiffData = emptyDiffData();
  #dataError: string | null = null;
  #labels: ReadonlyMap<string, string> = new Map();
  #targetSignature = '';
  #collapsed: ReadonlySet<string> = new Set();
  #elementActions: readonly DraftAction[] = [];
  #results: readonly ElementActionResult[] = [];
  #suggestions: ReadonlyMap<string, readonly Suggestion[]> = new Map();
  #composing: Composing | null = null;
  /** Unsent text, per line and tab. */
  #drafts: ReadonlyMap<string, string> = new Map();
  /** The draft (line and tab) whose last submit no view recorded. */
  #unrecorded: string | null = null;
  #focus: 'text' | 'tab' | 'reply' | null = null;
  #elementComments: readonly DraftAction[] = [];
  #threads: ReadonlyMap<string, readonly DraftAction[]> = new Map();
  /** The thread whose reply box is open. */
  #replying: string | null = null;

  constructor() {
    super();
    this.id = this.getAttribute('id') ?? '';
    this.heading = null;
    this.view = 'split';
    this.diff = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#targetSignature = '';
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true });
    this.#read();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('diff')) this.#read();
  }

  protected override updated(): void {
    this.#syncTargets();
    this.#commentPopover.sync(this.renderRoot.querySelector<HTMLElement>('.comment-pop'));
    const focus = this.#focus;
    this.#focus = null;
    const selector =
      focus === 'text'
        ? '.composer textarea'
        : focus === 'tab'
          ? '.composer [aria-selected="true"]'
          : focus === 'reply'
            ? '.thread textarea'
            : null;
    if (selector !== null) this.renderRoot.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------- public

  /** Every file and line, for the enclosing view's review rail. */
  get commentTargets(): readonly CommentTargetOption[] {
    if (!this.id) return [];
    const group = `${this.heading ?? this.#m.heading} · ${this.id}`;
    return [...this.#labels].map(([value, label]) => ({ value, label, group }));
  }

  get elementActions(): readonly DraftAction[] {
    return this.#elementActions;
  }

  set elementActions(actions: readonly DraftAction[]) {
    this.#elementActions = actions;
    this.#replay();
  }

  /** The review comments on this diff's files and lines, assigned by the enclosing view; shown as threads. */
  get elementComments(): readonly DraftAction[] {
    return this.#elementComments;
  }

  set elementComments(comments: readonly DraftAction[]) {
    this.#elementComments = comments;
    const threads = new Map<string, DraftAction[]>();
    for (const comment of comments) {
      const ref = `element:${comment.target.id}`;
      threads.set(ref, [...(threads.get(ref) ?? []), comment]);
    }
    this.#threads = threads;
    this.requestUpdate();
  }

  get elementActionResults(): readonly ElementActionResult[] {
    return this.#results;
  }

  /** The parsed diff (read-only). */
  get files(): readonly DiffFile[] {
    return this.#data.files;
  }

  /** Why the diff could not be read, or `null` (read-only). */
  get dataError(): string | null {
    return this.#dataError;
  }

  /** "Review comment" on any file or line, and "Suggest change" on a line of the new side. */
  getContextMenuItems(request: ContextMenuRequest): readonly ContextMenuGroup[] | null {
    const groups: ContextMenuGroup[] = [];
    const comment = reviewCommentMenuGroup(
      request.target,
      this.commentTargets,
      contextMenuMessages(this.#i18n.locale),
      (ref, label) => this.#openComment(ref, label),
    );
    if (comment !== null) groups.push(comment);
    const ref = request.target === null ? null : targetRef(request.target);
    const line = ref === null ? null : this.#lineTarget(ref);
    if (line !== null && canSuggest(line.line)) {
      groups.push({
        id: 'suggest-change',
        entries: [
          {
            kind: 'item',
            id: 'suggest-change',
            label: this.#m.suggestChange,
            run: () => this.#openComposer(line, 'suggest'),
          },
        ],
      });
    }
    return groups.length === 0 ? null : groups;
  }

  // ---------------------------------------------------------------- internals

  get #m(): DiffMessages {
    return diffMessages(this.#i18n.locale);
  }

  get #text(): string {
    const script = this.querySelector(SOURCE_SELECTOR);
    return script === null ? this.diff : (script.textContent ?? '');
  }

  #read(): void {
    const source = this.#text;
    if (source === this.#source) return;
    this.#source = source;
    try {
      this.#data = parseUnifiedDiff(source);
      this.#dataError = null;
    } catch (error) {
      this.#data = emptyDiffData();
      this.#dataError = error instanceof Error ? error.message : String(error);
      console.error('[dev-process-kit] invalid diff:', this.#dataError);
    }
    this.#replay();
  }

  #replay(): void {
    const m = this.#m;
    this.#labels = new Map(diffTargets(m, this.#data).map(({ target, label }) => [this.#ref(target), label]));
    const replayed = replaySuggestions(m, this.#data, this.#elementActions);
    this.#suggestions = replayed.byLine;
    this.#results = replayed.results;
    this.requestUpdate();
  }

  #ref(target: DiffTarget): string {
    return `element:${[this.id, ...targetSegments(target)].map((segment) => encodeURIComponent(segment)).join('/')}`;
  }

  #syncTargets(): void {
    const signature = JSON.stringify(this.commentTargets);
    if (signature === this.#targetSignature) return;
    this.#targetSignature = signature;
    this.dispatchEvent(new CustomEvent('dpk-comment-targets-change', { bubbles: true, composed: true }));
  }

  /** The line a target names, when it names one. */
  #lineTarget(ref: string): LineTarget | null {
    if (!this.id) return null;
    for (const file of this.#data.files) {
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          const lineRef = this.#ref({ kind: 'line', path: file.path, line: lineIdOf(line) });
          if (lineRef === ref) return { ref, path: file.path, line, label: lineLabel(this.#m, file.path, line) };
        }
      }
    }
    return null;
  }

  /** A line's comment opens in its composer; a file's in the popover. */
  #openComment(ref: string, label: string): void {
    const line = this.#lineTarget(ref);
    if (line !== null) {
      this.#openComposer(line, 'comment');
      return;
    }
    const anchor = this.renderRoot.querySelector<Element>(`[data-dpk-target="${CSS.escape(ref)}"]`);
    if (anchor === null) return;
    this.#commentPopover.open(ref, anchor, label);
  }

  /** There is no board here: an enclosing view saves the comment, cancelling the event once it has. */
  #submitComment(target: string, body: string): boolean {
    return !this.dispatchEvent(
      new CustomEvent('dpk-comment-submit', {
        detail: { target, body },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  #openComposer(line: LineTarget, tab: ComposerTab): void {
    if (this.#collapsed.has(line.path)) this.#toggleFile(line.path);
    this.#composing = { ...line, tab: tab === 'suggest' && !canSuggest(line.line) ? 'comment' : tab };
    this.#unrecorded = null;
    this.#focus = 'text';
    this.requestUpdate();
  }

  #switchTab(tab: ComposerTab, focus: 'text' | 'tab'): void {
    const open = this.#composing;
    if (open === null || open.tab === tab || !canSuggest(open.line)) return;
    this.#composing = { ...open, tab };
    this.#unrecorded = null;
    this.#focus = focus;
    this.requestUpdate();
  }

  #openReply(ref: string): void {
    this.#replying = ref;
    this.#unrecorded = null;
    this.#focus = 'reply';
    this.requestUpdate();
  }

  #closeReply(discard: boolean): void {
    const ref = this.#replying;
    if (ref === null) return;
    if (discard) {
      const drafts = new Map(this.#drafts);
      drafts.delete(replyKey(ref));
      this.#drafts = drafts;
    }
    this.#replying = null;
    this.#unrecorded = null;
    this.requestUpdate();
  }

  /** A reply is one more comment on the thread's target; the view hands it back through `elementComments`. */
  #submitReply(ref: string): void {
    const body = (this.#drafts.get(replyKey(ref)) ?? '').trim();
    if (body === '') return;
    if (!this.#submitComment(ref, body)) {
      this.#unrecorded = replyKey(ref);
      this.requestUpdate();
      return;
    }
    this.#closeReply(true);
  }

  /** Escape keeps what was typed for the next time the line is opened; Cancel and a recorded submit drop it. */
  #closeComposer(discard: boolean): void {
    const open = this.#composing;
    if (open === null) return;
    if (discard) {
      const drafts = new Map(this.#drafts);
      drafts.delete(draftKey(open.ref, 'comment'));
      drafts.delete(draftKey(open.ref, 'suggest'));
      this.#drafts = drafts;
    }
    this.#composing = null;
    this.#unrecorded = null;
    this.requestUpdate();
  }

  /** A suggestion starts from the line as it stands; a comment from nothing. */
  #draft(open: Composing): string {
    return this.#drafts.get(draftKey(open.ref, open.tab)) ?? (open.tab === 'suggest' ? open.line.text : '');
  }

  #canSubmit(open: Composing): boolean {
    const draft = this.#draft(open);
    return open.tab === 'suggest' ? draft !== open.line.text : draft.trim() !== '';
  }

  #submitComposer(): void {
    const open = this.#composing;
    if (open === null || !this.#canSubmit(open)) return;
    const text = this.#draft(open);
    // An accepted suggestion comes back through `elementActions`; otherwise keep the composer and its text.
    const accepted = open.tab === 'comment' ? this.#submitComment(open.ref, text.trim()) : this.#suggest(open, text);
    if (!accepted) {
      this.#unrecorded = draftKey(open.ref, open.tab);
      this.requestUpdate();
      return;
    }
    this.#closeComposer(true);
  }

  #suggest(open: Composing, text: string): boolean {
    return !this.dispatchEvent(
      new CustomEvent('dpk-element-action', {
        detail: { type: SUGGEST_CHANGE, target: open.ref, payload: { text } },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  #toggleFile(path: string): void {
    const collapsed = new Set(this.#collapsed);
    if (!collapsed.delete(path)) collapsed.add(path);
    this.#collapsed = collapsed;
    this.requestUpdate();
  }

  #setView(view: DiffView): void {
    this.view = view;
  }

  // -------------------------------------------------------------------- views

  protected override render(): TemplateResult {
    const m = this.#m;
    const stats = diffStats(this.#data);
    const view: DiffView = this.view === 'split' ? 'split' : 'unified';
    return html`
      <section class="diff" data-view=${view}>
        <header class="toolbar">
          <span class="title">${this.heading ?? m.heading}</span>
          <span class="summary">
            ${m.summary(stats.files)}
            <span class="stat-add">+${stats.additions}</span>
            <span class="stat-del">−${stats.deletions}</span>
          </span>
          <span class="views" role="group" aria-label=${m.viewLabel}>
            ${(['unified', 'split'] as const).map(
              (option) =>
                html`<button
                  type="button"
                  aria-pressed=${view === option ? 'true' : 'false'}
                  @click=${() => this.#setView(option)}
                >
                  ${m[option]}
                </button>`,
            )}
          </span>
        </header>
        ${
          this.#dataError === null
            ? nothing
            : html`<p class="notice" role="alert">${m.dataError}<br />${this.#dataError}</p>`
        }
        ${this.#dataError === null && stats.files === 0 ? html`<p class="empty">${m.empty}</p>` : nothing}
        ${repeat(
          this.#data.files,
          (file) => file.path,
          (file) => this.#renderFile(file, view),
        )}
      </section>
      ${this.#commentPopover.render({
        locale: this.#i18n.locale,
        errorMessage: m.sendFailed,
        submit: (target, body) => this.#submitComment(target, body),
      })}
    `;
  }

  #renderFile(file: DiffFile, view: DiffView): TemplateResult {
    const m = this.#m;
    const open = !this.#collapsed.has(file.path);
    const ref = this.#ref({ kind: 'file', path: file.path });
    const moved = (file.status === 'renamed' || file.status === 'copied') && file.oldPath !== null;
    return html`<section class="file" data-path=${file.path} data-status=${file.status}>
      <header class="file-head" data-dpk-target=${this.id ? ref : nothing}>
        <button
          type="button"
          class="dpk-icon-btn toggle"
          data-size="sm"
          aria-expanded=${open ? 'true' : 'false'}
          aria-label=${open ? m.collapse(file.path) : m.expand(file.path)}
          @click=${() => this.#toggleFile(file.path)}
        >
          ${iconChevronRight()}
        </button>
        <span class="status" data-status=${file.status}>${m[file.status]}</span>
        <span class="path"
          >${moved ? html`<span class="old-path">${file.oldPath}</span> → ` : nothing}${file.path}</span
        >
        <span class="file-stat"
          ><span class="stat-add">+${file.additions}</span> <span class="stat-del">−${file.deletions}</span></span
        >
        ${this.id ? this.#commentButton(ref, file.path) : nothing}
      </header>
      ${open ? this.#renderFileThread(ref) : nothing} ${open ? this.#renderFileBody(file, view) : nothing}
    </section>`;
  }

  #renderFileBody(file: DiffFile, view: DiffView): TemplateResult {
    const m = this.#m;
    if (file.binary) return html`<p class="file-note">${m.binary}</p>`;
    if (file.hunks.length === 0) {
      const mode =
        file.oldMode !== null && file.newMode !== null && file.oldMode !== file.newMode
          ? m.modeChanged(file.oldMode, file.newMode)
          : m.noContentChange;
      return html`<p class="file-note">${mode}</p>`;
    }
    // Every line is a review unit for comments, not for Check Mode: the file is.
    return html`<div class="scroll" data-dpk-check="off">
      <table class="lines" data-view=${view}>
        ${view === 'split' ? this.#renderSplit(file) : this.#renderUnified(file)}
      </table>
    </div>`;
  }

  #renderUnified(file: DiffFile): TemplateResult {
    return html`<colgroup>
        <col class="col-num" />
        <col class="col-num" />
        <col class="col-act" />
        <col />
      </colgroup>
      <tbody>
        ${unifiedRows(file).map((row) => {
          if (row.kind === 'hunk') return this.#renderHunk(row.hunk, UNIFIED_COLUMNS);
          const { cell } = row;
          const ref = this.#lineRef(file, cell);
          return html`<tr
              class="line"
              data-kind=${cell.line.kind}
              data-line=${cell.id}
              data-dpk-target=${ref ?? nothing}
            >
              <td class="num">${cell.line.oldLine ?? ''}</td>
              <td class="num">${cell.line.newLine ?? ''}</td>
              <td class="act">${this.#lineActions(file, cell, ref)}</td>
              ${this.#renderCode(cell)}
            </tr>
            ${this.#renderExtras(file, cell, UNIFIED_COLUMNS)}`;
        })}
      </tbody>`;
  }

  #renderSplit(file: DiffFile): TemplateResult {
    return html`<colgroup>
        <col class="col-num" />
        <col class="col-act" />
        <col class="col-half" />
        <col class="col-num" />
        <col class="col-act" />
        <col class="col-half" />
      </colgroup>
      <tbody>
        ${splitRows(file).map((row) => {
          if (row.kind === 'hunk') return this.#renderHunk(row.hunk, SPLIT_COLUMNS);
          return html`<tr class="pair">
              ${this.#renderHalf(file, row.left, 'old')} ${this.#renderHalf(file, row.right, 'new')}
            </tr>
            ${row.left !== null && row.left.target ? this.#renderExtras(file, row.left, SPLIT_COLUMNS) : nothing}
            ${row.right === null ? nothing : this.#renderExtras(file, row.right, SPLIT_COLUMNS)}`;
        })}
      </tbody>`;
  }

  #renderHalf(file: DiffFile, cell: LineCell | null, side: 'old' | 'new'): TemplateResult {
    if (cell === null)
      return html`<td class="num" data-blank></td>
        <td class="act" data-blank></td>
        <td class="code" data-blank></td>`;
    const ref = this.#lineRef(file, cell);
    const number = side === 'old' ? cell.line.oldLine : cell.line.newLine;
    return html`<td class="num" data-kind=${cell.line.kind}>${number ?? ''}</td>
      <td class="act" data-kind=${cell.line.kind}>${this.#lineActions(file, cell, ref)}</td>
      ${this.#renderCode(cell, ref)}`;
  }

  #renderHunk(hunk: DiffHunk, columns: number): TemplateResult {
    const range = `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;
    return html`<tr class="hunk">
      <td colspan=${columns}>
        <span class="hunk-range">${range}</span
        >${hunk.section === '' ? nothing : html` <span class="hunk-section">${hunk.section}</span>`}
      </td>
    </tr>`;
  }

  /** The code of one line; in the split layout the cell carries the line's target. */
  #renderCode(cell: LineCell, ref?: string | null): TemplateResult {
    const sign = cell.line.kind === 'add' ? '+' : cell.line.kind === 'del' ? '-' : ' ';
    return html`<td class="code" data-kind=${cell.line.kind} data-dpk-target=${ref ?? nothing}>
      <span class="sign" aria-hidden="true">${sign}</span
      ><span class="text"
        >${cell.segments.map((segment) =>
          segment.kind === null && !segment.changed
            ? segment.text
            : html`<span class=${segment.kind ?? nothing} ?data-changed=${segment.changed}>${segment.text}</span>`,
        )}</span
      >${
        cell.line.noNewline
          ? html`<span class="no-newline" title=${this.#m.noNewline} aria-label=${this.#m.noNewline}>⊘</span>`
          : nothing
      }
    </td>`;
  }

  #lineRef(file: DiffFile, cell: LineCell): string | null {
    if (!this.id || !cell.target) return null;
    return this.#ref({ kind: 'line', path: file.path, line: cell.id });
  }

  /** One "+" per line: it opens the composer, where the reader picks a comment or a suggestion. */
  #lineActions(file: DiffFile, cell: LineCell, ref: string | null): TemplateResult | typeof nothing {
    if (ref === null) return nothing;
    const label = this.#labels.get(ref) ?? file.path;
    const open = this.#composing?.ref === ref;
    return html`<span class="line-actions" ?data-open=${open}
      ><button
        type="button"
        class="line-btn"
        aria-label=${this.#m.addOn(label)}
        aria-expanded=${open ? 'true' : 'false'}
        title=${this.#m.addOn(label)}
        @click=${() => this.#openComposer({ ref, path: file.path, line: cell.line, label }, 'comment')}
      >
        ${iconPlus()}
      </button></span
    >`;
  }

  #commentButton(ref: string, label: string): TemplateResult {
    return html`<button
      type="button"
      class="dpk-icon-btn"
      data-size="sm"
      aria-label=${this.#m.commentOn(label)}
      title=${this.#m.commentOn(label)}
      @click=${() => this.#openComment(ref, label)}
    >
      ${iconComment()}
    </button>`;
  }

  /** What follows a line: its comment thread, the suggestions made on it, and its composer while it is open. */
  #renderExtras(file: DiffFile, cell: LineCell, columns: number): TemplateResult | typeof nothing {
    const suggestions = cell.line.newLine === null ? [] : (this.#suggestions.get(lineKey(file.path, cell.id)) ?? []);
    const ref = this.#lineRef(file, cell);
    const thread = ref === null ? [] : (this.#threads.get(ref) ?? []);
    const composing = ref !== null && this.#composing?.ref === ref ? this.#composing : null;
    if (thread.length === 0 && suggestions.length === 0 && composing === null) return nothing;
    return html`${
      ref === null || thread.length === 0
        ? nothing
        : html`<tr class="extra">
            <td colspan=${columns}>${this.#renderThread(ref, thread)}</td>
          </tr>`
    }${suggestions.map(
      (suggestion) =>
        html`<tr class="extra">
          <td colspan=${columns}>${this.#renderSuggestion(cell.line, suggestion)}</td>
        </tr>`,
    )}${
      composing === null
        ? nothing
        : html`<tr class="extra">
            <td colspan=${columns}>${this.#renderComposer(composing)}</td>
          </tr>`
    }`;
  }

  #renderFileThread(ref: string): TemplateResult | typeof nothing {
    const thread = this.#threads.get(ref) ?? [];
    if (!this.id || thread.length === 0) return nothing;
    return html`<div class="file-thread">${this.#renderThread(ref, thread)}</div>`;
  }

  /** The comments posted on one file or line, oldest first, with a box to reply below them. */
  #renderThread(ref: string, comments: readonly DraftAction[]): TemplateResult {
    const m = this.#m;
    const label = this.#labels.get(ref) ?? '';
    const key = replyKey(ref);
    const draft = this.#drafts.get(key) ?? '';
    const time = new Intl.DateTimeFormat(this.#i18n.locale, { dateStyle: 'short', timeStyle: 'short' });
    return html`<section class="thread" data-thread=${ref} aria-label=${m.threadOn(label)}>
      <ol class="thread-items">
        ${comments.map((comment) => {
          const at = new Date(comment.createdAt);
          return html`<li class="thread-item" data-comment=${comment.id}>
            <p class="thread-meta">
              ${iconComment()}
              ${Number.isNaN(at.getTime()) ? nothing : html`<time datetime=${comment.createdAt}>${time.format(at)}</time>`}
            </p>
            <p class="thread-body">${commentBody(comment)}</p>
          </li>`;
        })}
      </ol>
      ${
        this.#replying === ref
          ? html`<div
              class="thread-compose"
              @keydown=${(event: KeyboardEvent) => {
                if (event.isComposing) return;
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  this.#closeReply(false);
                } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  this.#submitReply(ref);
                }
              }}
            >
              <textarea
                class="dpk-textarea"
                rows="3"
                aria-label=${m.reply}
                data-dpk-text-key=${key}
                .value=${draft}
                @input=${(event: Event) => {
                  if (!(event.currentTarget instanceof HTMLTextAreaElement)) return;
                  this.#drafts = new Map(this.#drafts).set(key, event.currentTarget.value);
                  this.#unrecorded = null;
                  this.requestUpdate();
                }}
              ></textarea>
              ${this.#unrecorded === key ? html`<p class="composer-error" role="alert">${m.sendFailed}</p>` : nothing}
              <div class="composer-actions">
                <button
                  class="dpk-btn dpk-btn--accent"
                  type="button"
                  ?disabled=${draft.trim() === ''}
                  @click=${() => this.#submitReply(ref)}
                >
                  ${m.reply}
                </button>
                <button
                  class="dpk-btn dpk-btn--ghost"
                  type="button"
                  data-dpk-text-discard
                  @click=${() => this.#closeReply(true)}
                >
                  ${m.cancel}
                </button>
              </div>
            </div>`
          : html`<button type="button" class="thread-reply" @click=${() => this.#openReply(ref)}>
              ${m.replyPlaceholder}
            </button>`
      }
    </section>`;
  }

  #renderSuggestion(line: DiffLine, suggestion: Suggestion): TemplateResult {
    const replacement = suggestion.text === '' ? [] : suggestion.text.split('\n');
    return html`<div class="suggestion" data-action=${suggestion.action}>
      <p class="suggestion-head">${iconPencil()} ${this.#m.suggestion}</p>
      <div class="suggestion-lines">
        <div class="suggestion-line" data-kind="del">
          <span class="sign">-</span><span class="text">${line.text}</span>
        </div>
        ${replacement.map(
          (text) =>
            html`<div class="suggestion-line" data-kind="add">
              <span class="sign">+</span><span class="text">${text}</span>
            </div>`,
        )}
      </div>
    </div>`;
  }

  #renderComposer(open: Composing): TemplateResult {
    const m = this.#m;
    const draft = this.#draft(open);
    const rows = Math.min(12, Math.max(3, draft.split('\n').length + 1));
    const key = draftKey(open.ref, open.tab);
    const tabs = canSuggest(open.line)
      ? html`<div
          class="composer-tabs"
          role="tablist"
          aria-label=${m.composerTabs}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            this.#switchTab(open.tab === 'comment' ? 'suggest' : 'comment', 'tab');
          }}
        >
          ${(['comment', 'suggest'] as const).map(
            (tab) =>
              html`<button
                type="button"
                role="tab"
                aria-selected=${open.tab === tab ? 'true' : 'false'}
                tabindex=${open.tab === tab ? 0 : -1}
                @click=${() => this.#switchTab(tab, 'text')}
              >
                ${tab === 'comment' ? m.comment : m.suggestChange}
              </button>`,
          )}
        </div>`
      : html`<strong class="composer-title">${m.comment}</strong>`;
    return html`<div
      class="composer"
      data-tab=${open.tab}
      @keydown=${(event: KeyboardEvent) => {
        if (event.isComposing) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          this.#closeComposer(false);
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.#submitComposer();
        }
      }}
    >
      <div class="composer-head">${tabs}<span class="composer-target">${open.label}</span></div>
      <textarea
        class="dpk-textarea"
        rows=${rows}
        spellcheck=${open.tab === 'suggest' ? 'false' : 'true'}
        aria-label=${open.tab === 'suggest' ? m.suggestionLabel : m.comment}
        data-dpk-text-key=${key}
        .value=${draft}
        @input=${(event: Event) => {
          if (!(event.currentTarget instanceof HTMLTextAreaElement)) return;
          this.#drafts = new Map(this.#drafts).set(key, event.currentTarget.value);
          this.#unrecorded = null;
          this.requestUpdate();
        }}
      ></textarea>
      ${this.#unrecorded === key ? html`<p class="composer-error" role="alert">${m.unrecorded}</p>` : nothing}
      <div class="composer-actions">
        <button
          class="dpk-btn dpk-btn--accent"
          type="button"
          ?disabled=${!this.#canSubmit(open)}
          @click=${() => this.#submitComposer()}
        >
          ${open.tab === 'suggest' ? m.suggest : m.addComment}
        </button>
        <button
          class="dpk-btn dpk-btn--ghost"
          type="button"
          data-dpk-text-discard
          @click=${() => this.#closeComposer(true)}
        >
          ${m.cancel}
        </button>
      </div>
    </div>`;
  }
}
