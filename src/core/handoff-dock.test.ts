// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { initialDockState, presentDock, reduceDock, type DockInputs } from './handoff-dock';
import { coreMessages } from './messages';

const m = coreMessages('en');
const inputs: DockInputs = { actions: 2, railOpen: false, sendable: false, locale: 'en' };

describe('hand-off dock', () => {
  it('shows only while there is a draft and the review rail is closed', () => {
    const ui = initialDockState();
    expect(presentDock(inputs, ui)).not.toBeNull();
    expect(presentDock({ ...inputs, actions: 0 }, ui)).toBeNull();
    expect(presentDock({ ...inputs, railOpen: true }, ui)).toBeNull();
  });

  it('offers the send to Claude only when the host can reach Claude', () => {
    const ui = initialDockState();
    expect(presentDock(inputs, ui)?.send).toBeNull();
    expect(presentDock({ ...inputs, sendable: true }, ui)?.send).toEqual({ label: m.handoffSend, disabled: false });
  });

  it('flashes the latest outcome and ignores late completions', () => {
    const first = reduceDock(initialDockState(), { kind: 'copy-started' });
    const second = reduceDock(first, { kind: 'copy-started' });
    expect(reduceDock(second, { kind: 'copy-finished', request: first.request, ok: true })).toBe(second);
    const copied = reduceDock(second, { kind: 'copy-finished', request: second.request, ok: true });
    expect(presentDock(inputs, copied)?.copy).toEqual({ label: m.handoffCopied, status: 'copied' });
    expect(reduceDock(copied, { kind: 'settled', request: first.request })).toBe(copied);
    expect(reduceDock(copied, { kind: 'settled', request: copied.request }).status).toEqual({ kind: 'idle' });
  });

  it('disables the send while it runs and explains a failure until the next action', () => {
    const sendable = { ...inputs, sendable: true };
    const pending = reduceDock(initialDockState(), { kind: 'send-started' });
    expect(presentDock(sendable, pending)?.send).toEqual({ label: m.handoffSending, disabled: true });
    const failed = reduceDock(pending, {
      kind: 'send-finished',
      request: pending.request,
      outcome: { ok: false, reason: 'too_large' },
    });
    expect(presentDock(sendable, failed)?.note).toBe(m.handoffTooLarge);
    expect(presentDock(sendable, reduceDock(failed, { kind: 'copy-started' }))?.note).toBeNull();
  });
});
