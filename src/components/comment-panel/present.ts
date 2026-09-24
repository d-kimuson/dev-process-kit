import type { Derivation, StaleReason } from '../../core/derive';
import type { Locale } from '../../core/i18n';
import type {
  ActionTone,
  CommentTargetOption,
  Navigation,
  TemplateDefinition,
  ValidationIssue,
} from '../../core/types';
import type { PanelState } from './model';

import { handoffFailureLabel } from '../../core/claude-handoff';
import { commentBody } from '../../core/comment';
import { panelMessages } from './messages';

export type PanelInputs<S> = {
  readonly definition: TemplateDefinition<S>;
  readonly state: S;
  readonly navigation: Navigation;
  readonly derivation: Derivation<S>;
  readonly issues: readonly ValidationIssue[];
  /** The host can hand the review to Claude (inside a Claude Artifact). */
  readonly sendable?: boolean;
  /** The language the panel renders its own text in. */
  readonly locale: Locale;
};

export type PanelItem = {
  readonly id: string;
  readonly title: string;
  readonly targetLabel: string;
  readonly tone: ActionTone;
  readonly text: { readonly kind: 'comment' | 'summary'; readonly body: string };
  readonly code: string;
  readonly stale: StaleReason | null;
};

export type PanelViewModel = {
  readonly body: string;
  readonly target: { readonly ref: string; readonly label: string };
  readonly attachment:
    | { readonly kind: 'explicit' }
    | { readonly kind: 'checkbox'; readonly checked: boolean; readonly group: string }
    | { readonly kind: 'none' };
  readonly canSubmit: boolean;
  readonly items: readonly PanelItem[];
  readonly issues: readonly string[];
  readonly send: 'hidden' | 'disabled' | 'ready';
  readonly flash: string;
};

const labelOf = (option: CommentTargetOption): string =>
  option.group ? `${option.group} · ${option.label}` : option.label;

/** No DOM or callbacks: all domain-dependent presentation ends at this boundary. */
export const presentPanel = <S>(inputs: PanelInputs<S>, ui: PanelState): PanelViewModel => {
  const { definition, state, navigation, derivation } = inputs;
  const m = panelMessages(inputs.locale);
  const current = definition.currentTarget?.(state, navigation) ?? null;
  const attachment = ui.attachment;
  const option =
    attachment.kind === 'explicit'
      ? definition.commentTargets(state, navigation).find((target) => target.value === attachment.ref)
      : null;
  const target =
    attachment.kind === 'explicit'
      ? { ref: attachment.ref, label: option ? labelOf(option) : attachment.ref }
      : attachment.kind === 'current' && current
        ? { ref: current.value, label: labelOf(current) }
        : { ref: `page:${definition.name}`, label: m.wholePage };
  const stale = new Map(derivation.stale.map((entry) => [entry.action.id, entry.reason]));
  return {
    body: ui.body,
    target,
    attachment:
      attachment.kind === 'explicit'
        ? { kind: 'explicit' }
        : current
          ? { kind: 'checkbox', checked: attachment.kind === 'current', group: current.group ?? '' }
          : { kind: 'none' },
    canSubmit: ui.body.trim().length > 0,
    items: derivation.actions.map((action) => {
      const description = definition.describe(action, state, derivation.base);
      const comment = action.type === 'comment';
      return {
        id: action.id,
        title: comment ? m.comment : description.title,
        targetLabel: description.targetLabel,
        tone: comment ? 'comment' : description.tone,
        text: {
          kind: comment ? 'comment' : 'summary',
          body: comment ? commentBody(action) : (description.summary ?? ''),
        },
        code: definition.serialize(action),
        stale: stale.get(action.id) ?? null,
      };
    }),
    issues: inputs.issues.map((issue) => `${issue.path ? `${issue.path}: ` : ''}${issue.message}`),
    send:
      inputs.sendable !== true
        ? 'hidden'
        : derivation.actions.length === 0 || ui.send.kind === 'pending'
          ? 'disabled'
          : 'ready',
    flash:
      ui.send.kind === 'sent'
        ? m.sent
        : ui.send.kind === 'failed'
          ? handoffFailureLabel(ui.send.reason, inputs.locale)
          : ui.copy.kind === 'copied'
            ? m.copied(ui.copy.format === 'json' ? 'JSON' : 'brief')
            : ui.copy.kind === 'failed'
              ? m.copyFailed
              : '',
  };
};
