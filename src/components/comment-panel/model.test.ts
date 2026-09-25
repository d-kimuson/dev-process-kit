// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { initialPanelState, reducePanel, commentSubmission } from './model';

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
});
