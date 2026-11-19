// @vitest-environment jsdom
// happy-dom mis-parses a template rooted at <tr> (see table/element.test.ts); jsdom matches real browsers.
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ContextMenuRequest } from '../../core/context-menu/types';
import type { DraftAction } from '../../core/types';

import { parseTargetRef } from '../../core/target';
import { DpkDiff } from './element';
import { defineDiff } from './index';
import { diffMessages } from './messages';

const m = diffMessages('en');

defineDiff();

const DIFF = `diff --git a/src/total.ts b/src/total.ts
index 3b18e51..a9f2c3d 100644
--- a/src/total.ts
+++ b/src/total.ts
@@ -1,3 +1,3 @@
 import { sum } from './sum';
-export const total = (xs) => sum(xs);
+export const total = (xs: number[]) => sum(xs);
 // end
diff --git a/logo.png b/logo.png
Binary files a/logo.png and b/logo.png differ`;

afterEach(() => {
  document.body.replaceChildren();
});

const settle = async (element: DpkDiff): Promise<DpkDiff> => {
  for (let index = 0; index < 3; index++) await element.updateComplete;
  return element;
};

const mount = async (diff = DIFF, id = 'pr', view: DpkDiff['view'] | null = 'unified'): Promise<DpkDiff> => {
  const element = document.createElement('dpk-diff');
  if (!(element instanceof DpkDiff)) throw new Error('did not upgrade');
  if (id) element.id = id;
  if (view !== null) element.setAttribute('view', view);
  const script = document.createElement('script');
  script.type = 'text/x-diff';
  script.textContent = diff;
  element.append(script);
  document.body.append(element);
  return settle(element);
};

