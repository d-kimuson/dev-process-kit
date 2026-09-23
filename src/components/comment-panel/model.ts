export type Attachment =
  | { readonly kind: 'artifact' }
  | { readonly kind: 'current' }
  | { readonly kind: 'explicit'; readonly ref: string; readonly resume: 'artifact' | 'current' };

export type CopyFormat = 'json' | 'brief';
export type CopyStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' | 'copied'; readonly format: CopyFormat }
  | { readonly kind: 'failed' };

export type PanelState = {
  readonly body: string;
  readonly attachment: Attachment;
  readonly copy: CopyStatus;
  readonly copyRequest: number;
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
  | { readonly kind: 'copy'; readonly format: CopyFormat };

export type PanelEvent =
  | PanelEdit
  | { readonly kind: 'target-requested'; readonly ref: string }
  | { readonly kind: 'submitted' }
  | { readonly kind: 'copy-started'; readonly format: CopyFormat }
  | { readonly kind: 'copy-finished'; readonly request: number; readonly ok: boolean };

export const initialPanelState = (): PanelState => ({
  body: '',
  attachment: { kind: 'artifact' },
  copy: { kind: 'idle' },
  copyRequest: 0,
});

const clearExplicit = (attachment: Attachment): Attachment =>
  attachment.kind === 'explicit' ? { kind: attachment.resume } : attachment;

export const reducePanel = (state: PanelState, event: PanelEvent): PanelState => {
  switch (event.kind) {
    case 'input':
      return { ...state, body: event.body };
    case 'attach':
      return { ...state, attachment: { kind: event.current ? 'current' : 'artifact' } };
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
      };
    case 'copy-started':
      return { ...state, copy: { kind: 'pending', format: event.format }, copyRequest: state.copyRequest + 1 };
    case 'copy-finished':
      if (event.request !== state.copyRequest || state.copy.kind !== 'pending') return state;
      return { ...state, copy: event.ok ? { kind: 'copied', format: state.copy.format } : { kind: 'failed' } };
  }
};

export const commentSubmission = (
  state: PanelState,
  target: string,
): { readonly target: string; readonly body: string } | null => {
  const body = state.body.trim();
  return body === '' ? null : { target, body };
};
