// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { initialPanelState, reducePanel, commentEditSubmission, commentSubmission } from './model';

describe('comment panel state', () => {
  it('preserves the follow-current preference underneath an explicit target', () => {
    const initial = initialPanelState();
    const current = reducePanel(initial, { kind: 'attach', current: true });
    const explicit = reducePanel(current, { kind: 'target-requested', ref: 'step:a' });
    expect(explicit.attachment).toEqual({ kind: 'explicit', ref: 'step:a', resume: 'current' });
    expect(reducePanel(explicit, { kind: 'clear-target' }).attachment).toEqual({ kind: 'current' });
    expect(initial.attachment).toEqual({ kind: 'page' });
  });
  it('does not clear text until submission is acknowledged', () => {
    const state = reducePanel(initialPanelState(), { kind: 'input', body: '  note  ' });
    expect(commentSubmission(state, 'step:a')).toEqual({ target: 'step:a', body: 'note' });
    expect(state.body).toBe('  note  ');
    expect(reducePanel(state, { kind: 'submitted' }).body).toBe('');
    expect(commentSubmission(initialPanelState(), 'step:a')).toBeNull();
  });
  it('ignores late clipboard completions', () => {
    const first = reducePanel(initialPanelState(), { kind: 'copy-started' });
    const second = reducePanel(first, { kind: 'copy-started' });
    expect(reducePanel(second, { kind: 'copy-finished', request: first.copyRequest, ok: true })).toBe(second);
    expect(reducePanel(second, { kind: 'copy-finished', request: second.copyRequest, ok: false }).copy.kind).toBe(
      'failed',
    );
  });
  it('reports only the latest send to Claude', () => {
    const first = reducePanel(initialPanelState(), { kind: 'send-started' });
    const second = reducePanel(first, { kind: 'send-started' });
    const stale = reducePanel(second, { kind: 'send-finished', request: first.sendRequest, outcome: { ok: true } });
    expect(stale).toBe(second);
    const failed = reducePanel(second, {
      kind: 'send-finished',
      request: second.sendRequest,
      outcome: { ok: false, reason: 'consent' },
    });
    expect(failed.send).toEqual({ kind: 'failed', reason: 'consent' });
  });
  it('edits one posted comment at a time, apart from the composer', () => {
    const composing = reducePanel(initialPanelState(), { kind: 'input', body: 'draft' });
    const editing = reducePanel(composing, { kind: 'edit-start', id: 'c1', body: 'old' });
    const typed = reducePanel(editing, { kind: 'edit-input', body: '  new  ' });
    expect(typed.editing).toEqual({ id: 'c1', body: '  new  ' });
    expect(typed.body).toBe('draft');
    expect(commentEditSubmission(typed)).toEqual({ id: 'c1', body: 'new' });
    expect(reducePanel(typed, { kind: 'edit-start', id: 'c2', body: 'other' }).editing).toEqual({
      id: 'c2',
      body: 'other',
    });
    expect(reducePanel(typed, { kind: 'edit-cancel' }).editing).toBeNull();
    expect(reducePanel(typed, { kind: 'edited' }).editing).toBeNull();
    expect(reducePanel(typed, { kind: 'submitted' }).editing).toEqual(typed.editing);
  });
  it('has nothing to save while the edit is blank or closed', () => {
    expect(commentEditSubmission(initialPanelState())).toBeNull();
    const blank = reducePanel(reducePanel(initialPanelState(), { kind: 'edit-start', id: 'c1', body: 'old' }), {
      kind: 'edit-input',
      body: '   ',
    });
    expect(commentEditSubmission(blank)).toBeNull();
    expect(reducePanel(initialPanelState(), { kind: 'edit-input', body: 'x' }).editing).toBeNull();
  });
});
