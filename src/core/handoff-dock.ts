/**
 * The floating hand-off beside the closed review rail: once there is a draft,
 * the reader can send or copy it without opening the rail. Pure state and
 * presentation; the shell owns the clipboard, the send and the flash timer.
 */
import type { Locale } from './i18n';

import { handoffFailureLabel, type HandoffFailure, type HandoffOutcome } from './claude-handoff';
import { coreMessages } from './messages';

export type DockStatus =
  | { readonly kind: 'idle' | 'copying' | 'copied' | 'copy-failed' | 'sending' | 'sent' }
  | { readonly kind: 'send-failed'; readonly reason: HandoffFailure };

export type DockState = {
  readonly status: DockStatus;
  /** Identifies the latest copy or send, so a late completion cannot overwrite a newer one. */
  readonly request: number;
};

export type DockEvent =
  | { readonly kind: 'copy-started' | 'send-started' }
  | { readonly kind: 'copy-finished'; readonly request: number; readonly ok: boolean }
  | { readonly kind: 'send-finished'; readonly request: number; readonly outcome: HandoffOutcome }
  /** The flash of a finished request is over. */
  | { readonly kind: 'settled'; readonly request: number };

export const initialDockState = (): DockState => ({ status: { kind: 'idle' }, request: 0 });

export const reduceDock = (state: DockState, event: DockEvent): DockState => {
  switch (event.kind) {
    // One outcome at a time: starting either forgets the other's.
    case 'copy-started':
      return { status: { kind: 'copying' }, request: state.request + 1 };
    case 'send-started':
      return { status: { kind: 'sending' }, request: state.request + 1 };
    case 'copy-finished':
      if (event.request !== state.request || state.status.kind !== 'copying') return state;
      return { ...state, status: { kind: event.ok ? 'copied' : 'copy-failed' } };
    case 'send-finished':
      if (event.request !== state.request || state.status.kind !== 'sending') return state;
      return {
        ...state,
        status: event.outcome.ok ? { kind: 'sent' } : { kind: 'send-failed', reason: event.outcome.reason },
      };
    case 'settled':
      return event.request === state.request ? { ...state, status: { kind: 'idle' } } : state;
  }
};

export type DockInputs = {
  /** Draft actions waiting to be handed off. */
  readonly actions: number;
  readonly railOpen: boolean;
  /** The host can hand the review to Claude (inside a Claude Artifact). */
  readonly sendable: boolean;
  readonly locale: Locale;
};

export type DockViewModel = {
  readonly send: { readonly label: string; readonly disabled: boolean } | null;
  readonly copy: { readonly label: string; readonly status: 'idle' | 'copied' | 'failed' };
  /** Why the send failed and what to do instead; stays until the reader acts again. */
  readonly note: string | null;
};

/** `null` when the dock is not shown: nothing to hand off, or the rail's own buttons are on screen. */
export const presentDock = (inputs: DockInputs, state: DockState): DockViewModel | null => {
  if (inputs.actions === 0 || inputs.railOpen) return null;
  const m = coreMessages(inputs.locale);
  const status = state.status;
  return {
    send: inputs.sendable
      ? {
          label: status.kind === 'sending' ? m.handoffSending : status.kind === 'sent' ? m.handoffSent : m.handoffSend,
          disabled: status.kind === 'sending',
        }
      : null,
    copy:
      status.kind === 'copied'
        ? { label: m.handoffCopied, status: 'copied' }
        : status.kind === 'copy-failed'
          ? { label: m.handoffCopyFailed, status: 'failed' }
          : { label: m.handoffCopy, status: 'idle' },
    note: status.kind === 'send-failed' ? handoffFailureLabel(status.reason, inputs.locale) : null,
  };
};