const query = <T extends HTMLElement = HTMLElement>(element: DpkDiff, selector: string): T => {
  const found = element.renderRoot.querySelector<T>(selector);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

const text = (element: DpkDiff, selector: string): string =>
  query(element, selector).textContent?.replace(/\s+/g, ' ').trim() ?? '';

const LINE_R2 = 'element:pr/line/src%2Ftotal.ts/R2';

const menu = (element: DpkDiff, ref: string): readonly string[] =>
  (element.getContextMenuItems({ clientX: 0, clientY: 0, target: parseTargetRef(ref) } as ContextMenuRequest) ?? [])
    .flatMap((group) => group.entries)
    .flatMap((entry) => (entry.kind === 'item' ? [entry.id] : []));

const runMenu = (element: DpkDiff, ref: string, id: string): void => {
  const groups = element.getContextMenuItems({ clientX: 0, clientY: 0, target: parseTargetRef(ref) }) ?? [];
  const entry = groups.flatMap((group) => group.entries).find((candidate) => candidate.id === id);
  if (entry?.kind === 'item') entry.run();
};

const typeIn = async (element: DpkDiff, value: string): Promise<void> => {
  const textarea = query<HTMLTextAreaElement>(element, '.composer textarea');
  textarea.value = value;
  textarea.dispatchEvent(new Event('input'));
  await element.updateComplete;
};

describe('dpk-diff', () => {
  it('reads the diff script into files with their status, counts and both line numbers', async () => {
    const element = await mount();
    expect(element.files.map((file) => file.path)).toEqual(['src/total.ts', 'logo.png']);
    expect(text(element, '.summary')).toBe(`${m.summary(2)} +1 −1`);
    expect(text(element, '[data-path="src/total.ts"] .file-stat')).toBe('+1 −1');
    const rows = [...element.renderRoot.querySelectorAll('[data-path="src/total.ts"] tr.line')].map((row) =>
      [...row.querySelectorAll('.num')].map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['1', '1'],
      ['2', ''],
      ['', '2'],
      ['3', '3'],
    ]);
    expect(text(element, '[data-path="logo.png"] .file-note')).toBe(m.binary);
  });

  it('marks the changed words of a replaced line', async () => {
    const element = await mount();
    expect(text(element, 'tr[data-line="R2"] [data-changed]')).toBe(': number[]');
  });

  it('shows the split layout unless told otherwise, and switches to unified', async () => {
    const element = await mount(DIFF, 'pr', null);
    expect(element.view).toBe('split');
    expect(element.renderRoot.querySelectorAll('[data-path="src/total.ts"] tr.pair')).toHaveLength(3);
    // The replaced pair: the old line on the left, its replacement on the right.
    const pair = element.renderRoot.querySelectorAll('[data-path="src/total.ts"] tr.pair')[1];
    expect([...(pair?.querySelectorAll('.code') ?? [])].map((cell) => cell.getAttribute('data-kind'))).toEqual([
      'del',
      'add',
    ]);
    query(element, '.views button:nth-child(1)').click();
    await element.updateComplete;
    expect(element.view).toBe('unified');
    expect(element.getAttribute('view')).toBe('unified');
    expect(element.renderRoot.querySelectorAll('[data-path="src/total.ts"] tr.line')).toHaveLength(4);
  });

  it('folds a file from its header', async () => {
    const element = await mount();
    query(element, '[data-path="src/total.ts"] .toggle').click();
    await element.updateComplete;
    expect(element.renderRoot.querySelector('[data-path="src/total.ts"] table')).toBeNull();
    expect(query(element, '[data-path="src/total.ts"] .toggle').getAttribute('aria-expanded')).toBe('false');
  });

  it('offers every file and line as a comment target, none without an id', async () => {
    const element = await mount();
    expect(element.commentTargets.map((target) => target.value)).toEqual([
      'element:pr/file/src%2Ftotal.ts',
      'element:pr/line/src%2Ftotal.ts/R1',
      'element:pr/line/src%2Ftotal.ts/L2',
      LINE_R2,
      'element:pr/line/src%2Ftotal.ts/R3',
      'element:pr/file/logo.png',
    ]);
    expect(element.commentTargets[0]?.group).toBe(`${m.heading} · pr`);
    expect((await mount(DIFF, '')).commentTargets).toEqual([]);
  });

  it('opens one composer from a line, with a tab for a suggestion only on the new side', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelectorAll('tr[data-line="R2"] .line-btn')).toHaveLength(1);
    query(element, 'tr[data-line="R2"] .line-btn').click();
    await settle(element);
    const tabs = [...element.renderRoot.querySelectorAll('.composer [role="tab"]')];
    expect(tabs.map((tab) => [tab.textContent?.trim(), tab.getAttribute('aria-selected')])).toEqual([
      [m.comment, 'true'],
      [m.suggestChange, 'false'],
    ]);
    expect(element.shadowRoot?.activeElement).toBe(query(element, '.composer textarea'));
    query(element, 'tr[data-line="L2"] .line-btn').click();
    await settle(element);
    // One composer at a time; a deleted line takes a comment only.
    expect(element.renderRoot.querySelectorAll('.composer')).toHaveLength(1);
    expect(element.renderRoot.querySelectorAll('.composer [role="tab"]')).toHaveLength(0);
    expect(menu(element, LINE_R2)).toEqual(['review-comment', 'suggest-change']);
    expect(menu(element, 'element:pr/line/src%2Ftotal.ts/L2')).toEqual(['review-comment']);
  });

  it('submits a line comment to the enclosing view', async () => {
    const element = await mount();
    const submitted = vi.fn((event: Event) => event.preventDefault());
    element.addEventListener('dpk-comment-submit', submitted);
    query(element, 'tr[data-line="L2"] .line-btn').click();
    await settle(element);
    expect(query<HTMLButtonElement>(element, '.composer .dpk-btn--accent').disabled).toBe(true);
    await typeIn(element, 'Why drop the old signature?');
    query(element, '.composer .dpk-btn--accent').click();
    await element.updateComplete;
    const event = submitted.mock.calls[0]?.[0];
    expect(event instanceof CustomEvent ? event.detail : null).toEqual({
      target: 'element:pr/line/src%2Ftotal.ts/L2',
      body: 'Why drop the old signature?',
    });
    expect(element.renderRoot.querySelector('.composer')).toBeNull();
  });

  it('sends a suggestion as a SUGGEST_CHANGE element action, starting from the line', async () => {
    const element = await mount();
    const actions = vi.fn((event: Event) => event.preventDefault());
    element.addEventListener('dpk-element-action', actions);
    query(element, 'tr[data-line="R2"] .line-btn').click();
    await settle(element);
    await typeIn(element, 'Nice.');
    query(element, '.composer [role="tab"]:nth-child(2)').click();
    await settle(element);
    const textarea = query<HTMLTextAreaElement>(element, '.composer textarea');
    expect(textarea.value).toBe('export const total = (xs: number[]) => sum(xs);');
    expect(query<HTMLButtonElement>(element, '.composer .dpk-btn--accent').disabled).toBe(true);
    await typeIn(element, 'export const total = (xs: readonly number[]) => sum(xs);');
    query(element, '.composer .dpk-btn--accent').click();
    await element.updateComplete;
    const event = actions.mock.calls[0]?.[0];
    expect(event instanceof CustomEvent ? event.detail : null).toEqual({
      type: 'SUGGEST_CHANGE',
      target: LINE_R2,
      payload: { text: 'export const total = (xs: readonly number[]) => sum(xs);' },
    });
    expect(element.renderRoot.querySelector('.composer')).toBeNull();
  });

  it("opens the composer on its tab from the context menu, keeping each tab's text", async () => {
    const element = await mount();
    runMenu(element, LINE_R2, 'suggest-change');
    await settle(element);
    expect(query(element, '.composer [aria-selected="true"]').textContent?.trim()).toBe(m.suggestChange);
    await typeIn(element, 'x');
    runMenu(element, LINE_R2, 'review-comment');
    await settle(element);
    expect(query(element, '.composer [aria-selected="true"]').textContent?.trim()).toBe(m.comment);
    expect(query<HTMLTextAreaElement>(element, '.composer textarea').value).toBe('');
    query(element, '.composer [role="tab"]:nth-child(2)').click();
    await settle(element);
    expect(query<HTMLTextAreaElement>(element, '.composer textarea').value).toBe('x');
  });

  it('keeps the suggestion and says why when no view records it', async () => {
    const element = await mount();
    runMenu(element, LINE_R2, 'suggest-change');
    await settle(element);
    await typeIn(element, 'x');
    query(element, '.composer .dpk-btn--accent').click();
    await element.updateComplete;
    expect(text(element, '.composer-error')).toBe(m.unrecorded);
    expect(query<HTMLTextAreaElement>(element, '.composer textarea').value).toBe('x');
  });

  it('shows a replayed suggestion under its line and reports the rest as stale', async () => {
    const element = await mount();
    const action = (id: string, target: string): DraftAction => ({
      id,
      type: 'SUGGEST_CHANGE',
      target: { type: 'element', id: target },
      payload: { text: 'const a = 1;\nconst b = 2;' },
      createdAt: '2026-01-01T00:00:00Z',
    });
    element.elementActions = [action('s1', 'pr/line/src%2Ftotal.ts/R2'), action('s2', 'pr/line/src%2Ftotal.ts/R9')];
    await element.updateComplete;
    const lines = [...element.renderRoot.querySelectorAll('[data-action="s1"] .suggestion-line')].map((line) => [
      line.getAttribute('data-kind'),
      line.textContent?.trim(),
    ]);
    expect(lines).toEqual([
      ['del', '-export const total = (xs: number[]) => sum(xs);'],
      ['add', '+const a = 1;'],
      ['add', '+const b = 2;'],
    ]);
    expect(element.elementActionResults.map((result) => result.stale ?? null)).toEqual([null, 'target-missing']);
  });

  it('keeps posted comments under their line and file as threads, in both layouts', async () => {
    const element = await mount();
    const comment = (id: string, target: string, body: string): DraftAction => ({
      id,
      type: 'comment',
      target: { type: 'element', id: target },
      payload: { body },
      createdAt: '2026-01-01T00:00:00Z',
    });
    element.elementComments = [
      comment('c1', 'pr/line/src%2Ftotal.ts/L2', 'Why drop it?'),
      comment('c2', 'pr/file/src%2Ftotal.ts', 'Whole file'),
      comment('c3', 'pr/line/src%2Ftotal.ts/L2', 'Because it is unused.'),
      comment('c4', 'pr/line/src%2Ftotal.ts/R9', 'Gone'),
    ];
    await element.updateComplete;
    const bodies = (): string[][] =>
      [...element.renderRoot.querySelectorAll('.thread')].map((thread) =>
        [...thread.querySelectorAll('.thread-body')].map((body) => body.textContent?.trim() ?? ''),
      );
    expect(bodies()).toEqual([['Whole file'], ['Why drop it?', 'Because it is unused.']]);
    expect(query(element, 'tr[data-line="L2"]').nextElementSibling?.querySelector('.thread')).not.toBeNull();
    element.view = 'split';
    await element.updateComplete;
    expect(bodies()).toEqual([['Whole file'], ['Why drop it?', 'Because it is unused.']]);
  });

  it('replies in a thread with another comment on the same line', async () => {
    const element = await mount();
    element.elementComments = [
      {
        id: 'c1',
        type: 'comment',
        target: { type: 'element', id: 'pr/line/src%2Ftotal.ts/L2' },
        payload: { body: 'Why drop it?' },
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];
    await element.updateComplete;
    const submitted = vi.fn((event: Event) => event.preventDefault());
    element.addEventListener('dpk-comment-submit', submitted);
    query(element, '.thread .thread-reply').click();
    await settle(element);
    const textarea = query<HTMLTextAreaElement>(element, '.thread textarea');
    expect(element.shadowRoot?.activeElement).toBe(textarea);
    textarea.value = 'Because it is unused.';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    query(element, '.thread .dpk-btn--accent').click();
    await element.updateComplete;
    const event = submitted.mock.calls[0]?.[0];
    expect(event instanceof CustomEvent ? event.detail : null).toEqual({
      target: 'element:pr/line/src%2Ftotal.ts/L2',
      body: 'Because it is unused.',
    });
    expect(element.renderRoot.querySelector('.thread textarea')).toBeNull();
  });

  it('follows the diff property when there is no script, and says when it cannot read it', async () => {
    const element = document.createElement('dpk-diff');
    if (!(element instanceof DpkDiff)) throw new Error('did not upgrade');
    document.body.append(element);
    element.diff = '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b';
    await settle(element);
    expect(element.files.map((file) => file.path)).toEqual(['x']);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    element.diff = 'not a diff';
    await settle(element);
    expect(element.dataError).toMatch(/no file diff/);
    expect(text(element, '.notice')).toContain(m.dataError);
    error.mockRestore();
  });

  it('re-reads the script when its text changes', async () => {
    const element = await mount();
    const script = element.querySelector('script');
    if (!script) throw new Error('no script');
    script.textContent = '--- a/y\n+++ b/y\n@@ -1 +1 @@\n-a\n+b';
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(element);
    expect(element.files.map((file) => file.path)).toEqual(['y']);
  });
});
