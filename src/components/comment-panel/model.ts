import type { HandoffFailure, HandoffOutcome } from '../../core/claude-handoff';

export type Attachment =
  | { readonly kind: 'page' }
  | { readonly kind: 'current' }
  | { readonly kind: 'explicit'; readonly ref: string; readonly resume: 'page' | 'current' };

export type CopyFormat = 'json' | 'brief';
export type CopyStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' | 'copied'; readonly format: CopyFormat }
  | { readonly kind: 'failed' };

export type SendStatus =
  | { readonly kind: 'idle' | 'pending' | 'sent' }
  | { readonly kind: 'failed'; readonly reason: HandoffFailure };

export type PanelState = {
  readonly body: string;
  readonly attachment: Attachment;
  readonly copy: CopyStatus;
  readonly copyRequest: number;
  readonly send: SendStatus;
  readonly sendRequest: number;
};

export type PanelEdit =
  | { readonly kind: 'input'; readonly body: string }
  | { readonly kind: 'attach'; readonly current: boolean }
  | { readonly kind: 'clear-target' };

export type PanelIntent =
  | PanelEdit
  | { readonly kind: 'submit' }
  | { readonly kind: 'delete'; readonly id: string }
  | { readonly kind: 'clear' }
  | { readonly kind: 'copy'; readonly format: CopyFormat }
  | { readonly kind: 'send' };

export type PanelEvent =
  | PanelEdit
  | { readonly kind: 'target-requested'; readonly ref: string }
  | { readonly kind: 'submitted' }
  | { readonly kind: 'copy-started'; readonly format: CopyFormat }
  | { readonly kind: 'copy-finished'; readonly request: number; readonly ok: boolean }
  | { readonly kind: 'send-started' }
  | { readonly kind: 'send-finished'; readonly request: number; readonly outcome: HandoffOutcome };

export const initialPanelState = (): PanelState => ({
  body: '',
  attachment: { kind: 'page' },
  copy: { kind: 'idle' },
  copyRequest: 0,
  send: { kind: 'idle' },
  sendRequest: 0,
});

const clearExplicit = (attachment: Attachment): Attachment =>
  attachment.kind === 'explicit' ? { kind: attachment.resume } : attachment;

export const reducePanel = (state: PanelState, event: PanelEvent): PanelState => {
  switch (event.kind) {
    case 'input':
      return { ...state, body: event.body };
    case 'attach':
      return { ...state, attachment: { kind: event.current ? 'current' : 'page' } };
    case 'clear-target':
      return { ...state, attachment: clearExplicit(state.attachment) };
    case 'target-requested':
      return {
        ...state,
        attachment: {
          kind: 'explicit',
          ref: event.ref,
          resume: state.attachment.kind === 'explicit' ? state.attachment.resume : state.attachment.kind,
        },
      };
    case 'submitted':
      return {
        ...state,
        body: '',
        attachment: clearExplicit(state.attachment),
        copy: { kind: 'idle' },
        copyRequest: state.copyRequest + 1,
        send: { kind: 'idle' },
        sendRequest: state.sendRequest + 1,
      };
    // One flash at a time: starting a copy or a send forgets the other's outcome.
    case 'copy-started':
      return {
        ...state,
        copy: { kind: 'pending', format: event.format },
        copyRequest: state.copyRequest + 1,
        send: { kind: 'idle' },
        sendRequest: state.sendRequest + 1,
      };
    case 'copy-finished':
      if (event.request !== state.copyRequest || state.copy.kind !== 'pending') return state;
      return { ...state, copy: event.ok ? { kind: 'copied', format: state.copy.format } : { kind: 'failed' } };
    case 'send-started':
      return {
        ...state,
        send: { kind: 'pending' },
        sendRequest: state.sendRequest + 1,
        copy: { kind: 'idle' },
        copyRequest: state.copyRequest + 1,
      };
    case 'send-finished':
      if (event.request !== state.sendRequest || state.send.kind !== 'pending') return state;
      return { ...state, send: event.outcome.ok ? { kind: 'sent' } : { kind: 'failed', reason: event.outcome.reason } };
  }
};

export const commentSubmission = (
  state: PanelState,
  target: string,
): { readonly target: string; readonly body: string } | null => {
  const body = state.body.trim();
  return body === '' ? null : { target, body };
};
