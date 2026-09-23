import type { Derivation, StaleReason } from '../../core/derive';
import type {
  ActionTone,
  CommentTargetOption,
  Navigation,
  TemplateDefinition,
  ValidationIssue,
} from '../../core/types';
import type { PanelState } from './model';

import { commentBody } from '../../core/comment';

export type PanelInputs<S> = {
  readonly definition: TemplateDefinition<S>;
  readonly state: S;
  readonly navigation: Navigation;
  readonly derivation: Derivation<S>;
  readonly issues: readonly ValidationIssue[];
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
  readonly flash: string;
};

const labelOf = (option: CommentTargetOption): string =>
  option.group ? `${option.group} · ${option.label}` : option.label;

/** No DOM or callbacks: all domain-dependent presentation ends at this boundary. */
export const presentPanel = <S>(inputs: PanelInputs<S>, ui: PanelState): PanelViewModel => {
  const { definition, state, navigation, derivation } = inputs;
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
        : { ref: `artifact:${definition.name}`, label: 'Artifact 全体' };
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
        title: comment ? 'コメント' : description.title,
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
    flash:
      ui.copy.kind === 'copied'
        ? `copied ${ui.copy.format === 'json' ? 'JSON' : 'brief'} ✓`
        : ui.copy.kind === 'failed'
          ? 'copy failed'
          : '',
  };
};
