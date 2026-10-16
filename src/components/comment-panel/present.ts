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

import { COMMENT_ACTION } from '../../core/action';
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
  /** The host takes edits of posted comments. */
  readonly editable?: boolean;
  /** Which part of the draft the panel shows; both when left out. */
  readonly section?: PanelSection;
};

/**
 * The draft holds two kinds of request: changes the reader made on the page,
 * and review comments telling the agent what to fix. The panel can show them
 * apart; the hand-off always carries both.
 */
export type PanelSection = 'all' | 'changes' | 'comments';

export type PanelGroup = { readonly kind: 'changes' | 'comments'; readonly items: readonly PanelItem[] };

export type PanelItem = {
  readonly id: string;
  readonly title: string;
  readonly targetLabel: string;
  readonly tone: ActionTone;
  readonly text: { readonly kind: 'comment' | 'summary'; readonly body: string };
  /** The line the agent receives; none for a comment, whose body is the line's substance and is shown already. */
  readonly code: string | null;
  readonly stale: StaleReason | null;
  /** Only a comment can be rewritten; `editing` holds its unsaved text. */
  readonly edit:
    | { readonly kind: 'none' | 'available' }
    | { readonly kind: 'editing'; readonly body: string; readonly canSave: boolean };
};

export type PanelViewModel = {
  readonly body: string;
  readonly target: { readonly ref: string; readonly label: string };
  readonly attachment:
    | { readonly kind: 'explicit' }
    | { readonly kind: 'checkbox'; readonly checked: boolean; readonly group: string }
    | { readonly kind: 'none' };
  readonly canSubmit: boolean;
  readonly section: PanelSection;
  /** Review comments are written here, so the composer goes with them. */
  readonly composer: boolean;
  readonly groups: readonly PanelGroup[];
  /** Hand-off acts on the whole draft, whatever the section shows. */
  readonly hasDraft: boolean;
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
  const section = inputs.section ?? 'all';
  const items = derivation.actions.map((action): PanelItem & { readonly kind: PanelGroup['kind'] } => {
    const description = definition.describe(action, state, derivation.base);
    const comment = action.type === COMMENT_ACTION;
    return {
      kind: comment ? 'comments' : 'changes',
      id: action.id,
      title: comment ? m.comment : description.title,
      targetLabel: description.targetLabel,
      tone: comment ? 'comment' : description.tone,
      text: {
        kind: comment ? 'comment' : 'summary',
        body: comment ? commentBody(action) : (description.summary ?? ''),
      },
      code: comment ? null : definition.serialize(action),
      stale: stale.get(action.id) ?? null,
      edit:
        !comment || inputs.editable !== true
          ? { kind: 'none' }
          : ui.editing?.id === action.id
            ? { kind: 'editing', body: ui.editing.body, canSave: ui.editing.body.trim().length > 0 }
            : { kind: 'available' },
    };
  });
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
    section,
    composer: section !== 'changes',
    groups: (['comments', 'changes'] as const)
      .filter((kind) => section === 'all' || section === kind)
      .map((kind) => ({ kind, items: items.filter((item) => item.kind === kind) })),
    hasDraft: items.length > 0,
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
            ? m.copied
            : ui.copy.kind === 'failed'
              ? m.copyFailed
              : '',
  };
};
